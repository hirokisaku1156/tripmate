"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

interface JoinPageProps {
    params: Promise<{ code: string }>;
}

function JoinPageContent({ params }: JoinPageProps) {
    const [code, setCode] = useState<string>("");
    const [trip, setTrip] = useState<{ id: string; name: string; description: string | null } | null>(null);
    const [targetMember, setTargetMember] = useState<{ id: string; display_name_override: string | null } | null>(null);
    const [loading, setLoading] = useState(true);
    const [joining, setJoining] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get("token");
    const supabase = createClient();

    useEffect(() => {
        const loadTrip = async () => {
            const { code: inviteCode } = await params;
            setCode(inviteCode);

            // 旅行を検索
            const { data, error } = await supabase
                .from("trips")
                .select("id, name, description")
                .eq("invite_code", inviteCode)
                .single();

            if (error || !data) {
                setError("招待リンクが無効です");
            } else {
                setTrip(data);

                // トークンがある場合、対象メンバーを特定
                if (token) {
                    const { data: memberData } = await supabase
                        .from("trip_members")
                        .select("id, display_name_override, user_id")
                        .eq("invite_token", token)
                        .eq("trip_id", data.id)
                        .single();

                    if (memberData) {
                        if (memberData.user_id) {
                            setError("この招待リンクはすでに使用されています");
                        } else {
                            setTargetMember(memberData);
                        }
                    } else {
                        setError("無効な個別招待リンクです");
                    }
                }
            }
            setLoading(false);
        };

        loadTrip();
    }, [params, supabase, token]);

    const handleJoin = async () => {
        setJoining(true);

        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            // 未ログインの場合、ログインページへ（招待コードとトークンを保持）
            const redirectUrl = token
                ? `/join/${code}?token=${token}`
                : `/join/${code}`;
            router.push(`/login?redirect=${encodeURIComponent(redirectUrl)}`);
            return;
        }

        if (!trip) return;

        // すでにメンバーかチェック
        const { data: existingMember } = await supabase
            .from("trip_members")
            .select("id")
            .eq("trip_id", trip.id)
            .eq("user_id", user.id)
            .single();

        if (existingMember) {
            toast.info("すでにこの旅行に参加しています");
            router.push(`/trips/${trip.id}`);
            return;
        }

        if (targetMember) {
            // 個別招待トークンがある場合、既存のレコードに紐付ける
            const { error } = await supabase
                .from("trip_members")
                .update({ user_id: user.id })
                .eq("id", targetMember.id);

            if (error) {
                toast.error("リンクに失敗しました", { description: error.message });
            } else {
                toast.success(`${targetMember.display_name_override || "メンバー"}として参加しました！`);
                router.push(`/trips/${trip.id}`);
            }
        } else {
            // 通常の参加処理
            const { error } = await supabase
                .from("trip_members")
                .insert({
                    trip_id: trip.id,
                    user_id: user.id,
                    role: "member",
                });

            if (error) {
                toast.error("参加に失敗しました", { description: error.message });
            } else {
                toast.success("旅行に参加しました！");
                router.push(`/trips/${trip.id}`);
            }
        }

        setJoining(false);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-muted-foreground">読み込み中...</p>
                </div>
            </div>
        );
    }

    if (error || !trip) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
                <Card className="max-w-md w-full shadow-xl border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
                    <CardContent className="py-12 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                            <span className="text-3xl">❌</span>
                        </div>
                        <h3 className="text-lg font-medium mb-2">{error || "招待リンクが無効です"}</h3>
                        <p className="text-muted-foreground mb-4">
                            リンクが間違っているか、期限切れの可能性があります
                        </p>
                        <Link href="/trips">
                            <Button>旅行一覧に戻る</Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
            <Card className="max-w-md w-full shadow-xl border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
                <CardHeader className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                        <span className="text-3xl">✈️</span>
                    </div>
                    <CardTitle className="text-xl">旅行に招待されました</CardTitle>
                    <CardDescription>
                        {targetMember
                            ? `${targetMember.display_name_override}として以下の旅行に参加しますか？`
                            : "以下の旅行に参加しますか？"
                        }
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <h3 className="font-semibold text-lg mb-1">{trip.name}</h3>
                        {trip.description && (
                            <p className="text-sm text-muted-foreground">{trip.description}</p>
                        )}
                    </div>
                    <Button
                        onClick={handleJoin}
                        className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
                        disabled={joining}
                    >
                        {joining ? "参加中..." : "この旅行に参加する"}
                    </Button>
                    <p className="text-center text-sm text-muted-foreground">
                        <Link href="/trips" className="text-blue-600 hover:underline">
                            キャンセルして戻る
                        </Link>
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}

export default function JoinPage({ params }: JoinPageProps) {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-muted-foreground">読み込み中...</p>
                </div>
            </div>
        }>
            <JoinPageContent params={params} />
        </Suspense>
    );
}
