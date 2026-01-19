"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { sendMessage } from "@/app/actions/chat";
import { toast } from "sonner";
import { Send, Bot, User, Lock, Unlock } from "lucide-react";

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    is_private?: boolean;
    created_at: string;
}

interface ChatTabProps {
    tripId: string;
    initialMessages: Message[];
    context: {
        tripName: string;
        destinations: string[] | null;
        startDate: string | null;
        endDate: string | null;
        memberCount: number;
        itineraryItems: any[];
        places: any[];
    };
}

export function ChatTab({ tripId, initialMessages, context }: ChatTabProps) {
    const [messages, setMessages] = useState<Message[]>(initialMessages);
    const [input, setInput] = useState("");
    const [isPrivate, setIsPrivate] = useState(false);
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // メッセージが追加されたら一番下までスクロール
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        const userMessage = input.trim();
        setInput("");
        setLoading(true);

        // UIを即時更新（一時的なIDを使用）
        const tempUserMsg: Message = {
            id: Date.now().toString(),
            role: "user",
            content: userMessage,
            is_private: isPrivate,
            created_at: new Date().toISOString(),
        };
        setMessages(prev => [...prev, tempUserMsg]);

        try {
            const aiResponse = await sendMessage(tripId, userMessage, context, isPrivate);

            const tempAiMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: aiResponse,
                is_private: isPrivate,
                created_at: new Date().toISOString(),
            };
            setMessages(prev => [...prev, tempAiMsg]);
        } catch (error) {
            toast.error("メッセージの送信に失敗しました");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-280px)] max-h-[600px] border rounded-xl bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
            {/* メッセージエリア */}
            <ScrollArea className="flex-1 p-4" viewportRef={scrollRef}>
                <div className="space-y-4">
                    {messages.length === 0 && (
                        <div className="text-center py-10 space-y-2">
                            <Bot className="w-12 h-12 mx-auto text-blue-500 opacity-50" />
                            <p className="text-muted-foreground font-medium">
                                旅行の相談をしてみましょう！<br />
                                おすすめスポットやルートを提案します。
                            </p>
                        </div>
                    )}
                    {messages.map((m) => (
                        <div
                            key={m.id}
                            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                            <div
                                className={`flex gap-2 max-w-[85%] ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                            >
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${m.role === "user" ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-600"
                                    }`}>
                                    {m.role === "user" ? <User size={16} /> : <Bot size={16} />}
                                </div>
                                <div
                                    className={`p-3 rounded-2xl text-sm ${m.role === "user"
                                        ? "bg-blue-600 text-white rounded-tr-none"
                                        : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-none border border-gray-200 dark:border-gray-700"
                                        }`}
                                >
                                    <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                                    <div className={`flex items-center gap-1 mt-1 opacity-50 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                                        {m.is_private && <Lock size={10} />}
                                        <p className="text-[10px]">
                                            {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div className="flex justify-start">
                            <div className="flex gap-2 items-center">
                                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                                    <Bot size={16} className="text-gray-600" />
                                </div>
                                <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-2xl rounded-tl-none flex gap-1">
                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </ScrollArea>

            {/* 入力エリア */}
            <div className="p-4 border-t bg-gray-50/50 dark:bg-gray-800/50">
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleSend();
                    }}
                    className="flex gap-2"
                >
                    <Input
                        placeholder="旅行について質問する..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        disabled={loading}
                        className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 focus-visible:ring-blue-500"
                    />
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsPrivate(!isPrivate)}
                        className={`shrink-0 ${isPrivate ? "text-amber-500 hover:text-amber-600 bg-amber-50" : "text-gray-400 hover:text-gray-500"}`}
                        title={isPrivate ? "自分のみ閲覧可能" : "メンバー全員に共有"}
                    >
                        {isPrivate ? <Lock size={18} /> : <Unlock size={18} />}
                    </Button>
                    <Button
                        type="submit"
                        size="icon"
                        disabled={!input.trim() || loading}
                        className="bg-blue-600 hover:bg-blue-700 shrink-0"
                    >
                        <Send size={18} />
                    </Button>
                </form>
            </div>
        </div>
    );
}
