/**
 * DiuLa! 智能失物招領系統 - 後端 Cloud Functions (Firebase V2)
 * 負責安全的 Gemini AI 圖片與文字分類辨識，保護 API Key 不外流
 */

const { setGlobalOptions } = require("firebase-functions/v2");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { GoogleGenAI } = require("@google/genai");
const { SYSTEM_PROMPT } = require("./aiPrompt");

setGlobalOptions({ maxInstances: 10, region: "asia-east1" }); // 設定在東京/亞洲區，對台灣連線最快

initializeApp();

exports.analyzeItem = onCall({ secrets: ["GEMINI_API_KEY"], cors: true }, async (request) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("錯誤：GEMINI_API_KEY 尚未設定在 Firebase Secrets 中");
        throw new HttpsError("internal", "後端 AI 密鑰未設定");
    }

    const { text, base64Image } = request.data || {};
    if (!text && !base64Image) {
        throw new HttpsError("invalid-argument", "請提供文字描述或圖片");
    }

    const ai = new GoogleGenAI({ apiKey: apiKey });


    try {
        const contents = [
            {
                role: 'user',
                parts: [{ text: SYSTEM_PROMPT + `\n\n使用者輸入的物品描述/特徵：${text || '無（請以圖片辨識為主）'}` }]
            }
        ];

        // 如果有傳入圖片 Base64，加入多模態判斷
        if (base64Image) {
            const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, "");
            contents[0].parts.push({
                inlineData: { mimeType: "image/jpeg", data: cleanBase64 }
            });
        }

        const response = await ai.models.generateContent({
            model: "gemini-3.5-flash-lite",
            contents: contents,
            config: {
                responseMimeType: "application/json",
                temperature: 0.1
            }
        });

        const jsonText = response.text;
        const parsedResult = JSON.parse(jsonText);
        console.log("AI 判斷成功結果：", parsedResult);
        return parsedResult;
    } catch (error) {
        console.error("Gemini AI 辨識發生錯誤：", error);
        throw new HttpsError("internal", "AI 辨識服務暫時無法回應：" + error.message);
    }
});

const AUTO_PUSH_DAYS = 5;
const FLASK_BASE = "https://diula.onrender.com";

// 停掉 outter 在 Flask 建立的推播訂閱（跟 outter「已找到」同一支 API）
async function stopSubscription(subId) {
    const res = await fetch(`${FLASK_BASE}/subscriptions/found`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: subId }),
        signal: AbortSignal.timeout(60000), // Render 冷啟動可能要數十秒
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

// 每小時檢查一次：自動推播滿五天的遺失物改為「結束自動推播」
exports.expireAutoPush = onSchedule({ schedule: "every 1 hours", timeZone: "Asia/Taipei", timeoutSeconds: 300 }, async () => {
    const db = getFirestore();
    const cutoff = Date.now() - AUTO_PUSH_DAYS * 24 * 60 * 60 * 1000;

    // 只用單一欄位查詢，避免需要建立複合索引，時間判斷在程式內處理
    const snap = await db.collection("lost_items").where("status", "==", "自動推播中").get();

    let expired = 0, backfilled = 0, failed = 0;
    for (const docSnap of snap.docs) {
        const startedAt = docSnap.get("autoPushStartedAt");
        if (!startedAt) {
            // 舊資料沒有開始時間，從現在開始計算五天
            await docSnap.ref.update({ autoPushStartedAt: FieldValue.serverTimestamp() });
            backfilled++;
            continue;
        }
        if (startedAt.toMillis() > cutoff) continue;

        const subId = docSnap.get("sub_id");
        if (subId) {
            try {
                await stopSubscription(subId);
            } catch (e) {
                // 訂閱沒停成功就先不改狀態，下個小時再試，避免顯示已結束卻還在推播
                console.error(`停止訂閱 ${subId}（${docSnap.id}）失敗：`, e.message);
                failed++;
                continue;
            }
        }
        await docSnap.ref.update({ status: "結束自動推播", autoPushEndedAt: FieldValue.serverTimestamp() });
        expired++;
    }

    console.log(`自動推播檢查完成：結束 ${expired} 筆、補上開始時間 ${backfilled} 筆、停訂閱失敗 ${failed} 筆`);
});
