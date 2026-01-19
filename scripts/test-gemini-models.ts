import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";

async function listModels() {
    let apiKey = "";
    try {
        const envContent = fs.readFileSync(".env.local", "utf8");
        const match = envContent.match(/GOOGLE_GENERATIVE_AI_API_KEY=(.*)/);
        if (match) apiKey = match[1].trim();
    } catch (e) {
        console.error("Failed to read .env.local");
        return;
    }

    if (!apiKey) {
        console.error("API KEY not found in .env.local");
        return;
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    console.log("Testing common model names...");
    const models = [
        "gemini-2.0-flash",
        "gemini-2.0-flash-lite",
        "gemini-2.5-flash",
        "gemini-2.5-flash-lite"
    ];

    for (const m of models) {
        try {
            const model = genAI.getGenerativeModel({ model: m });
            const result = await model.generateContent("Hi");
            console.log(`✅ ${m}: Success!`);
        } catch (e: any) {
            console.log(`❌ ${m}: Failed - ${e.message}`);
        }
    }
}

listModels();
