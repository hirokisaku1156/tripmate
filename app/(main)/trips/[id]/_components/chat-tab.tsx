"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { sendMessage, createChatSession, getChatSessions } from "@/app/actions/chat";
import { toast } from "sonner";
import { Send, Bot, User, Lock, Unlock, Plus, MessageSquare, History, ChevronLeft } from "lucide-react";

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    created_at: string;
}

interface ChatSession {
    id: string;
    title: string;
    is_private: boolean;
    created_at: string;
}

interface ChatTabProps {
    tripId: string;
    initialSessions: ChatSession[];
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

export function ChatTab({ tripId, initialSessions, initialMessages, context }: ChatTabProps) {
    const [sessions, setSessions] = useState<ChatSession[]>(initialSessions);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(initialSessions[0]?.id || null);
    const [messages, setMessages] = useState<Message[]>(initialMessages);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // セッションが変更されたらメッセージを取得
    useEffect(() => {
        if (currentSessionId && currentSessionId !== initialSessions[0]?.id) {
            // クライアントサイドでのメッセージ取得が必要 (本来は Server Action で取得すべきだが、ここでは簡易化のため状態管理で対応)
            // 実際の実装では sessionId が変わったらメッセージをフェッチする
            const fetchMessages = async () => {
                const { createClient } = await import("@/lib/supabase/client");
                const supabase = createClient();
                const { data } = await supabase
                    .from("chat_messages")
                    .select("*")
                    .eq("session_id", currentSessionId)
                    .order("created_at", { ascending: true });
                if (data) setMessages(data);
            };
            fetchMessages();
        } else if (currentSessionId === initialSessions[0]?.id) {
            setMessages(initialMessages);
        } else {
            setMessages([]);
        }
    }, [currentSessionId, initialSessions, initialMessages]);

    // メッセージが追加されたら一番下までスクロール
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleCreateSession = async (isPrivate: boolean = false) => {
        try {
            setLoading(true);
            const newSession = await createChatSession(tripId, "新しいトーク", isPrivate);
            setSessions(prev => [newSession, ...prev]);
            setCurrentSessionId(newSession.id);
            setMessages([]);
            setIsSidebarOpen(false);
        } catch (error) {
            toast.error("トークの作成に失敗しました");
        } finally {
            setLoading(false);
        }
    };

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        let sessionId = currentSessionId;

        // セッションがない場合は自動作成（通常はありえないが安全のため）
        if (!sessionId) {
            try {
                const newSession = await createChatSession(tripId, input.trim().substring(0, 20));
                setSessions(prev => [newSession, ...prev]);
                sessionId = newSession.id;
                setCurrentSessionId(sessionId);
            } catch (error) {
                toast.error("トークの作成に失敗しました");
                return;
            }
        }

        const userMessage = input.trim();
        setInput("");
        setLoading(true);

        // UIを即時更新
        const tempUserMsg: Message = {
            id: Date.now().toString(),
            role: "user",
            content: userMessage,
            created_at: new Date().toISOString(),
        };
        setMessages(prev => [...prev, tempUserMsg]);

        try {
            const aiResponseResult = await sendMessage(tripId, sessionId!, userMessage, context);

            let aiContent = "";
            if (typeof aiResponseResult === "object" && aiResponseResult !== null && "error" in aiResponseResult) {
                aiContent = aiResponseResult.error as string;
                toast.error("AIからの応答に問題がありました");
            } else {
                aiContent = aiResponseResult as string;
            }

            const tempAiMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: aiContent,
                created_at: new Date().toISOString(),
            };
            setMessages(prev => [...prev, tempAiMsg]);

            // 初回メッセージならタイトル更新された可能性があるのでリストを再取得
            if (messages.length === 0) {
                const updatedSessions = await getChatSessions(tripId);
                setSessions(updatedSessions);
            }
        } catch (error) {
            toast.error("メッセージの送信に失敗しました");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const currentSession = sessions.find(s => s.id === currentSessionId);

    return (
        <div className="flex h-[600px] border rounded-xl bg-white dark:bg-gray-900 shadow-sm overflow-hidden relative">
            {/* サイドバー（トーク一覧） */}
            <div className={`absolute inset-y-0 left-0 z-20 w-64 bg-gray-50 dark:bg-gray-800 border-r transition-transform duration-300 transform ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 md:static`}>
                <div className="p-4 border-b flex items-center justify-between bg-white dark:bg-gray-900">
                    <h3 className="font-bold flex items-center gap-2">
                        <History size={18} className="text-blue-500" />
                        トーク履歴
                    </h3>
                    <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsSidebarOpen(false)}>
                        <ChevronLeft size={18} />
                    </Button>
                </div>
                <div className="p-3 space-y-2">
                    <Button
                        onClick={() => handleCreateSession(false)}
                        className="w-full justify-start gap-2 bg-blue-600 hover:bg-blue-700"
                        size="sm"
                    >
                        <Plus size={16} /> 新しいトーク
                    </Button>
                    <Button
                        onClick={() => handleCreateSession(true)}
                        variant="outline"
                        className="w-full justify-start gap-2 border-amber-200 text-amber-700 hover:bg-amber-50"
                        size="sm"
                    >
                        <Lock size={16} /> プライベートトーク
                    </Button>
                </div>
                <ScrollArea className="h-[calc(600px-130px)] px-3">
                    <div className="space-y-1 pb-4">
                        {sessions.map((s) => (
                            <button
                                key={s.id}
                                onClick={() => {
                                    setCurrentSessionId(s.id);
                                    setIsSidebarOpen(false);
                                }}
                                className={`w-full text-left p-3 rounded-lg text-sm transition-colors flex items-start gap-2 ${currentSessionId === s.id
                                    ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-800"
                                    : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                                    }`}
                            >
                                {s.is_private ? <Lock size={14} className="mt-1 shrink-0 text-amber-500" /> : <MessageSquare size={14} className="mt-1 shrink-0 opacity-50" />}
                                <div className="overflow-hidden">
                                    <p className="font-medium truncate">{s.title || "新しいトーク"}</p>
                                    <p className="text-[10px] opacity-50 mt-1">{new Date(s.created_at).toLocaleDateString()}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </ScrollArea>
            </div>

            {/* チャットメインエリア */}
            <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-gray-900">
                {/* ヘッダー */}
                <div className="p-3 border-b flex items-center gap-3 bg-white dark:bg-gray-900">
                    <Button variant="ghost" size="icon" className="md:hidden shrink-0" onClick={() => setIsSidebarOpen(true)}>
                        <History size={20} />
                    </Button>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <h4 className="font-bold truncate">{currentSession?.title || "AIアシスタント"}</h4>
                            {currentSession?.is_private && <Lock size={14} className="text-amber-500" />}
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate">
                            {currentSession?.is_private ? "自分のみ閲覧可能なトーク" : "メンバー全員に共有されるトーク"}
                        </p>
                    </div>
                </div>

                {/* メッセージ表示エリア */}
                <ScrollArea className="flex-1 p-4" viewportRef={scrollRef}>
                    <div className="space-y-4">
                        {!currentSessionId && (
                            <div className="text-center py-20 space-y-4">
                                <Bot className="w-16 h-16 mx-auto text-blue-500 opacity-20" />
                                <div className="space-y-2">
                                    <p className="text-gray-500 font-medium">
                                        トークを選択するか、新しく開始してください
                                    </p>
                                    <div className="flex flex-wrap justify-center gap-2 pt-2">
                                        <Button size="sm" onClick={() => handleCreateSession(false)}>共有トークを開始</Button>
                                        <Button size="sm" variant="outline" onClick={() => handleCreateSession(true)}>プライベートを開始</Button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {messages.map((m) => (
                            <div
                                key={m.id}
                                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                            >
                                <div
                                    className={`flex gap-3 max-w-[85%] ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                                >
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${m.role === "user" ? "bg-blue-600 text-white" : "bg-white dark:bg-gray-800 text-blue-600 border"
                                        }`}>
                                        {m.role === "user" ? <User size={16} /> : <Bot size={16} />}
                                    </div>
                                    <div
                                        className={`p-3 rounded-2xl text-sm shadow-sm overflow-hidden break-words w-full ${m.role === "user"
                                            ? "bg-blue-600 text-white rounded-tr-none"
                                            : "bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-none border border-gray-100 dark:border-gray-700"
                                            }`}
                                    >
                                        <p className="whitespace-pre-wrap leading-relaxed break-words">{m.content}</p>
                                        <div className={`flex items-center gap-1 mt-1 opacity-50 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
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
                                <div className="flex gap-3 items-center">
                                    <div className="w-8 h-8 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center border shadow-sm">
                                        <Bot size={16} className="text-blue-600" />
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-2xl rounded-tl-none flex gap-1 shadow-sm border border-gray-100 dark:border-gray-700">
                                        <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"></span>
                                        <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                                        <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>

                {/* 入力エリア */}
                <div className="p-4 border-t bg-gray-50/30 dark:bg-gray-800/30">
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            handleSend();
                        }}
                        className="flex gap-2"
                    >
                        <Input
                            placeholder={currentSessionId ? "メッセージを入力..." : "新しいトークを開始します..."}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            disabled={loading || (!currentSessionId && !input)}
                            className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 focus-visible:ring-blue-500 shadow-sm"
                        />
                        <Button
                            type="submit"
                            size="icon"
                            disabled={!input.trim() || loading}
                            className="bg-blue-600 hover:bg-blue-700 shrink-0 shadow-sm"
                        >
                            <Send size={18} />
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
}
