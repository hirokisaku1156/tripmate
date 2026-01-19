"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import {
    calculateBalances,
    calculateSettlements,
    generateSettlementText,
} from "@/lib/settlement";

interface SettlementDialogProps {
    tripName: string;
    expenses: {
        amount: number;
        paid_by: string;
        splits: string[];
    }[];
    members: {
        userId: string;
        displayName: string;
    }[];
}

export function SettlementDialog({
    tripName,
    expenses,
    members,
}: SettlementDialogProps) {
    const [open, setOpen] = useState(false);

    const balances = calculateBalances(expenses, members);
    const settlements = calculateSettlements(balances);
    const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

    const handleCopy = () => {
        const text = generateSettlementText(tripName, settlements, totalAmount);
        navigator.clipboard.writeText(text);
        toast.success("コピーしました");
    };

    const handleLineShare = () => {
        const text = generateSettlementText(tripName, settlements, totalAmount);
        const encoded = encodeURIComponent(text);
        window.open(`https://line.me/R/share?text=${encoded}`, "_blank");
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    💰 精算
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>精算結果</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                    {/* 合計 */}
                    <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <p className="text-sm text-muted-foreground">合計金額</p>
                        <p className="text-2xl font-bold">¥{totalAmount.toLocaleString()}</p>
                    </div>

                    {/* 各メンバーの収支 */}
                    <div className="space-y-2">
                        <h4 className="font-medium text-sm">メンバー別収支</h4>
                        {balances.map((b) => (
                            <div
                                key={b.userId}
                                className="flex items-center justify-between py-1"
                            >
                                <span>{b.displayName}</span>
                                <span
                                    className={
                                        b.balance > 0
                                            ? "text-green-600 font-medium"
                                            : b.balance < 0
                                                ? "text-red-600 font-medium"
                                                : "text-muted-foreground"
                                    }
                                >
                                    {b.balance > 0 ? "+" : ""}
                                    ¥{b.balance.toLocaleString()}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* 精算内容 */}
                    <div className="space-y-2">
                        <h4 className="font-medium text-sm">精算内容</h4>
                        {settlements.length === 0 ? (
                            <Card>
                                <CardContent className="py-4 text-center">
                                    <p className="text-muted-foreground">
                                        精算の必要はありません 🎉
                                    </p>
                                </CardContent>
                            </Card>
                        ) : (
                            settlements.map((s, i) => (
                                <Card key={i}>
                                    <CardContent className="py-3">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <span className="font-medium">{s.from.displayName}</span>
                                                <span className="mx-2">→</span>
                                                <span className="font-medium">{s.to.displayName}</span>
                                            </div>
                                            <span className="font-bold">
                                                ¥{s.amount.toLocaleString()}
                                            </span>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>

                    {/* 共有ボタン */}
                    <div className="flex gap-2">
                        <Button variant="outline" className="flex-1" onClick={handleCopy}>
                            📋 コピー
                        </Button>
                        <Button
                            className="flex-1 bg-[#00B900] hover:bg-[#00A000]"
                            onClick={handleLineShare}
                        >
                            LINE共有
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
