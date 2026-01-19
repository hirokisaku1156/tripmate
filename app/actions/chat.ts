"use server";

import { GoogleGenerativeAI, Part } from "@google/generative-ai";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || "");

export async function sendMessage(tripId: string, message: string, context: any, isPrivate: boolean = false) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("Unauthorized");

    // 1. ユーザーのメッセージを保存
    await supabase.from("chat_messages").insert({
        trip_id: tripId,
        user_id: user.id,
        role: "user",
        content: message,
        is_private: isPrivate,
    });

    // 2. 過去の履歴を取得（自分が閲覧可能なもののみ）
    const { data: history } = await supabase
        .from("chat_messages")
        .select("role, content, user_id, is_private")
        .eq("trip_id", tripId)
        .order("created_at", { ascending: true });

    // 3. Geminiで回答生成 (安定版 1.5 Flash を使用)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const systemPrompt = `あなたは旅行アシスタントです。ユーザーの旅行をサポートしてください。
現在の旅行情報:
- 旅行名: ${context.tripName}
- 目的地: ${context.destinations?.join(", ") || "未定"}
- 日程: ${context.startDate} 〜 ${context.endDate}
- メンバー: ${context.memberCount}人

登録済みの旅程:
${JSON.stringify(context.itineraryItems, null, 2)}

行きたい場所リスト:
${JSON.stringify(context.places, null, 2)}

これらの情報を踏まえて、具体的で実用的なアドバイスをしてください。返信は簡潔かつ親しみやすい敬語で行ってください。`;

    const chat = model.startChat({
        history: history?.map(m => ({
            role: m.role === "user" ? "user" : "model",
            parts: [{ text: m.content }],
        })) || [],
    });

    const result = await chat.sendMessage([{ text: systemPrompt }, { text: message }]);
    const response = result.response.text();

    // 4. AIの回答を保存 (ユーザーの設定に合わせる)
    await supabase.from("chat_messages").insert({
        trip_id: tripId,
        user_id: user.id,
        role: "assistant",
        content: response,
        is_private: isPrivate,
    });

    revalidatePath(`/trips/${tripId}`);
    return response;
}
