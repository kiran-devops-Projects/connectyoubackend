const { GoogleGenerativeAI } = require("@google/generative-ai");

const generationConfig = {
    temperature: 0.9,
    topP: 0.95,
    topK: 64,
    maxOutputTokens: 8192,
};

const safetySettings = [
    {
        category: "HARM_CATEGORY_HARASSMENT",
        threshold: "BLOCK_MEDIUM_AND_ABOVE",
    },
    {
        category: "HARM_CATEGORY_HATE_SPEECH",
        threshold: "BLOCK_MEDIUM_AND_ABOVE",
    },
    {
        category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
        threshold: "BLOCK_MEDIUM_AND_ABOVE",
    },
    {
        category: "HARM_CATEGORY_DANGEROUS_CONTENT",
        threshold: "BLOCK_MEDIUM_AND_ABOVE",
    },
];

async function generateAIResponse(prompt) {
    try {
        if (!process.env.GEMINI_API_KEY) {
            throw new Error("GEMINI_API_KEY is not configured");
        }

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-flash",
            generationConfig,
            safetySettings,
        });

        console.log("🔹 Initializing chat session...");
        const chat = model.startChat();
        
        console.log("🔹 Sending prompt to Gemini...");
        const result = await chat.sendMessage(prompt);
        
        if (!result.response) {
            throw new Error("Invalid response from Gemini AI");
        }

        const response = result.response.text();
        
        if (!response) {
            throw new Error("Empty response from Gemini AI");
        }

        console.log("✅ Gemini response received successfully");
        return response;
    } catch (error) {
        console.error("❌ Gemini AI Error:", error);
        throw new Error(`Gemini AI Error: ${error.message}`);
    }
}

module.exports = { generateAIResponse };
