"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || "");

export async function analyzeFlightScreenshot(base64Image: string) {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `この画像は航空券の予約確認画面のスクリーンショットです。
以下の情報をJSON形式で抽出してください。値が見つからない場合は空文字列にしてください。
日付時間のフォーマットは YYYY-MM-DDTHH:mm にしてください（年が不明な場合は2025年としてください）。

{
  "airline": "航空会社名",
  "flightNumber": "便名",
  "departureAirport": "出発空港名または3レターコード",
  "arrivalAirport": "到着空港名または3レターコード",
  "departureTime": "出発日時",
  "arrivalTime": "到着日時",
  "confirmationNumber": "予約番号/確認番号",
  "title": "フライト名（航空会社+便名などの簡潔なもの）"
}

出力はJSONのみにしてください。テキストの装飾（markdownのバックティックスなど）は不要です。`;

    try {
        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    data: base64Image.split(",")[1], // base64の中身だけ抽出
                    mimeType: "image/png", // とりあえずpngとして扱う（実際はアップロード時に合わせるのが理想）
                },
            },
        ]);

        const response = result.response.text();
        // JSON以外のテキストが含まれている可能性を考慮してクリーニング
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("Could not parse JSON from response");

        return JSON.parse(jsonMatch[0]);
    } catch (error) {
        console.error("Analysis error:", error);
        throw new Error("画像の解析に失敗しました");
    }
}
