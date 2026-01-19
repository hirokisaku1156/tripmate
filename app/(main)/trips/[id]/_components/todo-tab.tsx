"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { MoreHorizontal, Plus, CheckCircle2, Circle, StickyNote, Trash2, Edit2, User } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Database } from "@/lib/supabase/types";
// import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type Todo = Database["public"]["Tables"]["trip_todos"]["Row"];
type Memo = Database["public"]["Tables"]["trip_memos"]["Row"];
type TripMember = Database["public"]["Tables"]["trip_members"]["Row"] & {
    profiles: { id: string; display_name: string } | null;
};

interface TodoTabProps {
    tripId: string;
    todos: Todo[];
    memos: Memo[];
    members: TripMember[];
    currentMemberId: string;
}

export function TodoTab({ tripId, todos, memos, members, currentMemberId }: TodoTabProps) {
    const [activeTab, setActiveTab] = useState("todos");
    const [todoDialogOpen, setTodoDialogOpen] = useState(false);
    const [memoDialogOpen, setMemoDialogOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    // Edit states
    const [editTodoId, setEditTodoId] = useState<string | null>(null);
    const [editMemoId, setEditMemoId] = useState<string | null>(null);

    // Forms
    const [todoForm, setTodoForm] = useState<{
        title: string;
        assignedTo: string[];
    }>({
        title: "",
        assignedTo: [],
    });
    const [memoForm, setMemoForm] = useState({
        title: "",
        content: "",
    });

    const router = useRouter();
    const supabase = createClient();

    // --- Todo Actions ---

    const handleOpenTodoDialog = (todo?: Todo) => {
        if (todo) {
            setEditTodoId(todo.id);
            setTodoForm({
                title: todo.title,
                assignedTo: todo.assigned_to || [],
            });
        } else {
            setEditTodoId(null);
            setTodoForm({ title: "", assignedTo: [] });
        }
        setTodoDialogOpen(true);
    };

    const handleSubmitTodo = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return; // Should allow if currentMember exists? user.id is needed for created_by

        const payload = {
            trip_id: tripId,
            title: todoForm.title,
            assigned_to: todoForm.assignedTo,
            created_by: editTodoId ? undefined : user?.id,
        };

        const { error } = editTodoId
            ? await supabase.from("trip_todos").update({
                title: payload.title,
                assigned_to: payload.assigned_to
            }).eq("id", editTodoId)
            : await supabase.from("trip_todos").insert(payload);

        if (error) {
            toast.error("Todoの保存に失敗しました", { description: error.message });
        } else {
            toast.success(editTodoId ? "Todoを更新しました" : "Todoを追加しました");
            setTodoDialogOpen(false);
            router.refresh();
        }
        setLoading(false);
    };

    const handleToggleTodo = async (todo: Todo) => {
        // 担当者がいない場合は、従来の全体完了フラグをトグル
        if (!todo.assigned_to || todo.assigned_to.length === 0) {
            const { error } = await supabase
                .from("trip_todos")
                .update({ is_completed: !todo.is_completed })
                .eq("id", todo.id);

            if (error) toast.error("更新に失敗しました");
            else router.refresh();
            return;
        }

        // 担当者がいる場合: 「全員完了」と「全員未完了」をトグルする
        // 全員が完了済みかどうかチェック
        const currentCompletedBy = todo.completed_by || [];
        const isAllCompleted = todo.assigned_to.every(id => currentCompletedBy.includes(id));

        let newCompletedBy: string[];
        if (isAllCompleted) {
            // 全員完了済み -> 全員未完了にする（担当者分を削除）
            newCompletedBy = currentCompletedBy.filter(id => !todo.assigned_to?.includes(id));
        } else {
            // 未完了または一部完了 -> 全員完了にする（足りない担当者を追加）
            const missing = todo.assigned_to.filter(id => !currentCompletedBy.includes(id));
            newCompletedBy = [...currentCompletedBy, ...missing];
        }

        const { error } = await supabase
            .from("trip_todos")
            .update({
                completed_by: newCompletedBy,
                is_completed: !isAllCompleted // all completed -> false, not all -> true (compete all)
            })
            .eq("id", todo.id);

        if (error) {
            toast.error("更新に失敗しました");
        } else {
            router.refresh();
        }
    };

    const handleToggleAssignment = async (todo: Todo, memberId: string) => {
        const currentCompletedBy = todo.completed_by || [];
        let newCompletedBy: string[];

        if (currentCompletedBy.includes(memberId)) {
            newCompletedBy = currentCompletedBy.filter(id => id !== memberId);
        } else {
            newCompletedBy = [...currentCompletedBy, memberId];
        }

        const isAllCompleted = todo.assigned_to && todo.assigned_to.length > 0 &&
            todo.assigned_to.every(id => newCompletedBy.includes(id));

        const { error } = await supabase
            .from("trip_todos")
            .update({
                completed_by: newCompletedBy,
                is_completed: isAllCompleted // 全員完了したらメインフラグも終わらせる（オプション）
            })
            .eq("id", todo.id);

        if (error) {
            toast.error("更新に失敗しました");
        } else {
            router.refresh();
        }
    };

    const handleDeleteTodo = async (id: string) => {
        if (!confirm("削除してもよろしいですか？")) return;
        const { error } = await supabase.from("trip_todos").delete().eq("id", id);
        if (error) toast.error("削除に失敗しました");
        else {
            toast.success("削除しました");
            router.refresh();
        }
    };

    // --- Memo Actions ---

    const handleOpenMemoDialog = (memo?: Memo) => {
        if (memo) {
            setEditMemoId(memo.id);
            setMemoForm({
                title: memo.title,
                content: memo.content || "",
            });
        } else {
            setEditMemoId(null);
            setMemoForm({ title: "", content: "" });
        }
        setMemoDialogOpen(true);
    };

    const handleSubmitMemo = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const { data: { user } } = await supabase.auth.getUser();

        const payload = {
            trip_id: tripId,
            title: memoForm.title,
            content: memoForm.content,
            created_by: editMemoId ? undefined : user?.id,
        };

        const { error } = editMemoId
            ? await supabase.from("trip_memos").update(payload).eq("id", editMemoId)
            : await supabase.from("trip_memos").insert(payload);

        if (error) {
            toast.error("メモの保存に失敗しました", { description: error.message });
        } else {
            toast.success(editMemoId ? "メモを更新しました" : "メモを追加しました");
            setMemoDialogOpen(false);
            router.refresh();
        }
        setLoading(false);
    };

    const handleDeleteMemo = async (id: string) => {
        if (!confirm("削除してもよろしいですか？")) return;
        const { error } = await supabase.from("trip_memos").delete().eq("id", id);
        if (error) toast.error("削除に失敗しました");
        else {
            toast.success("削除しました");
            router.refresh();
        }
    };

    // Helpers
    const getAssigneeNames = (memberIds: string[] | null) => {
        if (!memberIds || memberIds.length === 0) return null;
        return memberIds.map(id => {
            const member = members.find(m => m.id === id);
            return member?.profiles?.display_name || member?.display_name_override || "不明なユーザー";
        }).join(", ");
    };

    return (
        <div className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="flex items-center justify-between mb-4">
                    <TabsList className="grid w-[200px] grid-cols-2">
                        <TabsTrigger value="todos">Todo</TabsTrigger>
                        <TabsTrigger value="memos">メモ</TabsTrigger>
                    </TabsList>

                    <Button
                        size="sm"
                        onClick={() => activeTab === "todos" ? handleOpenTodoDialog() : handleOpenMemoDialog()}
                        className="bg-blue-600 hover:bg-blue-700 text-white gap-1"
                    >
                        <Plus className="h-4 w-4" />
                        {activeTab === "todos" ? "Todo追加" : "メモ追加"}
                    </Button>
                </div>

                {/* TODO LIST */}
                <TabsContent value="todos" className="space-y-4">
                    {todos.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-lg border border-dashed text-muted-foreground">
                            <CheckCircle2 className="h-10 w-10 mx-auto mb-3 opacity-20" />
                            <p>まだTodoがありません</p>
                            <Button variant="link" onClick={() => handleOpenTodoDialog()}>
                                最初の一つを追加する
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {todos.map(todo => (
                                <div
                                    key={todo.id}
                                    className={`
                                        group flex items-center gap-3 p-3 rounded-lg border transition-all
                                        ${todo.is_completed
                                            ? "bg-gray-50 dark:bg-gray-900/50 border-gray-100 dark:border-gray-800 opacity-70"
                                            : "bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md"
                                        }
                                    `}
                                >
                                    <button
                                        onClick={() => handleToggleTodo(todo)}
                                        className={`shrink-0 transition-colors ${todo.is_completed ? "text-green-500" : "text-gray-300 hover:text-gray-400"}`}
                                    >
                                        {todo.is_completed ? (
                                            <CheckCircle2 className="h-6 w-6" />
                                        ) : (
                                            <Circle className="h-6 w-6" />
                                        )}
                                    </button>

                                    <div className="flex-1 min-w-0">
                                        <div className={`font-medium ${todo.is_completed ? "line-through text-muted-foreground" : ""}`}>
                                            {todo.title}
                                        </div>
                                        {todo.assigned_to && (
                                            <div className="mt-2 space-y-1">
                                                {todo.assigned_to.map(assigneeId => {
                                                    const isCompleted = todo.completed_by?.includes(assigneeId);
                                                    const member = members.find(m => m.id === assigneeId);
                                                    return (
                                                        <div
                                                            key={assigneeId}
                                                            className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 p-1 rounded -ml-1"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleToggleAssignment(todo, assigneeId);
                                                            }}
                                                        >
                                                            <div className={`
                                                                w-4 h-4 rounded-full border flex items-center justify-center transition-colors
                                                                ${isCompleted
                                                                    ? "bg-green-500 border-green-500 text-white"
                                                                    : "border-gray-300 dark:border-gray-600"
                                                                }
                                                            `}>
                                                                {isCompleted && <CheckCircle2 className="h-3 w-3" />}
                                                            </div>
                                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                                <User className="h-3 w-3" />
                                                                <span className={isCompleted ? "line-through opacity-50" : ""}>
                                                                    {member?.profiles?.display_name || member?.display_name_override || "メンバー"}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleOpenTodoDialog(todo)}>
                                                    <Edit2 className="h-3.5 w-3.5 mr-2" /> 編集
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    className="text-red-600 focus:text-red-600"
                                                    onClick={() => handleDeleteTodo(todo.id)}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5 mr-2" /> 削除
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </TabsContent>

                {/* MEMO LIST */}
                <TabsContent value="memos" className="space-y-4">
                    {memos.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-lg border border-dashed text-muted-foreground">
                            <StickyNote className="h-10 w-10 mx-auto mb-3 opacity-20" />
                            <p>まだメモがありません</p>
                            <Button variant="link" onClick={() => handleOpenMemoDialog()}>
                                メモを追加する
                            </Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {memos.map(memo => (
                                <Card key={memo.id} className="group relative hover:shadow-md transition-shadow">
                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full bg-white/50 dark:bg-black/50 backdrop-blur-sm">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleOpenMemoDialog(memo)}>
                                                    <Edit2 className="h-3.5 w-3.5 mr-2" /> 編集
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    className="text-red-600 focus:text-red-600"
                                                    onClick={() => handleDeleteMemo(memo.id)}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5 mr-2" /> 削除
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                    <CardHeader className="p-4 pb-2">
                                        <CardTitle className="text-base leading-tight pr-6">{memo.title}</CardTitle>
                                        <CardDescription className="text-xs">
                                            {new Date(memo.created_at).toLocaleDateString("ja-JP")}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-4 pt-2">
                                        <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-4">
                                            {memo.content}
                                        </p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            {/* Todo Dialog */}
            <Dialog open={todoDialogOpen} onOpenChange={setTodoDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editTodoId ? "Todoを編集" : "新しいTodo"}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmitTodo} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="todo-title">やること</Label>
                            <Input
                                id="todo-title"
                                value={todoForm.title}
                                onChange={e => setTodoForm({ ...todoForm, title: e.target.value })}
                                placeholder="例: パスポートの再発行"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>担当者（複数選択可）</Label>
                            <div className="border rounded-md p-4 space-y-3 max-h-[200px] overflow-y-auto">
                                {members.map(member => (
                                    <div key={member.id} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`member-${member.id}`}
                                            checked={todoForm.assignedTo.includes(member.id)}
                                            onCheckedChange={(checked) => {
                                                if (checked) {
                                                    setTodoForm({
                                                        ...todoForm,
                                                        assignedTo: [...todoForm.assignedTo, member.id]
                                                    });
                                                } else {
                                                    setTodoForm({
                                                        ...todoForm,
                                                        assignedTo: todoForm.assignedTo.filter(id => id !== member.id)
                                                    });
                                                }
                                            }}
                                        />
                                        <label
                                            htmlFor={`member-${member.id}`}
                                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                        >
                                            {member.profiles?.display_name || member.display_name_override || "メンバー"}
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setTodoDialogOpen(false)}>キャンセル</Button>
                            <Button type="submit" disabled={loading}>{editTodoId ? "更新" : "追加"}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Memo Dialog */}
            <Dialog open={memoDialogOpen} onOpenChange={setMemoDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editMemoId ? "メモを編集" : "新しいメモ"}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmitMemo} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="memo-title">タイトル</Label>
                            <Input
                                id="memo-title"
                                value={memoForm.title}
                                onChange={e => setMemoForm({ ...memoForm, title: e.target.value })}
                                placeholder="例: 持って行くものリスト"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="memo-content">内容</Label>
                            <Textarea
                                id="memo-content"
                                value={memoForm.content}
                                onChange={e => setMemoForm({ ...memoForm, content: e.target.value })}
                                placeholder="詳細な内容..."
                                className="min-h-[100px]"
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setMemoDialogOpen(false)}>キャンセル</Button>
                            <Button type="submit" disabled={loading}>{editMemoId ? "更新" : "追加"}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
