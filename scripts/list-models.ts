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
    try {
        console.log("Listing available models...");
        // This might not work on all SDK versions, but let's try calling the direct endpoint
        const response = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`);
        const data = await response.json();

        if (data.models) {
            data.models.forEach((m: any) => {
                console.log(`- ${m.name} (${m.displayName}) - Methods: ${m.supportedGenerationMethods.join(", ")}`);
            });
        } else {
            console.log("No models found or error:", data);
        }
    } catch (error) {
        console.error("Error:", error);
    }
}

listModels();
