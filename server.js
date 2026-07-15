require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware 設定
app.use(cors()); // 允許跨域請求 (CORS)
app.use(express.json({ limit: '50mb' })); // 支持接收大容量 Base64 圖片 JSON 內容
app.use(express.static(__dirname)); // 提供靜態檔案服務 (訪問 http://localhost:3000 即可看到 index.html)

// 嚴格封閉式分類 AI System Prompt
const SYSTEM_PROMPT = `你現在是「DiuLa! 智能失物招領系統」的核心 AI 辨識引擎。
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

// API 端點：接收圖片與文字描述並透過 Gemini API 辨識
app.post('/api/analyze-item', async (req, res) => {
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey || apiKey.trim() === '') {
            console.error("❌ 錯誤：本地後端未於 .env 檔案設定 GEMINI_API_KEY");
            return res.status(500).json({ error: "伺服器未設定有效的 GEMINI_API_KEY，請檢查 .env 檔案。" });
        }

        const { text, base64Image } = req.body;
        if (!text && !base64Image) {
            return res.status(400).json({ error: "請至少提供文字描述或物品圖片。" });
        }

        console.log(`收到 AI 辨識請求 | 文字描述: ${text ? `"${text.substring(0, 30)}..."` : '無'} | 是否附圖片: ${base64Image ? '是' : '否'}`);

        const ai = new GoogleGenAI({ apiKey });

        const contents = [
            {
                role: 'user',
                parts: [{ text: SYSTEM_PROMPT + `\n\n使用者輸入的物品描述/特徵：${text || '無（請以圖片辨識為主）'}` }]
            }
        ];

        if (base64Image) {
            const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, "");
            contents[0].parts.push({
                inlineData: { mimeType: "image/jpeg", data: cleanBase64 }
            });
        }

        // 1. 動態查詢當前 API Key 支援的 ModelService 清單 (避免 404 模型找不到的問題)
        let targetModels = ["gemini-1.5-flash-002", "gemini-2.0-flash", "gemini-1.5-flash"];
        try {
            const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
            if (listRes.ok) {
                const listData = await listRes.json();
                if (listData.models && Array.isArray(listData.models)) {
                    const availableNames = listData.models
                        .filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent"))
                        .map(m => m.name.replace("models/", ""));
                    
                    console.log("📋 當前 API Key 可用的模型列表：", availableNames);
                    if (availableNames.length > 0) {
                        targetModels = availableNames.sort((a, b) => {
                            const scoreA = (a.includes("flash-002") ? 10 : 0) + (a.includes("2.0-flash") ? 9 : 0) + (a.includes("flash") ? 5 : 0) - (a.includes("8b") ? 2 : 0);
                            const scoreB = (b.includes("flash-002") ? 10 : 0) + (b.includes("2.0-flash") ? 9 : 0) + (b.includes("flash") ? 5 : 0) - (b.includes("8b") ? 2 : 0);
                            return scoreB - scoreA;
                        });
                    }
                }
            }
        } catch (listErr) {
            console.warn("⚠️ 查詢 API Key 模型清單失敗，將採用預設備選模型:", listErr.message);
        }

        // 2. 嘗試呼叫目標模型 (先試 @google/genai SDK，若發生 404/錯誤則自動降級嘗試 REST API)
        let responseText = null;
        let lastError = null;

        for (const modelName of targetModels) {
            try {
                console.log(`正在嘗試使用 SDK 呼叫模型: ${modelName}...`);
                const response = await ai.models.generateContent({
                    model: modelName,
                    contents: contents,
                    config: {
                        responseMimeType: "application/json",
                        temperature: 0.1
                    }
                });
                if (response && response.text) {
                    responseText = response.text;
                    console.log(`✨ 模型 ${modelName} 呼叫成功 (SDK)！`);
                    break;
                }
            } catch (err) {
                console.warn(`SDK 呼叫 ${modelName} 失敗:`, err.message);
                lastError = err;

                // 嘗試直接改發 REST API 以確保最廣泛的相容性
                try {
                    console.log(`嘗試改以直接 REST API 呼叫模型: ${modelName}...`);
                    const restParts = [
                        { "text": SYSTEM_PROMPT + `\n\n使用者輸入的物品描述/特徵：${text || '無（請以圖片辨識為主）'}` }
                    ];
                    if (base64Image) {
                        const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, "");
                        restParts.push({
                            "inline_data": { "mime_type": "image/jpeg", "data": cleanBase64 }
                        });
                    }
                    const restRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            "contents": [{ "parts": restParts }],
                            "generationConfig": { "responseMimeType": "application/json", "temperature": 0.1 }
                        })
                    });
                    if (restRes.ok) {
                        const restData = await restRes.json();
                        if (restData.candidates && restData.candidates[0]?.content?.parts[0]?.text) {
                            responseText = restData.candidates[0].content.parts[0].text;
                            console.log(`✨ 模型 ${modelName} 呼叫成功 (REST API)！`);
                            break;
                        }
                    } else {
                        const errJson = await restRes.json().catch(() => ({}));
                        console.warn(`REST API 呼叫 ${modelName} 也失敗 (${restRes.status}):`, errJson.error?.message);
                    }
                } catch (restErr) {
                    console.warn(`REST 呼叫例外:`, restErr.message);
                }
            }
        }

        if (!responseText) {
            throw new Error(lastError ? lastError.message : "所有可用的 Gemini 模型皆無法回應，請檢查 API Key 是否正確或擁有足夠額度。");
        }

        // 清理可能包含的 Markdown 或前後空白
        const cleanedJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsedResult = JSON.parse(cleanedJson);

        console.log("✅ AI 判斷成功結果:", JSON.stringify(parsedResult));
        return res.json(parsedResult);
    } catch (error) {
        console.error("❌ Gemini API 處理錯誤:", error);
        return res.status(500).json({ error: error.message || "AI 服務暫時發生錯誤，請稍後再試。" });
    }
});

app.listen(PORT, () => {
    console.log(`\n🚀 DiuLa! 後端伺服器已啟動！`);
    console.log(`🌐 網頁訪問網址: http://localhost:${PORT}`);
    console.log(`🔌 API 端點網址: http://localhost:${PORT}/api/analyze-item\n`);
});
