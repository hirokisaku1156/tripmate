"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ItineraryTab } from "./itinerary-tab";
import { TodoTab } from "./todo-tab";
import { MembersTab } from "./members-tab";
import { ExpensesTab } from "./expenses-tab";
import type { Database } from "@/lib/supabase/types";

type Trip = Database["public"]["Tables"]["trips"]["Row"];
type TripMember = Database["public"]["Tables"]["trip_members"]["Row"] & {
    profiles: { id: string; display_name: string } | null;
};
type ItineraryItem = Database["public"]["Tables"]["itinerary_items"]["Row"];
type Todo = Database["public"]["Tables"]["trip_todos"]["Row"];
type Memo = Database["public"]["Tables"]["trip_memos"]["Row"];
type Expense = Database["public"]["Tables"]["expenses"]["Row"];
type ExpenseSplit = Database["public"]["Tables"]["expense_splits"]["Row"];

interface TripDetailClientProps {
    trip: any; // TODO: proper type
    members: any[];
    itineraryItems: any[];
    todos: Todo[];
    memos: Memo[];
    expenses: any[];
    expenseSplits: any[];
    currentUserId: string;
    isOwner: boolean;
}

export function TripDetailClient({
    trip,
    members,
    itineraryItems,
    todos,
    memos,
    expenses,
    expenseSplits,
    currentUserId,
    isOwner,
}: TripDetailClientProps) {
    const router = useRouter();
    const supabase = createClient();
    const [activeTab, setActiveTab] = useState("itinerary");
    const [mounted, setMounted] = useState(false);

    // Trip edit dialog
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [editLoading, setEditLoading] = useState(false);
    const [editForm, setEditForm] = useState({
        name: trip.name || "",
        description: trip.description || "",
        start_date: trip.start_date || "",
        end_date: trip.end_date || "",
        destinations: trip.destinations || [],
    });
    const [currentDestination, setCurrentDestination] = useState("");

    useEffect(() => {
        setMounted(true);
    }, []);

    // 現在のユーザーのメンバーレコードIDを特定
    const currentMemberId = members.find(m => m.user_id === currentUserId)?.id || "";

    if (!mounted) {
        return <div className="min-h-screen bg-white dark:bg-gray-950" />;
    }

    const addDestinationEdit = () => {
        const trimmed = currentDestination.trim();
        if (trimmed && !editForm.destinations.includes(trimmed)) {
            setEditForm({ ...editForm, destinations: [...editForm.destinations, trimmed] });
            setCurrentDestination("");
        }
    };

    const removeDestinationEdit = (index: number) => {
        setEditForm({ ...editForm, destinations: editForm.destinations.filter((_: string, i: number) => i !== index) });
    };

    const handleUpdateTrip = async () => {
        setEditLoading(true);
        const { error } = await supabase
            .from("trips")
            .update({
                name: editForm.name,
                description: editForm.description || null,
                start_date: editForm.start_date || null,
                end_date: editForm.end_date || null,
                destinations: editForm.destinations.length > 0 ? editForm.destinations : null,
            })
            .eq("id", trip.id);

        if (error) {
            toast.error("旅行の更新に失敗しました", { description: error.message });
        } else {
            toast.success("旅行を更新しました");
            setEditDialogOpen(false);
            router.refresh();
        }
        setEditLoading(false);
    };

    const handleDeleteTrip = async () => {
        setEditLoading(true);
        const { error } = await supabase.from("trips").delete().eq("id", trip.id);

        if (error) {
            toast.error("旅行の削除に失敗しました", { description: error.message });
        } else {
            toast.success("旅行を削除しました");
            router.push("/trips");
        }
        setEditLoading(false);
    };



    return (
        <div className="min-h-screen pb-20">
            {/* ヘッダー */}
            <header className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
                <div className="max-w-2xl mx-auto px-4 py-3">
                    <div className="flex items-center gap-4">
                        <Link href="/trips">
                            <Button variant="ghost" size="sm">
                                ← 戻る
                            </Button>
                        </Link>
                        <div className="flex-1">
                            <h1 className="text-lg font-semibold truncate">{trip.name}</h1>
                            {trip.destinations && trip.destinations.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                    {trip.destinations.slice(0, 3).map((dest: string, i: number) => (
                                        <span key={i} className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full text-xs">
                                            📍 {dest}
                                        </span>
                                    ))}
                                    {trip.destinations.length > 3 && (
                                        <span className="text-xs text-muted-foreground">+{trip.destinations.length - 3}</span>
                                    )}
                                </div>
                            )}
                        </div>
                        {/* 旅行の編集・削除メニュー */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
                                    <Edit2 className="h-4 w-4 mr-2" /> 編集
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    className="text-red-600 focus:text-red-600"
                                    onClick={() => setDeleteDialogOpen(true)}
                                >
                                    <Trash2 className="h-4 w-4 mr-2" /> 削除
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </header>

            {/* 日程表示 */}
            {trip.start_date && trip.end_date && (
                <div className="max-w-2xl mx-auto px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-800">
                    <div className="flex items-center gap-2 text-sm">
                        <span>📅</span>
                        <span className="font-medium">
                            {new Date(trip.start_date).toLocaleDateString("ja-JP", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                            })}
                        </span>
                        <span>〜</span>
                        <span className="font-medium">
                            {new Date(trip.end_date).toLocaleDateString("ja-JP", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                            })}
                        </span>
                    </div>
                </div>
            )}

            {/* タブナビゲーション */}
            <main className="max-w-2xl mx-auto">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0 h-auto overflow-x-auto">
                        <TabsTrigger
                            value="itinerary"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent px-4 py-3"
                        >
                            🗓️ 旅程
                        </TabsTrigger>
                        <TabsTrigger
                            value="expenses"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent px-4 py-3"
                        >
                            💰 費用
                        </TabsTrigger>
                        <TabsTrigger
                            value="todos"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent px-4 py-3"
                        >
                            📝 Todo & メモ
                        </TabsTrigger>
                        <TabsTrigger
                            value="members"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent px-4 py-3"
                        >
                            👥 メンバー
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="itinerary" className="px-4 py-4">
                        <ItineraryTab
                            tripId={trip.id}
                            items={itineraryItems}
                            members={members.map(m => ({
                                id: m.id,
                                user_id: m.user_id,
                                profiles: m.profiles,
                                display_name_override: m.display_name_override
                            }))}
                            currentMemberId={currentMemberId}
                            tripStartDate={trip.start_date}
                        />
                    </TabsContent>

                    <TabsContent value="expenses" className="px-4 py-4">
                        <ExpensesTab
                            tripId={trip.id}
                            expenses={expenses}
                            expenseSplits={expenseSplits}
                            members={members.map(m => ({
                                id: m.id,
                                user_id: m.user_id,
                                role: m.role,
                                display_name_override: m.display_name_override,
                                profiles: m.profiles
                            }))}
                            currentMemberId={currentMemberId}
                        />
                    </TabsContent>

                    <TabsContent value="todos" className="px-4 py-4">
                        <TodoTab
                            tripId={trip.id}
                            todos={todos}
                            memos={memos}
                            members={members.map(m => ({
                                id: m.id,
                                user_id: m.user_id,
                                role: m.role,
                                display_name_override: m.display_name_override,
                                profiles: m.profiles,
                                created_at: m.created_at || "",
                                trip_id: m.trip_id,
                                invite_token: m.invite_token,
                                joined_at: m.joined_at
                            }))}
                            currentMemberId={currentMemberId}
                        />
                    </TabsContent>

                    <TabsContent value="members" className="px-4 py-4">
                        <MembersTab
                            tripId={trip.id}
                            members={members}
                            inviteCode={trip.invite_code ?? ""}
                            isOwner={isOwner}
                        />
                    </TabsContent>
                </Tabs>
            </main>

            {/* 編集ダイアログ */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>旅行を編集</DialogTitle>
                        <DialogDescription>旅行の情報を更新します</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-name">旅行名 *</Label>
                            <Input
                                id="edit-name"
                                value={editForm.name}
                                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-description">説明</Label>
                            <Input
                                id="edit-description"
                                value={editForm.description}
                                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-start">開始日</Label>
                                <Input
                                    id="edit-start"
                                    type="date"
                                    value={editForm.start_date}
                                    onChange={(e) => setEditForm({ ...editForm, start_date: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-end">終了日</Label>
                                <Input
                                    id="edit-end"
                                    type="date"
                                    value={editForm.end_date}
                                    onChange={(e) => setEditForm({ ...editForm, end_date: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>目的地</Label>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="目的地を追加"
                                    value={currentDestination}
                                    onChange={(e) => setCurrentDestination(e.target.value)}
                                />
                                <Button type="button" variant="outline" onClick={addDestinationEdit}>
                                    追加
                                </Button>
                            </div>
                            {editForm.destinations.length > 0 && (
                                <div className="flex flex-wrap gap-2 pt-2">
                                    {editForm.destinations.map((dest: string, index: number) => (
                                        <div
                                            key={index}
                                            className="flex items-center gap-1 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-3 py-1.5 rounded-full text-sm"
                                        >
                                            <span>📍 {dest}</span>
                                            <button
                                                type="button"
                                                onClick={() => removeDestinationEdit(index)}
                                                className="hover:text-red-500"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                            キャンセル
                        </Button>
                        <Button onClick={handleUpdateTrip} disabled={editLoading || !editForm.name}>
                            {editLoading ? "更新中..." : "更新"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* 削除確認ダイアログ */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>旅行を削除</DialogTitle>
                        <DialogDescription>
                            本当に「{trip.name}」を削除しますか？
                            この操作は取り消せません。関連するすべてのデータ（旅程、費用、メンバーなど）も削除されます。
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                            キャンセル
                        </Button>
                        <Button variant="destructive" onClick={handleDeleteTrip} disabled={editLoading}>
                            {editLoading ? "削除中..." : "削除する"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
