const { generateAIResponse } = require("../utils/geminiAI");

exports.getAIResponse = async (req, res) => {
    try {
        const { message, context } = req.body;
        
        if (!message) {
            return res.status(400).json({ error: "Message is required" });
        }

        if (!process.env.GEMINI_API_KEY) {
            throw new Error("GEMINI_API_KEY is not configured");
        }

        console.log("🔹 AI Request:", message);
        console.log("🔹 Context:", context);

        let contextPrompt = "";
        if (context && context.length > 0) {
            contextPrompt = context
                .map(msg => `${msg.role === 'user' ? 'Human' : 'Assistant'}: ${msg.content}`)
                .join('\n') + '\n';
        }

        const fullPrompt = `${contextPrompt}Human: ${message}\nAssistant:`;
        const response = await generateAIResponse(fullPrompt);

        if (!response) {
            throw new Error("No response received from AI service");
        }

        console.log("✅ AI Response Received");
        res.json({ message: response });
    } catch (error) {
        console.error("❌ AI Controller Error:", error);
        res.status(500).json({ 
            error: "AI service failed", 
            details: error.message 
        });
    }
};
