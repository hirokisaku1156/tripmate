"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function SignUpPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    display_name: displayName,
                },
            },
        });

        if (error) {
            toast.error("登録に失敗しました", {
                description: error.message,
            });
            setLoading(false);
            return;
        }

        if (data.user) {
            // メール確認が無効な場合は直接ログイン状態になる
            // プロフィールはDBトリガーで自動作成される
            toast.success("登録が完了しました！");
            router.push("/trips");
            router.refresh();
        }

        setLoading(false);
    };

    return (
        <Card className="shadow-xl border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
            <CardHeader className="space-y-1 text-center">
                <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                        <span className="text-3xl">✈️</span>
                    </div>
                </div>
                <CardTitle className="text-2xl font-bold">新規登録</CardTitle>
                <CardDescription>
                    アカウントを作成して旅行の計画を始めよう
                </CardDescription>
            </CardHeader>
            <form onSubmit={handleSignUp}>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="displayName">表示名</Label>
                        <Input
                            id="displayName"
                            type="text"
                            placeholder="あなたの名前"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">メールアドレス</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password">パスワード</Label>
                        <Input
                            id="password"
                            type="password"
                            placeholder="6文字以上"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            minLength={6}
                            required
                        />
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                    <Button
                        type="submit"
                        className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
                        disabled={loading}
                    >
                        {loading ? "登録中..." : "アカウントを作成"}
                    </Button>
                    <p className="text-sm text-muted-foreground">
                        すでにアカウントをお持ちの方は{" "}
                        <Link href="/login" className="text-blue-600 hover:underline font-medium">
                            ログイン
                        </Link>
                    </p>
                </CardFooter>
            </form>
        </Card>
    );
}
