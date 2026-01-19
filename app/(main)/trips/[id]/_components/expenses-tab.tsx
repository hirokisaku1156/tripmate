"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { SettlementDialog } from "./settlement-dialog";

interface ExpensesTabProps {
    tripId: string;
    expenses: {
        id: string;
        amount: number;
        currency: string;
        category: string | null;
        description: string | null;
        paid_by: string | null;
        date: string | null;
        created_at: string;
    }[];
    expenseSplits: {
        expense_id: string;
        user_id: string;
    }[];
    members: {
        user_id: string;
        role: string;
        profiles: {
            id: string;
            display_name: string;
        } | null;
    }[];
    currentUserId: string;
}

const CATEGORIES = [
    { value: "food", label: "食事", icon: "🍽️" },
    { value: "transport", label: "交通", icon: "🚄" },
    { value: "accommodation", label: "宿泊", icon: "🏨" },
    { value: "activity", label: "観光", icon: "🎫" },
    { value: "shopping", label: "買い物", icon: "🛍️" },
    { value: "other", label: "その他", icon: "📦" },
];

export function ExpensesTab({
    tripId,
    expenses,
    expenseSplits,
    members,
    currentUserId,
}: ExpensesTabProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        amount: "",
        category: "food",
        description: "",
        paidBy: currentUserId,
        date: new Date().toISOString().split("T")[0],
    });
    const [selectedMembers, setSelectedMembers] = useState<string[]>(
        members.map((m) => m.user_id)
    );
    const router = useRouter();
    const supabase = createClient();

    const handleSubmit = async () => {
        if (!formData.amount || Number(formData.amount) <= 0) {
            toast.error("金額を入力してください");
            return;
        }
        if (selectedMembers.length === 0) {
            toast.error("対象者を選択してください");
            return;
        }

        setLoading(true);

        // 支払い登録
        const { data: expense, error } = await supabase
            .from("expenses")
            .insert({
                trip_id: tripId,
                amount: Number(formData.amount),
                currency: "JPY",
                amount_jpy: Number(formData.amount),
                category: formData.category,
                description: formData.description || null,
                paid_by: formData.paidBy,
                date: formData.date || null,
            })
            .select()
            .single();

        if (error) {
            toast.error("登録に失敗しました", { description: error.message });
            setLoading(false);
            return;
        }

        // 対象者を登録
        const splits = selectedMembers.map((userId) => ({
            expense_id: expense.id,
            user_id: userId,
        }));

        const { error: splitError } = await supabase
            .from("expense_splits")
            .insert(splits);

        if (splitError) {
            console.error("Split error:", splitError);
        }

        toast.success("支払いを登録しました");
        setOpen(false);
        setFormData({
            amount: "",
            category: "food",
            description: "",
            paidBy: currentUserId,
            date: new Date().toISOString().split("T")[0],
        });
        setSelectedMembers(members.map((m) => m.user_id));
        router.refresh();
        setLoading(false);
    };

    const toggleMember = (userId: string) => {
        setSelectedMembers((prev) =>
            prev.includes(userId)
                ? prev.filter((id) => id !== userId)
                : [...prev, userId]
        );
    };

    const getMemberName = (userId: string | null) => {
        if (!userId) return "不明";
        const member = members.find((m) => m.user_id === userId);
        return member?.profiles?.display_name ?? "不明";
    };

    const getCategoryInfo = (category: string | null) => {
        return CATEGORIES.find((c) => c.value === category) ?? CATEGORIES[5];
    };

    // 合計金額
    const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

    // 精算用データを準備
    const expenseData = expenses.map((e) => ({
        amount: e.amount,
        paid_by: e.paid_by ?? "",
        splits: expenseSplits
            .filter((s) => s.expense_id === e.id)
            .map((s) => s.user_id),
    }));

    const memberData = members.map((m) => ({
        userId: m.user_id,
        displayName: m.profiles?.display_name ?? "不明",
    }));

    return (
        <div className="space-y-4">
            {/* ヘッダー */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-semibold">費用管理</h3>
                    <p className="text-sm text-muted-foreground">
                        合計: ¥{totalAmount.toLocaleString()}
                    </p>
                </div>
                <div className="flex gap-2">
                    <SettlementDialog
                        tripName="旅行"
                        expenses={expenseData}
                        members={memberData}
                    />
                    <Dialog open={open} onOpenChange={setOpen}>
                        <DialogTrigger asChild>
                            <Button size="sm">+ 支払い追加</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>支払いを登録</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 pt-4">
                                <div className="space-y-2">
                                    <Label>金額（円）</Label>
                                    <Input
                                        type="number"
                                        placeholder="1000"
                                        value={formData.amount}
                                        onChange={(e) =>
                                            setFormData({ ...formData, amount: e.target.value })
                                        }
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>カテゴリ</Label>
                                    <Select
                                        value={formData.category}
                                        onValueChange={(v) =>
                                            setFormData({ ...formData, category: v })
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {CATEGORIES.map((cat) => (
                                                <SelectItem key={cat.value} value={cat.value}>
                                                    {cat.icon} {cat.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>メモ</Label>
                                    <Input
                                        placeholder="ランチ代など"
                                        value={formData.description}
                                        onChange={(e) =>
                                            setFormData({ ...formData, description: e.target.value })
                                        }
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>日付</Label>
                                    <Input
                                        type="date"
                                        value={formData.date}
                                        onChange={(e) =>
                                            setFormData({ ...formData, date: e.target.value })
                                        }
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>支払った人</Label>
                                    <Select
                                        value={formData.paidBy}
                                        onValueChange={(v) =>
                                            setFormData({ ...formData, paidBy: v })
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {members.map((m) => (
                                                <SelectItem key={m.user_id} value={m.user_id}>
                                                    {m.profiles?.display_name ?? "不明"}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>対象者</Label>
                                    <div className="flex flex-wrap gap-2">
                                        {members.map((m) => (
                                            <Badge
                                                key={m.user_id}
                                                variant={
                                                    selectedMembers.includes(m.user_id)
                                                        ? "default"
                                                        : "outline"
                                                }
                                                className="cursor-pointer"
                                                onClick={() => toggleMember(m.user_id)}
                                            >
                                                {m.profiles?.display_name ?? "不明"}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>

                                <Button
                                    onClick={handleSubmit}
                                    className="w-full"
                                    disabled={loading}
                                >
                                    {loading ? "登録中..." : "登録"}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* 支払い一覧 */}
            {expenses.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="py-8 text-center">
                        <p className="text-muted-foreground">支払いがありません</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-2">
                    {expenses.map((expense) => {
                        const cat = getCategoryInfo(expense.category);
                        const splits = expenseSplits.filter(
                            (s) => s.expense_id === expense.id
                        );
                        return (
                            <Card key={expense.id}>
                                <CardContent className="py-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <span className="text-2xl">{cat.icon}</span>
                                            <div>
                                                <p className="font-medium">
                                                    {expense.description || cat.label}
                                                </p>
                                                <p className="text-sm text-muted-foreground">
                                                    {getMemberName(expense.paid_by)}が支払い →{" "}
                                                    {splits.length}人で割り勘
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold">
                                                ¥{expense.amount.toLocaleString()}
                                            </p>
                                            {expense.date && (
                                                <p className="text-xs text-muted-foreground">
                                                    {new Date(expense.date).toLocaleDateString("ja-JP")}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
