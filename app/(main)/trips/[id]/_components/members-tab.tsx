"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
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

    const inviteLink = typeof window !== "undefined"
        ? `${window.location.origin}/join/${inviteCode}`
        : "";

    const copyInviteLink = async () => {
        setCopying(true);
        try {
            await navigator.clipboard.writeText(inviteLink);
            toast.success("招待リンクをコピーしました", {
                description: "LINEなどで友達にシェアしてください",
            });
        } catch {
            toast.error("コピーに失敗しました");
        }
        setCopying(false);
    };

    const shareToLine = () => {
        const text = `一緒に旅行の計画を立てよう！\n${inviteLink}`;
        const lineUrl = `https://line.me/R/share?text=${encodeURIComponent(text)}`;
        window.open(lineUrl, "_blank");
    };

    return (
        <div className="space-y-6">
            {/* 招待セクション */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">友達を招待</CardTitle>
                    <CardDescription>
                        招待リンクをシェアして、友達を旅行に招待しましょう
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-2">
                        <div className="flex-1 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm font-mono truncate">
                            {inviteLink}
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            className="flex-1"
                            onClick={copyInviteLink}
                            disabled={copying}
                        >
                            📋 コピー
                        </Button>
                        <Button
                            variant="outline"
                            className="flex-1 bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                            onClick={shareToLine}
                        >
                            💬 LINEでシェア
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
                    <div className="space-y-3">
                        {members.map((member) => (
                            <div key={member.id} className="flex items-center gap-3">
                                <Avatar>
                                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                                        {member.profiles?.display_name?.charAt(0) || "?"}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                    <p className="font-medium">{member.profiles?.display_name || "不明"}</p>
                                </div>
                                {member.role === "owner" && (
                                    <Badge variant="secondary" className="text-xs">
                                        オーナー
                                    </Badge>
                                )}
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
