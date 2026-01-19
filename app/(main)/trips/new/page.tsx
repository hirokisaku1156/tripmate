"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

function generateInviteCode(): string {
    // crypto.randomUUID() を使用して安全なランダム文字列を生成
    // UUIDの一部を取り出して短い招待コードに
    return crypto.randomUUID().replace(/-/g, "").substring(0, 8).toUpperCase();
}

export default function NewTripPage() {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [destinations, setDestinations] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            toast.error("ログインしてください");
            return;
        }

        const inviteCode = generateInviteCode();

        // 旅行を作成
        const { data: trip, error: tripError } = await supabase
            .from("trips")
            .insert({
                name,
                description: description || null,
                start_date: startDate || null,
                end_date: endDate || null,
                destinations: destinations ? destinations.split(",").map(d => d.trim()) : null,
                invite_code: inviteCode,
                created_by: user.id,
            })
            .select()
            .single();

        if (tripError) {
            toast.error("旅行の作成に失敗しました", {
                description: tripError.message,
            });
            setLoading(false);
            return;
        }

        // メンバーとして自分を追加（オーナー）
        const { error: memberError } = await supabase
            .from("trip_members")
            .insert({
                trip_id: trip.id,
                user_id: user.id,
                role: "owner",
            });

        if (memberError) {
            console.error("Member creation error:", memberError);
        }

        toast.success("旅行を作成しました！");
        router.push(`/trips/${trip.id}`);
        router.refresh();
    };

    return (
        <div className="min-h-screen pb-20">
            {/* ヘッダー */}
            <header className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
                <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-4">
                    <Link href="/trips">
                        <Button variant="ghost" size="sm">
                            ← 戻る
                        </Button>
                    </Link>
                    <h1 className="text-lg font-semibold">新しい旅行を作成</h1>
                </div>
            </header>

            {/* フォーム */}
            <main className="max-w-2xl mx-auto px-4 py-6">
                <Card>
                    <CardHeader>
                        <CardTitle>旅行情報</CardTitle>
                        <CardDescription>
                            旅行の基本情報を入力してください
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="name">旅行名 *</Label>
                                <Input
                                    id="name"
                                    placeholder="例: 沖縄旅行2025"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">説明（任意）</Label>
                                <Input
                                    id="description"
                                    placeholder="例: 大学の友達と3泊4日"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="startDate">開始日</Label>
                                    <Input
                                        id="startDate"
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="endDate">終了日</Label>
                                    <Input
                                        id="endDate"
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="destinations">目的地（カンマ区切り）</Label>
                                <Input
                                    id="destinations"
                                    placeholder="例: 沖縄, 那覇, 石垣島"
                                    value={destinations}
                                    onChange={(e) => setDestinations(e.target.value)}
                                />
                            </div>

                            <Button
                                type="submit"
                                className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
                                disabled={loading}
                            >
                                {loading ? "作成中..." : "旅行を作成"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
