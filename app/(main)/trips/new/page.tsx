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
import type { Database } from "@/lib/supabase/types";

type TripMemberInsert = Database["public"]["Tables"]["trip_members"]["Insert"];

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
    const [manualMembers, setManualMembers] = useState<string[]>([]); // 名前文字列の配列に変更
    const [currentName, setCurrentName] = useState(""); // 入力中の名前
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    const addMember = () => {
        const trimmedName = currentName.trim();
        if (trimmedName && !manualMembers.includes(trimmedName)) {
            setManualMembers([...manualMembers, trimmedName]);
            setCurrentName("");
        }
    };

    const removeMember = (index: number) => {
        setManualMembers(manualMembers.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            toast.error("ログインしてください");
            setLoading(false);
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

        // メンバー登録用の配列を作成
        const membersToInsert: TripMemberInsert[] = [
            // オーナー（自分）
            {
                trip_id: trip.id,
                user_id: user.id,
                role: "owner",
            },
        ];

        // 手動追加メンバー
        manualMembers.forEach((name) => {
            membersToInsert.push({
                trip_id: trip.id,
                user_id: null,
                role: "member",
                display_name_override: name,
            });
        });

        const { error: memberError } = await supabase
            .from("trip_members")
            .insert(membersToInsert);

        if (memberError) {
            console.error("Member creation error:", memberError);
            toast.error("一部メンバーの登録に失敗しました");
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
                <Card className="shadow-lg border-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm">
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
                                    className="h-11"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">説明（任意）</Label>
                                <Input
                                    id="description"
                                    placeholder="例: 大学の友達と3泊4日"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="h-11"
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
                                        className="h-11"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="endDate">終了日</Label>
                                    <Input
                                        id="endDate"
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="h-11"
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
                                    className="h-11"
                                />
                            </div>

                            <div className="space-y-4 border-t pt-4">
                                <Label>メンバーを追加（任意）</Label>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="例: 田中太郎"
                                        value={currentName}
                                        onChange={(e) => setCurrentName(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                e.preventDefault();
                                                addMember();
                                            }
                                        }}
                                        className="h-11"
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={addMember}
                                        className="h-11 px-4 border-blue-200 text-blue-600 hover:bg-blue-50"
                                    >
                                        追加
                                    </Button>
                                </div>

                                {manualMembers.length > 0 && (
                                    <div className="flex flex-wrap gap-2 pt-2">
                                        {manualMembers.map((mName, index) => (
                                            <div
                                                key={index}
                                                className="flex items-center gap-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-3 py-1.5 rounded-full text-sm border border-blue-100 dark:border-blue-800"
                                            >
                                                <span>{mName}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => removeMember(index)}
                                                    className="hover:text-red-500 transition-colors"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <p className="text-[12px] text-muted-foreground">
                                    一緒に行く友達の名前を入力して追加してください。アカウントがなくても費用計算に含められます。
                                </p>
                            </div>

                            <Button
                                type="submit"
                                className="w-full h-12 text-base bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-md font-bold"
                                disabled={loading}
                            >
                                {loading ? "作成中..." : "旅行をスタート！"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
