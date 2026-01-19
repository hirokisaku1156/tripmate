"use client";

import { Button } from "@/components/ui/button";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    console.error("Global error:", error);

    return (
        <html lang="ja">
            <body className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="text-center max-w-md">
                    <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                        <span className="text-3xl">💥</span>
                    </div>
                    <h2 className="text-xl font-bold mb-2">重大なエラーが発生しました</h2>
                    <p className="text-gray-600 mb-4">
                        アプリケーションでエラーが発生しました。ページを再読み込みしてください。
                    </p>
                    <Button onClick={reset}>
                        再読み込み
                    </Button>
                </div>
            </body>
        </html>
    );
}
