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
import { MoreHorizontal, Bot } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SettlementDialog } from "./settlement-dialog";

interface ExpensesTabProps {
    tripId: string;
    expenses: {
        id: string;
        title: string | null;
        amount: number;
        currency: string;
        category: string | null;
        description: string | null;
        paid_by: string | null;
        date: string | null;
        is_settled: boolean;
        is_ai_generated: boolean;
        created_at: string;
    }[];
    expenseSplits: {
        expense_id: string;
        user_id: string; // Now refers to trip_members.id
    }[];
    members: {
        id: string; // trip_members.id
        user_id: string | null; // profiles.id
        role: string;
        display_name_override: string | null;
        profiles: {
            id: string;
            display_name: string;
        } | null;
    }[];
    currentMemberId: string;
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
    currentMemberId,
}: ExpensesTabProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [editExpenseId, setEditExpenseId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        title: "",
        amount: "",
        category: "food",
        description: "",
        paidBy: currentMemberId,
        date: new Date().toISOString().split("T")[0],
    });
    const [selectedMembers, setSelectedMembers] = useState<string[]>(
        members.map((m) => m.id)
    );
    const [showSettled, setShowSettled] = useState(true);
    const router = useRouter();
    const supabase = createClient();

    const handleEdit = (expense: any) => {
        const splits = expenseSplits
            .filter((s) => s.expense_id === expense.id)
            .map((s) => s.user_id);

        setFormData({
            title: expense.title || "",
            amount: expense.amount.toString(),
            category: expense.category || "food",
            description: expense.description || "",
            paidBy: expense.paid_by || "",
            date: expense.date || new Date().toISOString().split("T")[0],
        });
        setSelectedMembers(splits);
        setEditExpenseId(expense.id);
        setOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("この支払いを削除してもよろしいですか？")) return;
        setLoading(true);
        // Cascading delete is preferred, but let's be explicit if needed
        const { error } = await supabase.from("expenses").delete().eq("id", id);
        if (error) {
            toast.error("削除に失敗しました", { description: error.message });
        } else {
            toast.success("削除しました");
            router.refresh();
        }
        setLoading(false);
    };

    const handleSubmit = async () => {
        if (!formData.title) {
            toast.error("タイトルを入力してください");
            return;
        }
        if (!formData.amount || Number(formData.amount) <= 0) {
            toast.error("金額を入力してください");
            return;
        }
        if (selectedMembers.length === 0) {
            toast.error("対象者を選択してください");
            return;
        }

        setLoading(true);

        const expenseData = {
            trip_id: tripId,
            title: formData.title || null,
            amount: Number(formData.amount),
            currency: "JPY",
            amount_jpy: Number(formData.amount),
            category: formData.category,
            description: formData.description || null,
            paid_by: formData.paidBy,
            date: formData.date || null,
        };

        const { data: expense, error } = editExpenseId
            ? await supabase.from("expenses").update(expenseData).eq("id", editExpenseId).select().single()
            : await supabase.from("expenses").insert(expenseData).select().single();

        if (error) {
            toast.error(editExpenseId ? "更新に失敗しました" : "登録に失敗しました", { description: error.message });
            setLoading(false);
            return;
        }

        if (editExpenseId) {
            // 既存の分割を削除
            await supabase.from("expense_splits").delete().eq("expense_id", editExpenseId);
        }

        // 対象者を登録
        const splits = selectedMembers.map((memberId) => ({
            expense_id: expense.id,
            user_id: memberId,
        }));

        const { error: splitError } = await supabase.from("expense_splits").insert(splits);

        if (splitError) {
            console.error("Split error:", splitError);
        }

        toast.success(editExpenseId ? "支払いを更新しました" : "支払いを登録しました");
        setOpen(false);
        setEditExpenseId(null);
        setFormData({
            title: "",
            amount: "",
            category: "food",
            description: "",
            paidBy: currentMemberId,
            date: new Date().toISOString().split("T")[0],
        });
        setSelectedMembers(members.map((m) => m.id));
        router.refresh();
        setLoading(false);
    };

    const toggleMember = (memberId: string) => {
        setSelectedMembers((prev) =>
            prev.includes(memberId)
                ? prev.filter((id) => id !== memberId)
                : [...prev, memberId]
        );
    };

    const getMemberName = (memberId: string | null) => {
        if (!memberId) return "不明";
        const member = members.find((m) => m.id === memberId);
        return member?.profiles?.display_name || member?.display_name_override || "不明";
    };

    const getCategoryInfo = (category: string | null) => {
        return CATEGORIES.find((c) => c.value === category) ?? CATEGORIES[5];
    };

    const toggleSettled = async (id: string, currentStatus: boolean) => {
        const { error } = await supabase
            .from("expenses")
            .update({ is_settled: !currentStatus })
            .eq("id", id);

        if (error) {
            toast.error("更新に失敗しました");
        } else {
            router.refresh();
        }
    };

    const handleSettleAll = async () => {
        const unSettledIds = expenses.filter(e => !e.is_settled).map(e => e.id);
        if (unSettledIds.length === 0) return;

        const { error } = await supabase
            .from("expenses")
            .update({ is_settled: true })
            .in("id", unSettledIds);

        if (error) {
            toast.error("精算処理に失敗しました");
        } else {
            toast.success("全ての費用を精算済みにしました");
            router.refresh();
        }
    };

    // 未精算の合計金額
    const totalUnsettledAmount = expenses
        .filter(e => !e.is_settled)
        .reduce((sum, e) => sum + e.amount, 0);

    // 精算用データを準備（未精算のみ）
    const unsettledExpenseData = expenses
        .filter(e => !e.is_settled)
        .map((e) => ({
            amount: e.amount,
            paid_by: e.paid_by ?? "",
            splits: expenseSplits
                .filter((s) => s.expense_id === e.id)
                .map((s) => s.user_id),
        }));

    const memberData = members.map((m) => ({
        userId: m.id, // Now trip_members.id
        displayName: m.profiles?.display_name || m.display_name_override || "不明",
    }));

    return (
        <div className="space-y-4">
            {/* ヘッダー */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-semibold">費用管理</h3>
                    <p className="text-sm text-muted-foreground">
                        未精算合計: ¥{totalUnsettledAmount.toLocaleString()}
                    </p>
                </div>
                <div className="flex gap-2">
                    <SettlementDialog
                        tripName="旅行"
                        expenses={unsettledExpenseData}
                        members={memberData}
                        onSettleAll={handleSettleAll}
                    />
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowSettled(!showSettled)}
                        className="text-xs text-muted-foreground"
                    >
                        {showSettled ? "📑 精算済を隠す" : "📑 精算済を出す"}
                    </Button>
                    <Dialog open={open} onOpenChange={(val) => {
                        setOpen(val);
                        if (!val) {
                            setEditExpenseId(null);
                            setFormData({
                                title: "",
                                amount: "",
                                category: "food",
                                description: "",
                                paidBy: currentMemberId,
                                date: new Date().toISOString().split("T")[0],
                            });
                            setSelectedMembers(members.map((m) => m.id));
                        }
                    }}>
                        <DialogTrigger asChild>
                            <Button size="sm" onClick={() => {
                                setEditExpenseId(null);
                                setFormData({
                                    title: "",
                                    amount: "",
                                    category: "food",
                                    description: "",
                                    paidBy: currentMemberId,
                                    date: new Date().toISOString().split("T")[0],
                                });
                                setSelectedMembers(members.map((m) => m.id));
                            }}>+ 支払い追加</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{editExpenseId ? "支払いを編集" : "支払いを登録"}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 pt-4">
                                <div className="space-y-2">
                                    <Label>タイトル *</Label>
                                    <Input
                                        placeholder="例: ランチ代"
                                        value={formData.title}
                                        onChange={(e) =>
                                            setFormData({ ...formData, title: e.target.value })
                                        }
                                        required
                                    />
                                </div>
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
                                        placeholder="店名や詳細など"
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
                                                <SelectItem key={m.id} value={m.id}>
                                                    {m.profiles?.display_name || m.display_name_override || "不明"}
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
                                                key={m.id}
                                                variant={
                                                    selectedMembers.includes(m.id)
                                                        ? "default"
                                                        : "outline"
                                                }
                                                className="cursor-pointer"
                                                onClick={() => toggleMember(m.id)}
                                            >
                                                {m.profiles?.display_name || m.display_name_override || "不明"}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>

                                <Button
                                    onClick={handleSubmit}
                                    className="w-full"
                                    disabled={loading}
                                >
                                    {loading ? (editExpenseId ? "更新中..." : "登録中...") : (editExpenseId ? "更新する" : "登録する")}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* 支払い一覧 */}
            {expenses.filter(e => showSettled || !e.is_settled).length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="py-8 text-center text-muted-foreground">
                        {expenses.length === 0 ? "支払いがありません" : "表示できる支払いがありません"}
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-2">
                    {expenses
                        .filter(e => showSettled || !e.is_settled)
                        .map((expense) => {
                            const cat = getCategoryInfo(expense.category);
                            const splits = expenseSplits.filter(
                                (s) => s.expense_id === expense.id
                            );
                            return (
                                <Card key={expense.id}>
                                    <CardContent className="py-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={expense.is_settled}
                                                        onChange={() => toggleSettled(expense.id, expense.is_settled)}
                                                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                        title={expense.is_settled ? "未精算に戻す" : "精算済みにする"}
                                                    />
                                                    <span className="text-2xl">{cat.icon}</span>
                                                </div>
                                                <div className={expense.is_settled ? "opacity-60" : ""}>
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex flex-col">
                                                            <p className="font-medium">
                                                                {expense.title || expense.description || cat.label}
                                                            </p>
                                                            {expense.title && expense.description && (
                                                                <p className="text-[11px] text-muted-foreground line-clamp-1">
                                                                    {expense.description}
                                                                </p>
                                                            )}
                                                        </div>
                                                        {expense.is_ai_generated && (
                                                            <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200 gap-1 shrink-0 h-5 px-1.5 text-[10px]">
                                                                <Bot className="h-3 w-3" /> AI
                                                            </Badge>
                                                        )}
                                                        {expense.is_settled && (
                                                            <Badge variant="secondary" className="text-[10px] py-0 h-4 bg-gray-100 text-gray-500">精算済</Badge>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-muted-foreground">
                                                        {getMemberName(expense.paid_by)}が支払い →{" "}
                                                        {splits.length}人で割り勘
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-2">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-bold">
                                                        ¥{expense.amount.toLocaleString()}
                                                    </p>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={() => handleEdit(expense)}>
                                                                ✏️ 編集
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                className="text-red-600 focus:text-red-600"
                                                                onClick={() => handleDelete(expense.id)}
                                                            >
                                                                🗑️ 削除
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                                {expense.date && (
                                                    <p className="text-xs text-muted-foreground mt-1">
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
