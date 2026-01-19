import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { MoreHorizontal } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Database } from "@/lib/supabase/types";

type TripMember = Database["public"]["Tables"]["trip_members"]["Row"] & {
    profiles: { id: string; display_name: string } | null;
};

interface MembersTabProps {
    tripId: string;
    members: TripMember[];
    inviteCode: string;
    isOwner: boolean;
}

export function MembersTab({ tripId, members, inviteCode, isOwner }: MembersTabProps) {
    const [copying, setCopying] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [newName, setNewName] = useState("");
    const [editMemberId, setEditMemberId] = useState<string | null>(null);
    const router = useRouter();
    const supabase = createClient();

    const inviteLink = typeof window !== "undefined"
        ? `${window.location.origin}/join/${inviteCode}?openExternalBrowser=1`
        : "";

    const copyInviteLink = async (url: string = inviteLink) => {
        setCopying(true);
        try {
            await navigator.clipboard.writeText(url);
            toast.success("招待リンクをコピーしました");
        } catch {
            toast.error("コピーに失敗しました");
        }
        setCopying(false);
    };

    const handleAddMember = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim()) return;

        setLoading(true);

        const memberData = {
            trip_id: tripId,
            display_name_override: newName.trim(),
            role: "member",
        };

        const { error } = editMemberId
            ? await supabase.from("trip_members").update(memberData).eq("id", editMemberId)
            : await supabase.from("trip_members").insert(memberData);

        if (error) {
            toast.error(editMemberId ? "更新に失敗しました" : "追加に失敗しました", { description: error.message });
        } else {
            toast.success(editMemberId ? "更新しました" : `${newName}さんを追加しました`);
            setDialogOpen(false);
            setEditMemberId(null);
            setNewName("");
            router.refresh();
        }
        setLoading(false);
    };

    const handleDeleteMember = async (id: string, name: string) => {
        if (!confirm(`${name}さんを削除してもよろしいですか？（これまでの費用データも影響を受ける可能性があります）`)) return;
        setLoading(true);
        const { error } = await supabase.from("trip_members").delete().eq("id", id);
        if (error) {
            toast.error("削除に失敗しました", { description: error.message });
        } else {
            toast.success("削除しました");
            router.refresh();
        }
        setLoading(false);
    };

    const getIndividualInviteLink = (token: string | null) => {
        if (!token || typeof window === "undefined") return "";
        return `${window.location.origin}/join/${inviteCode}?token=${token}&openExternalBrowser=1`;
    };

    return (
        <div className="space-y-6">
            {/* 招待セクション */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <div>
                        <CardTitle className="text-base">メンバーを招待</CardTitle>
                        <CardDescription>
                            リンクをシェアして友達を招待しましょう
                        </CardDescription>
                    </div>
                    {/* メンバー手動追加ダイアログ */}
                    <Dialog open={dialogOpen} onOpenChange={(val) => {
                        setDialogOpen(val);
                        if (!val) {
                            setEditMemberId(null);
                            setNewName("");
                        }
                    }}>
                        <DialogTrigger asChild>
                            <Button size="sm" variant="outline" onClick={() => {
                                setEditMemberId(null);
                                setNewName("");
                            }}>
                                + 手動で追加
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{editMemberId ? "メンバーを編集" : "メンバーを手動で追加"}</DialogTitle>
                                <DialogDescription>
                                    {editMemberId ? "メンバーの情報を修正します" : "名前を入力してメンバーを追加します。後で個別招待リンクを送ることもできます。"}
                                </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleAddMember} className="space-y-4 pt-4">
                                <div className="space-y-2">
                                    <Label htmlFor="memberName">名前</Label>
                                    <Input
                                        id="memberName"
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        placeholder="例：田中太郎"
                                        required
                                    />
                                </div>
                                <Button type="submit" className="w-full" disabled={loading}>
                                    {loading ? (editMemberId ? "更新中..." : "追加中...") : (editMemberId ? "更新する" : "追加する")}
                                </Button>
                            </form>
                        </DialogContent>
                    </Dialog>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-2">
                        <div className="flex-1 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm font-mono truncate border">
                            {inviteLink}
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => copyInviteLink()}
                            disabled={copying}
                        >
                            📋 全体招待リンクをコピー
                        </Button>
                        <Button
                            variant="outline"
                            className="flex-1 bg-green-50 text-green-700 hover:bg-green-100 border-green-100"
                            onClick={() => {
                                const text = `TripMateで一緒に旅行の計画を立てよう！このリンクから参加してね。\n${inviteLink}`;
                                const lineUrl = `https://line.me/R/share?text=${encodeURIComponent(text)}`;
                                window.open(lineUrl, "_blank");
                            }}
                        >
                            💬 LINE
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* メンバー一覧 */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">メンバー ({members.length}人)</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {members.map((member) => {
                            const displayName = member.profiles?.display_name || member.display_name_override || "不明";
                            const isManual = !member.user_id;
                            const individualLink = getIndividualInviteLink(member.invite_token);

                            return (
                                <div key={member.id} className="flex flex-col gap-2 p-3 rounded-lg border bg-card text-card-foreground">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-8 w-8">
                                            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xs">
                                                {displayName.charAt(0)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium">{displayName}</span>
                                                {member.role === "owner" && (
                                                    <Badge variant="secondary" className="text-[10px] h-4">オーナー</Badge>
                                                )}
                                                {isManual && (
                                                    <Badge variant="outline" className="text-[10px] h-4 text-orange-500 border-orange-200 bg-orange-50">招待中</Badge>
                                                )}
                                            </div>
                                        </div>
                                        {/* メンバー編集・削除メニュー（オーナー以外のメンバーに対して） */}
                                        {member.role !== "owner" && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => {
                                                        setEditMemberId(member.id);
                                                        setNewName(member.display_name_override || "");
                                                        setDialogOpen(true);
                                                    }}>
                                                        ✏️ 編集
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        className="text-red-600 focus:text-red-600"
                                                        onClick={() => handleDeleteMember(member.id, displayName)}
                                                    >
                                                        🗑️ 削除
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}
                                    </div>
                                    {/* 個別招待リンク（手動追加メンバーのみ） */}
                                    {isManual && (
                                        <div className="flex gap-2 mt-1">
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                className="flex-1 text-[11px] h-7"
                                                onClick={() => copyInviteLink(individualLink)}
                                            >
                                                🔗 個別リンクをコピー
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="flex-1 text-[11px] h-7 bg-green-50 text-green-700 hover:bg-green-100 border-green-100"
                                                onClick={() => {
                                                    const text = `${displayName}さん、一緒に旅行の計画を立てよう！このリンクから参加してね。\n${individualLink}`;
                                                    const lineUrl = `https://line.me/R/share?text=${encodeURIComponent(text)}`;
                                                    window.open(lineUrl, "_blank");
                                                }}
                                            >
                                                💬 LINE
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
