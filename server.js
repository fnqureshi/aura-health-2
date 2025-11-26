const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());

// Initialize Gemini
// We check for the key inside the route to prevent crash on startup if key is missing
const getGeminiModel = () => {
    const API_KEY = process.env.GOOGLE_API_KEY;
    if (!API_KEY) throw new Error("GOOGLE_API_KEY is missing");
    const genAI = new GoogleGenerativeAI(API_KEY);
    return genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
};

// --- Page Routing ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'landing.html')));
app.get('/app', (req, res) => res.sendFile(path.join(__dirname, 'public', 'app.html')));

// --- API Endpoints ---

// Endpoint for Clerk Key
app.get('/api/clerk-key', (req, res) => {
    const key = process.env.CLERK_PUBLISHABLE_KEY;
    if (key) res.json({ key });
    else res.status(500).json({ error: 'Clerk key missing' });
});

// NEW: Chat Endpoint
app.post('/api/chat', async (req, res) => {
    try {
        const { message, history, context } = req.body;
        const model = getGeminiModel();

        // The System Prompt: This defines the AI's persona
        const systemPrompt = `
        You are the Aura Scribe, an expert medical advocate specializing in Endometriosis.
        Your Goal: Help patients document their symptoms in clinical language to prevent medical dismissal.
        
        Context provided by user logs: ${context || "No logs provided yet."}

        Guidelines:
        1. Validate the user's pain. Never dismiss it.
        2. Use clinical terminology (e.g., instead of "bad cramps", use "severe dysmenorrhea").
        3. If asked for a report, structure it with: "Chief Complaint", "History of Present Illness", "Symptom Frequency", and "Impact on Daily Life".
        4. Keep responses concise and actionable.
        `;

        const chat = model.startChat({
            history: history || [], // Maintain conversation history
            generationConfig: {
                maxOutputTokens: 1000,
            },
        });

        // Send the system prompt + user message
        const result = await chat.sendMessage(`${systemPrompt}\n\nUser: ${message}`);
        const response = await result.response;
        const text = response.text();

        res.json({ response: text });

    } catch (error) {
        console.error("Gemini Error:", error);
        res.status(500).json({ error: "Failed to generate response" });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
