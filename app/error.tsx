"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("Application error:", error);
    }, [error]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
            <div className="text-center max-w-md">
                <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                    <span className="text-3xl">⚠️</span>
                </div>
                <h2 className="text-xl font-bold mb-2">エラーが発生しました</h2>
                <p className="text-muted-foreground mb-4">
                    申し訳ありません。予期しないエラーが発生しました。
                </p>
                <Button onClick={reset}>
                    もう一度試す
                </Button>
            </div>
        </div>
    );
}
