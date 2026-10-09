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

        // 呼叫 Gemini，逾時就放棄（不再 SDK 失敗後改打 REST 重試：Gemini 過載時只會讓使用者等兩倍久）。
        // 30 秒 = 正常 1～5 秒的充裕餘裕；前端另有 90 秒總逾時（含 Render 冷啟動）。
        const MODEL = "gemini-3.5-flash-lite";
        const GEMINI_TIMEOUT_MS = 30 * 1000;
        let timer;
        const timeout = new Promise((_, reject) => {
            timer = setTimeout(() => reject(new Error("AI 回應逾時，請再試一次")), GEMINI_TIMEOUT_MS);
        });

        console.log(`正在呼叫模型: ${MODEL}...`);
        const startedAt = Date.now();
        let response;
        try {
            response = await Promise.race([
                ai.models.generateContent({
                    model: MODEL,
                    contents: contents,
                    config: {
                        responseMimeType: "application/json",
                        temperature: 0.1
                    }
                }),
                timeout
            ]);
        } finally {
            clearTimeout(timer);
        }
        console.log(`✨ 模型 ${MODEL} 回應，耗時 ${Date.now() - startedAt} ms`);

        const responseText = response && response.text;
        if (!responseText) {
            throw new Error("Gemini 沒有回傳內容，請稍後再試。");
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
