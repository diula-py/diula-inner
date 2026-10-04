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

// 嚴格封閉式分類 AI System Prompt（與 Cloud Function 共用，標籤清單在 functions/tags.json）
const { SYSTEM_PROMPT } = require('./functions/aiPrompt');

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

        // 1. 統一設定目標模型為最新版的 gemini-3.5-flash-lite
        let targetModels = ["gemini-3.5-flash-lite"];

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
