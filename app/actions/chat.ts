"use server";

import { GoogleGenerativeAI, Part } from "@google/generative-ai";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || "");

export async function createChatSession(tripId: string, title: string = "新しいトーク", isPrivate: boolean = false) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("Unauthorized");

    const { data, error } = await supabase
        .from("chat_sessions")
        .insert({
            trip_id: tripId,
            created_by: user.id,
            title,
            is_private: isPrivate,
        })
        .select()
        .single();

    if (error) throw error;
    revalidatePath(`/trips/${tripId}`);
    return data;
}

export async function getChatSessions(tripId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("chat_sessions")
        .select("*")
        .eq("trip_id", tripId)
        .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
}

export async function updateChatSession(sessionId: string, updates: { title?: string, is_private?: boolean }) {
    const supabase = await createClient();
    const { error } = await supabase
        .from("chat_sessions")
        .update(updates)
        .eq("id", sessionId);

    if (error) throw error;
    revalidatePath("/trips", "layout");
}

export async function deleteChatSession(tripId: string, sessionId: string) {
    const supabase = await createClient();
    const { error } = await supabase
        .from("chat_sessions")
        .delete()
        .eq("id", sessionId);

    if (error) throw error;
    revalidatePath(`/trips/${tripId}`);
}

export async function sendMessage(tripId: string, sessionId: string, message: string, context: any) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("Unauthorized");

    // セッション情報の取得
    const { data: session } = await supabase
        .from("chat_sessions")
        .select("is_private")
        .eq("id", sessionId)
        .single();

    if (!session) throw new Error("Session not found");

    // 1. ユーザーのメッセージを保存
    await supabase.from("chat_messages").insert({
        session_id: sessionId,
        trip_id: tripId,
        user_id: user.id,
        role: "user",
        content: message,
    });

    // 2. セッションの全履歴を取得
    const { data: history } = await supabase
        .from("chat_messages")
        .select("role, content")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });

    // ツール定義
    const tools = [
        {
            functionDeclarations: [
                {
                    name: "add_itinerary_item",
                    description: "旅程に新しい予定（フライト、宿泊、観光、食事など）を追加します",
                    parameters: {
                        type: "object",
                        properties: {
                            title: { type: "string", description: "予定のタイトル（例：羽田空港へ移動、ランチ）" },
                            date: { type: "string", description: "日付（YYYY-MM-DD形式）" },
                            startTime: { type: "string", description: "開始時間（HH:MM形式、不明な場合は省略可）" },
                            endTime: { type: "string", description: "終了時間（HH:MM形式、不明な場合は省略可）" },
                            location: { type: "string", description: "場所・住所" },
                            description: { type: "string", description: "内容やメモ" },
                            type: { type: "string", description: "種類（flight, hotel, activity, restaurant, other）。カフェやレストランは restaurant、観光地は activity とすること。" },
                            price: { type: "number", description: "金額（日本円。不明な場合や無料の場合は省略可）" },
                            paidBy: { type: "string", description: "支払ったメンバーの名前またはID（価格がある場合のみ）" },
                            startTimezone: { type: "string", description: "開始時間のタイムゾーンオフセット（例：+09:00, -07:00）。場所に応じて推測。日本は+09:00。" },
                            endTimezone: { type: "string", description: "終了時間のタイムゾーンオフセット（例：+09:00, -07:00）。フライト到着地など場所に応じて推測。" }
                        },
                        required: ["title", "date"]
                    }
                },
                {
                    name: "add_expense",
                    description: "新しい支払い（費用）を登録します",
                    parameters: {
                        type: "object",
                        properties: {
                            amount: { type: "number", description: "金額（日本円）" },
                            description: { type: "string", description: "支払いの内容（例：お土産代、ランチ）" },
                            category: { type: "string", description: "カテゴリ（food, transport, accommodation, activity, shopping, other）" },
                            date: { type: "string", description: "日付（YYYY-MM-DD形式）" },
                            paidBy: { type: "string", description: "支払ったメンバーの名前またはID" }
                        },
                        required: ["amount", "description", "date"]
                    }
                },
                {
                    name: "update_itinerary_item",
                    description: "既存の旅程項目を修正します。IDが必要です。",
                    parameters: {
                        type: "object",
                        properties: {
                            id: { type: "string", description: "修正する旅程項目のID" },
                            title: { type: "string" },
                            date: { type: "string" },
                            startTime: { type: "string" },
                            endTime: { type: "string" },
                            location: { type: "string" },
                            description: { type: "string" },
                            type: { type: "string", enum: ["activity", "restaurant", "transport", "hotel", "other"] },
                            startTimezone: { type: "string", description: "開始時間のタイムゾーンオフセット" },
                            endTimezone: { type: "string", description: "終了時間のタイムゾーンオフセット" }
                        },
                        required: ["id"]
                    }
                },
                {
                    name: "delete_itinerary_item",
                    description: "旅程項目を削除します。",
                    parameters: {
                        type: "object",
                        properties: {
                            id: { type: "string", description: "削除する旅程項目のID" }
                        },
                        required: ["id"]
                    }
                },
                {
                    name: "add_place",
                    description: "「行きたい場所リスト」に新しい場所を追加します。",
                    parameters: {
                        type: "object",
                        properties: {
                            name: { type: "string", description: "場所の名前" },
                            address: { type: "string", description: "住所や場所の目印" },
                            description: { type: "string", description: "メモや理由" }
                        },
                        required: ["name"]
                    }
                },
                {
                    name: "delete_place",
                    description: "「行きたい場所リスト」から場所を削除します。",
                    parameters: {
                        type: "object",
                        properties: {
                            id: { type: "string", description: "削除する場所のID" }
                        },
                        required: ["id"]
                    }
                }
            ]
        }
    ];

    const systemPrompt = `あなたは旅行アシスタントです。ユーザーの旅行をサポートしてください。
現在の旅行情報:
- 旅行名: ${context.tripName}
- 目的地: ${context.destinations?.join(", ") || "未定"}
- 日程: ${context.startDate} 〜 ${context.endDate}
- メンバー: ${context.memberCount}人
- 現在の日時: ${new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}

登録済みの旅程:
${JSON.stringify(context.itineraryItems, null, 2)}

行きたい場所リスト:
${JSON.stringify(context.places, null, 2)}

【重要】日付の解釈ルール:
- ユーザーが「18日」のように日のみを指定した場合、それは旅行期間（${context.startDate} 〜 ${context.endDate}）に含まれる日付として解釈してください。
- 旅行期間が複数の月にまたがる場合、文脈から最適な日付を特定してください。
- 曜日で指定された場合も、旅行期間内の該当する曜日を特定してください。

【重要】項目の種類（type）の選択ルール:
- ユーザーが明示的に種類を指定しない場合、タイトルや文脈から最も適切な種類を推論して設定してください。
- カフェ、レストラン、飲み会などは "restaurant" （UI上の表示は「レストラン」ですが食事全般を含みます）
- 観光、遊び、体験などは "activity"
- ホテル、宿泊などは "hotel"
- 移動（タクシー、電車、バス、フライト以外）は "other" （メモに交通手段を記載してください）
- それ以外は "other"

【重要】タイムゾーンの扱い:
- フライトの場合、「出発時間」は「出発地」のタイムゾーン、「到着時間」は「到着地」のタイムゾーンになります。それぞれ個別に指定してください。
- \`startTimezone\`, \`endTimezone\` パラメータには、それぞれのオフセット（例: \`+09:00\`, \`-07:00\`）を指定してください。
- 日本国内: \`+09:00\`
- サンフランシスコ/ロサンゼルス: \`-07:00\` (PDT) または \`-08:00\` (PST) - 時期によって判断
- ハワイ: \`-10:00\`
- その他: 目的地に応じて適切なオフセットを推定してください。不明な場合は \`+09:00\` としてください。

あなたはユーザーの代わりに旅程や場所を「追加」「修正」「削除」することができます。
ユーザーから依頼があれば、適切なツール（Function Calling）を呼び出してください。
実行後は、何を行ったかをユーザーに報告してください。返信は簡潔かつ親しみやすい敬語で行ってください。`;

    // 3. Geminiで回答生成
    let result;
    let chat;
    try {
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash",
            systemInstruction: systemPrompt,
            tools: tools as any,
        });

        chat = model.startChat({
            history: (history || []).slice(0, -1).map(m => ({
                role: m.role === "user" ? "user" : "model",
                parts: [{ text: m.content }],
            })),
        });

        result = await chat.sendMessage(message);
    } catch (error) {
        console.error("Gemini API error:", error);
        return {
            success: false,
            error: "AIモデルが混み合っています。しばらく待ってからもう一度お試しください。(503 Service Unavailable)"
        };
    }

    let finalResponse = "";

    try {
        const response = result.response;
        const call = response.candidates?.[0]?.content?.parts?.find(p => p.functionCall);

        if (call && call.functionCall) {
            const { name, args } = call.functionCall;

            // Tool arguments interface and validation
            interface ToolArgs {
                id?: string;
                title?: string;
                date?: string;
                startTime?: string;
                endTime?: string;
                startTimezone?: string;
                endTimezone?: string;
                location?: string;
                description?: string;
                type?: string;
                price?: number;
                amount?: number;
                category?: string;
                name?: string;
                address?: string;
            }

            const toolArgs: ToolArgs = (args || {}) as ToolArgs;

            // Basic validation for common fields
            const validateString = (val: unknown, maxLen: number): string | undefined => {
                if (val === undefined || val === null) return undefined;
                const str = String(val).trim();
                return str.length > maxLen ? str.substring(0, maxLen) : str;
            };

            const validateNumber = (val: unknown): number | undefined => {
                if (val === undefined || val === null) return undefined;
                const num = Number(val);
                return isNaN(num) ? undefined : Math.max(0, Math.floor(num));
            };

            // Sanitize inputs
            const sanitizedArgs = {
                id: validateString(toolArgs.id, 100),
                title: validateString(toolArgs.title, 200),
                date: validateString(toolArgs.date, 20),
                startTime: validateString(toolArgs.startTime, 10),
                endTime: validateString(toolArgs.endTime, 10),
                startTimezone: validateString(toolArgs.startTimezone, 10),
                endTimezone: validateString(toolArgs.endTimezone, 10),
                location: validateString(toolArgs.location, 500),
                description: validateString(toolArgs.description, 2000),
                type: validateString(toolArgs.type, 50),
                price: validateNumber(toolArgs.price),
                amount: validateNumber(toolArgs.amount),
                category: validateString(toolArgs.category, 50),
                name: validateString(toolArgs.name, 200),
                address: validateString(toolArgs.address, 500),
            };

            console.log(`AI Calling Tool: ${name}`, sanitizedArgs);

            let toolResult = { success: true, message: "" };

            try {
                // 日本時間のオフセット (デフォルト)
                const DEFAULT_OFFSET = "+09:00";

                if (name === "add_itinerary_item") {
                    // デフォルト
                    const startTz = sanitizedArgs.startTimezone || DEFAULT_OFFSET;
                    const endTz = sanitizedArgs.endTimezone || startTz || DEFAULT_OFFSET;

                    const startTime = sanitizedArgs.startTime ? `${sanitizedArgs.date}T${sanitizedArgs.startTime}:00${startTz}` : null;
                    const endTime = sanitizedArgs.endTime ? `${sanitizedArgs.date}T${sanitizedArgs.endTime}:00${endTz}` : null;

                    const { data: item, error } = await supabase.from("itinerary_items").insert({
                        trip_id: tripId,
                        title: sanitizedArgs.title,
                        date: sanitizedArgs.date,
                        start_time: startTime,
                        end_time: endTime,
                        start_timezone: startTz,
                        end_timezone: endTz,
                        location: sanitizedArgs.location,
                        description: sanitizedArgs.description,
                        type: sanitizedArgs.type || "activity",
                        is_ai_generated: true
                    }).select().single();

                    if (error) throw error;

                    // 価格が指定されている場合、費用も登録
                    if (sanitizedArgs.price && sanitizedArgs.price > 0) {
                        await supabase.from("expenses").insert({
                            trip_id: tripId,
                            title: sanitizedArgs.title,
                            amount: sanitizedArgs.price,
                            currency: "JPY",
                            amount_jpy: sanitizedArgs.price,
                            category: sanitizedArgs.type || "other",
                            description: null,
                            date: sanitizedArgs.date,
                            is_ai_generated: true
                        });
                    }
                } else if (name === "add_expense") {
                    const { error } = await supabase.from("expenses").insert({
                        trip_id: tripId,
                        title: sanitizedArgs.title || sanitizedArgs.description,
                        amount: sanitizedArgs.amount,
                        currency: "JPY",
                        amount_jpy: sanitizedArgs.amount,
                        description: sanitizedArgs.description || null,
                        category: sanitizedArgs.category || "other",
                        date: sanitizedArgs.date,
                        is_ai_generated: true
                    });
                    if (error) throw error;
                } else if (name === "update_itinerary_item") {
                    const updates: Record<string, unknown> = {
                        title: sanitizedArgs.title,
                        date: sanitizedArgs.date,
                        location: sanitizedArgs.location,
                        description: sanitizedArgs.description,
                        type: sanitizedArgs.type
                    };

                    const startTz = sanitizedArgs.startTimezone || DEFAULT_OFFSET;
                    const endTz = sanitizedArgs.endTimezone || startTz || DEFAULT_OFFSET;

                    if (sanitizedArgs.date && sanitizedArgs.startTime) {
                        updates.start_time = `${sanitizedArgs.date}T${sanitizedArgs.startTime}:00${startTz}`;
                        updates.start_timezone = startTz;
                    }
                    if (sanitizedArgs.date && sanitizedArgs.endTime) {
                        updates.end_time = `${sanitizedArgs.date}T${sanitizedArgs.endTime}:00${endTz}`;
                        updates.end_timezone = endTz;
                    }

                    const { error } = await supabase.from("itinerary_items").update(updates).eq("id", sanitizedArgs.id);
                    if (error) throw error;
                } else if (name === "delete_itinerary_item") {
                    const { error } = await supabase.from("itinerary_items").delete().eq("id", sanitizedArgs.id);
                    if (error) throw error;
                } else if (name === "add_place") {
                    const { error } = await supabase.from("places").insert({
                        trip_id: tripId,
                        name: sanitizedArgs.name,
                        address: sanitizedArgs.address,
                        notes: sanitizedArgs.description,
                        is_ai_generated: true
                    });
                    if (error) throw error;
                } else if (name === "delete_place") {
                    const { error } = await supabase.from("places").delete().eq("id", sanitizedArgs.id);
                    if (error) throw error;
                }


                // ツール実行結果をAIにフィードバックして最終回答を得る
                const toolResponse = await chat.sendMessage([{
                    functionResponse: {
                        name,
                        response: { content: "OK" }
                    }
                }]);
                finalResponse = toolResponse.response.text();
            } catch (error: any) {
                console.error("Tool execution error:", error);
                finalResponse = `申し訳ありません。${name} の実行中にエラーが発生しました: ${error.message}`;
            }
        } else {
            finalResponse = response.text();
        }

        // 4. AIの回答を保存
        await supabase.from("chat_messages").insert({
            session_id: sessionId,
            trip_id: tripId,
            user_id: user.id,
            role: "assistant",
            content: finalResponse,
        });

    } catch (error) {
        console.error("Response processing error:", error);
        // エラー内容によってはユーザーに見せたくないので一般的なメッセージにするか、あるいはエラーを返す
        return {
            success: false,
            error: "申し訳ありません。AIの応答処理中にエラーが発生しました。"
        };
    }

    // 最初に送られたメッセージであれば、セッションのタイトルを更新する
    if (history?.length === 1 && finalResponse) {
        // AIの回答ではなく、ユーザーのメッセージ(=message)をタイトルにする
        await updateChatSession(sessionId, { title: message.substring(0, 20) });
    }

    revalidatePath(`/trips/${tripId}`);
    return finalResponse;
}
