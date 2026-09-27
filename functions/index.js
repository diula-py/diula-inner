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

    const systemPrompt = `你現在是「DiuLa! 智能失物招領系統」的核心 AI 辨識引擎。
你的唯一任務是：分析使用者輸入的「遺失物文字描述」或「遺失物照片」，並嚴格依照下方的【專屬標籤資料庫】與【專屬顏色資料庫】，將該物品進行精準歸類。

⚠️ 嚴格規定：
1. 絕對禁止發明、捏造任何不在資料庫內的分類標籤或顏色！你是一套封閉式歸類系統。
2. 只能從下列清單中挑選最符合的「主分類」、「子標籤」與「顏色」。
3. 若圖片中有複數物品，請分別列出。一個物品可以有多個顏色。若無法判斷顏色，顏色陣列請留空 []。
4. 必須嚴格遵循純 JSON 格式輸出，絕對不要輸出任何 Markdown 標記（如 \`\`\`json）、說明文字或其他廢話！

【專屬標籤資料庫】：
- 顏色：黑色、白色、灰色、紅色、橙色、黃色、綠色、藍色、紫色、粉色、棕色、米色、金色、銀色、透明、彩色
- 現金：台幣、外幣
- 有價證券：支票、本票、匯票、股權證券、債權證券、認購（售）權證、存托憑證、國庫券、債券
- 紙本票券：車票、演唱會門票、統一發票
- 錢包與包袋：皮夾/錢包、卡夾、卡套、隨身包/背包、行李箱/行李袋、塑膠袋、紙袋
- 證件：身分證、健保卡、學生證、護照、存摺、印章、駕照、行照、居留證、自然人憑證、執照、證書
- 實體卡：悠遊卡/一卡通/icash、信用卡/金融卡/簽帳卡、儲值卡、會員卡、電話卡、門禁卡
- 電子產品：手機、耳機、智慧型手錶/手環、筆記型電腦、平板電腦、相機、行動電源、隨身碟、記憶卡、硬碟、電池、充電器/充電線、隨身聽
- 衣物/佩戴物品：上衣、下著、帽子、鞋子、襪子、手套、圍巾/絲巾、眼鏡、手錶、首飾、安全帽、皮帶、其他穿搭物品
- 鑰匙：鑰匙、遙控器
- 雨具：折傘、長傘、雨衣
- 日常用品：杯/瓶/壺類、玩具、玩偶、便當盒
- 文件與文具：文件袋、文件、書本、雜誌、記事本、電話本、文具
- 其他：包裹、紙箱、便當盒、食品、寵物用品、家電、其他

【輸出格式範例】：
{
  "items": [
    {
      "main_category": "錢包與包袋",
      "sub_tag": "皮夾/錢包",
      "colors": ["黑色", "銀色"]
    }
  ]
}`;

    try {
        const contents = [
            {
                role: 'user',
                parts: [{ text: systemPrompt + `\n\n使用者輸入的物品描述/特徵：${text || '無（請以圖片辨識為主）'}` }]
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
            model: "gemini-3.1-flash-lite",
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
