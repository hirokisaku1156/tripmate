"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreVertical, Edit2, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface TripData {
    id: string;
    name: string;
    description: string | null;
    start_date: string | null;
    end_date: string | null;
    destinations: string[] | null;
    role: string;
}

interface TripListClientProps {
    trips: TripData[];
}

export function TripListClient({ trips }: TripListClientProps) {
    const router = useRouter();
    const supabase = createClient();
    const [showPastTrips, setShowPastTrips] = useState(true);

    // Edit/Delete state
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedTrip, setSelectedTrip] = useState<TripData | null>(null);
    const [editLoading, setEditLoading] = useState(false);
    const [editForm, setEditForm] = useState({
        name: "",
        description: "",
        start_date: "",
        end_date: "",
        destinations: [] as string[],
    });
    const [currentDestination, setCurrentDestination] = useState("");

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const isEnded = (trip: TripData) => {
        if (!trip.end_date) return false;
        return new Date(trip.end_date) < today;
    };

    const filteredTrips = showPastTrips
        ? trips
        : trips.filter(trip => !isEnded(trip));

    const pastTripsCount = trips.filter(isEnded).length;

    const openEditDialog = (trip: TripData, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setSelectedTrip(trip);
        setEditForm({
            name: trip.name,
            description: trip.description || "",
            start_date: trip.start_date || "",
            end_date: trip.end_date || "",
            destinations: trip.destinations || [],
        });
        setEditDialogOpen(true);
    };

    const openDeleteDialog = (trip: TripData, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setSelectedTrip(trip);
        setDeleteDialogOpen(true);
    };

    const addDestination = () => {
        const trimmed = currentDestination.trim();
        if (trimmed && !editForm.destinations.includes(trimmed)) {
            setEditForm({ ...editForm, destinations: [...editForm.destinations, trimmed] });
            setCurrentDestination("");
        }
    };

    const removeDestination = (index: number) => {
        setEditForm({ ...editForm, destinations: editForm.destinations.filter((_, i) => i !== index) });
    };

    const handleUpdateTrip = async () => {
        if (!selectedTrip) return;
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
            .eq("id", selectedTrip.id);

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
        if (!selectedTrip) return;
        setEditLoading(true);

        const { error } = await supabase.from("trips").delete().eq("id", selectedTrip.id);

        if (error) {
            toast.error("旅行の削除に失敗しました", { description: error.message });
        } else {
            toast.success("旅行を削除しました");
            setDeleteDialogOpen(false);
            router.refresh();
        }
        setEditLoading(false);
    };

    return (
        <>
            {/* フィルターコントロール - 常に表示 */}
            <div className="flex items-center justify-end gap-2 mb-4">
                <Switch
                    id="show-past"
                    checked={showPastTrips}
                    onCheckedChange={setShowPastTrips}
                />
                <Label htmlFor="show-past" className="text-sm text-muted-foreground cursor-pointer">
                    終了した旅行を表示 {pastTripsCount > 0 && `(${pastTripsCount})`}
                </Label>
            </div>

            {filteredTrips.length === 0 ? (
                <Card className="border-dashed border-2">
                    <CardContent className="py-12 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                            <span className="text-3xl">🌏</span>
                        </div>
                        <h3 className="text-lg font-medium mb-2">
                            {showPastTrips ? "旅行がありません" : "予定中の旅行がありません"}
                        </h3>
                        <p className="text-muted-foreground mb-4">
                            {showPastTrips
                                ? "新しい旅行を作成して、友達を招待しましょう"
                                : "終了した旅行を表示するか、新しい旅行を作成しましょう"}
                        </p>
                        <Link href="/trips/new">
                            <Button>旅行を作成する</Button>
                        </Link>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {filteredTrips.map((trip) => (
                        <div key={trip.id}>
                            <Link href={`/trips/${trip.id}`}>
                                <Card className={`hover:shadow-lg transition-all duration-200 cursor-pointer hover:border-blue-300 dark:hover:border-blue-700 ${isEnded(trip) ? "opacity-60" : ""}`}>
                                    <CardHeader className="pb-2">
                                        <div className="flex items-start justify-between gap-2">
                                            <CardTitle className="text-lg flex-1">{trip.name}</CardTitle>
                                            <div className="flex items-center gap-1 shrink-0">
                                                {isEnded(trip) && (
                                                    <Badge variant="outline" className="text-xs">
                                                        終了
                                                    </Badge>
                                                )}
                                                {trip.role === "owner" && (
                                                    <Badge variant="secondary" className="text-xs">
                                                        オーナー
                                                    </Badge>
                                                )}
                                                {/* 編集・削除メニュー */}
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7"
                                                            onClick={(e) => e.preventDefault()}
                                                        >
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={(e) => openEditDialog(trip, e as unknown as React.MouseEvent)}>
                                                            <Edit2 className="h-4 w-4 mr-2" /> 編集
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            className="text-red-600 focus:text-red-600"
                                                            onClick={(e) => openDeleteDialog(trip, e as unknown as React.MouseEvent)}
                                                        >
                                                            <Trash2 className="h-4 w-4 mr-2" /> 削除
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </div>
                                        {trip.description && (
                                            <CardDescription className="line-clamp-2">
                                                {trip.description}
                                            </CardDescription>
                                        )}
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                                            {trip.start_date && trip.end_date && (
                                                <div className="flex items-center gap-1">
                                                    <span>📅</span>
                                                    <span>
                                                        {new Date(trip.start_date).toLocaleDateString("ja-JP")} - {new Date(trip.end_date).toLocaleDateString("ja-JP")}
                                                    </span>
                                                </div>
                                            )}
                                            {trip.destinations && trip.destinations.length > 0 && (
                                                <div className="flex items-center gap-1 flex-wrap">
                                                    {trip.destinations.map((dest, i) => (
                                                        <span key={i} className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full text-xs">
                                                            📍 {dest}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        </div>
                    ))}
                </div>
            )}

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
                                <Button type="button" variant="outline" onClick={addDestination}>
                                    追加
                                </Button>
                            </div>
                            {editForm.destinations.length > 0 && (
                                <div className="flex flex-wrap gap-2 pt-2">
                                    {editForm.destinations.map((dest, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center gap-1 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-3 py-1.5 rounded-full text-sm"
                                        >
                                            <span>📍 {dest}</span>
                                            <button
                                                type="button"
                                                onClick={() => removeDestination(index)}
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
                            本当に「{selectedTrip?.name}」を削除しますか？
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
        </>
    );
}
