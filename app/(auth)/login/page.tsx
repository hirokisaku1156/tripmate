"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

function LoginForm() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirect = searchParams.get("redirect");
    const supabase = createClient();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            toast.error("ログインに失敗しました", {
                description: error.message,
            });
        } else {
            toast.success("ログインしました");
            // redirectパラメータがあればそこに、なければ/tripsへ
            router.push(redirect || "/trips");
            router.refresh();
        }

        setLoading(false);
    };

    // 新規登録リンクにredirectパラメータを渡す
    const signupUrl = redirect ? `/signup?redirect=${encodeURIComponent(redirect)}` : "/signup";

    return (
        <Card className="shadow-xl border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
            <CardHeader className="space-y-1 text-center">
                <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                        <span className="text-3xl">✈️</span>
                    </div>
                </div>
                <CardTitle className="text-2xl font-bold">TripMate</CardTitle>
                <CardDescription>
                    友達との旅行をもっと楽しく
                </CardDescription>
            </CardHeader>
            <form onSubmit={handleLogin}>
                <CardContent className="space-y-4">
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
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
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
                        {loading ? "ログイン中..." : "ログイン"}
                    </Button>
                    <p className="text-sm text-muted-foreground">
                        アカウントをお持ちでない方は{" "}
                        <Link href={signupUrl} className="text-blue-600 hover:underline font-medium">
                            新規登録
                        </Link>
                    </p>
                </CardFooter>
            </form>
        </Card>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <Card className="shadow-xl border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
                <CardContent className="py-12 text-center">
                    <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-muted-foreground">読み込み中...</p>
                </CardContent>
            </Card>
        }>
            <LoginForm />
        </Suspense>
    );
}
