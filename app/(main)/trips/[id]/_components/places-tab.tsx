"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { MoreHorizontal } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Database } from "@/lib/supabase/types";

type Place = Database["public"]["Tables"]["places"]["Row"];

interface PlacesTabProps {
    tripId: string;
    places: Place[];
}

const CATEGORIES = {
    sightseeing: { label: "観光", emoji: "🏛️" },
    food: { label: "食事", emoji: "🍽️" },
    shopping: { label: "ショッピング", emoji: "🛍️" },
    other: { label: "その他", emoji: "📌" },
};

export function PlacesTab({ tripId, places }: PlacesTabProps) {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [filter, setFilter] = useState<"all" | "tentative" | "confirmed">("all");
    const [loading, setLoading] = useState(false);
    const [editPlaceId, setEditPlaceId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        name: "",
        address: "",
        category: "sightseeing",
        notes: "",
    });
    const router = useRouter();
    const supabase = createClient();

    const handleEdit = (place: Place) => {
        setFormData({
            name: place.name || "",
            address: place.address || "",
            category: (place.category as any) || "sightseeing",
            notes: place.notes || "",
        });
        setEditPlaceId(place.id);
        setDialogOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("この場所を削除してもよろしいですか？")) return;
        setLoading(true);
        const { error } = await supabase.from("places").delete().eq("id", id);
        if (error) {
            toast.error("削除に失敗しました", { description: error.message });
        } else {
            toast.success("削除しました");
            router.refresh();
        }
        setLoading(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const { data: { user } } = await supabase.auth.getUser();

        const placeData = {
            trip_id: tripId,
            name: formData.name,
            address: formData.address || null,
            category: formData.category,
            notes: formData.notes || null,
            status: "tentative",
            created_by: user?.id || null,
        };

        const { error } = editPlaceId
            ? await supabase.from("places").update(placeData).eq("id", editPlaceId)
            : await supabase.from("places").insert(placeData);

        if (error) {
            toast.error(editPlaceId ? "更新に失敗しました" : "追加に失敗しました", { description: error.message });
        } else {
            toast.success(editPlaceId ? "場所を更新しました" : "場所を追加しました");
            setDialogOpen(false);
            setEditPlaceId(null);
            setFormData({ name: "", address: "", category: "sightseeing", notes: "" });
            router.refresh();
        }

        setLoading(false);
    };

    const handleConfirm = async (placeId: string) => {
        const { error } = await supabase
            .from("places")
            .update({ status: "confirmed" })
            .eq("id", placeId);

        if (error) {
            toast.error("更新に失敗しました");
        } else {
            toast.success("確定しました");
            router.refresh();
        }
    };

    const handleUnconfirm = async (placeId: string) => {
        const { error } = await supabase
            .from("places")
            .update({ status: "tentative" })
            .eq("id", placeId);

        if (error) {
            toast.error("更新に失敗しました");
        } else {
            toast.success("未確定に戻しました");
            router.refresh();
        }
    };

    const openInMaps = (address: string) => {
        const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
        window.open(url, "_blank");
    };

    const filteredPlaces = places.filter((place) => {
        if (filter === "all") return true;
        return place.status === filter;
    });

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
                <div className="flex gap-2">
                    <Button
                        variant={filter === "all" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFilter("all")}
                    >
                        すべて
                    </Button>
                    <Button
                        variant={filter === "tentative" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFilter("tentative")}
                    >
                        未確定
                    </Button>
                    <Button
                        variant={filter === "confirmed" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFilter("confirmed")}
                    >
                        確定
                    </Button>
                </div>
                <Dialog open={dialogOpen} onOpenChange={(val) => {
                    setDialogOpen(val);
                    if (!val) {
                        setEditPlaceId(null);
                        setFormData({ name: "", address: "", category: "sightseeing", notes: "" });
                    }
                }}>
                    <DialogTrigger asChild>
                        <Button
                            className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
                            onClick={() => {
                                setEditPlaceId(null);
                                setFormData({ name: "", address: "", category: "sightseeing", notes: "" });
                            }}
                        >
                            + 追加
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>{editPlaceId ? "行きたい場所を編集" : "行きたい場所を追加"}</DialogTitle>
                            <DialogDescription>
                                {editPlaceId ? "場所の情報を修正します" : "気になるスポットを登録しておきましょう"}
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">場所名 *</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="例: 首里城"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="address">住所・エリア</Label>
                                <Input
                                    id="address"
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    placeholder="例: 沖縄県那覇市首里金城町1-2"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>カテゴリ</Label>
                                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(CATEGORIES).map(([key, { label, emoji }]) => (
                                            <SelectItem key={key} value={key}>
                                                {emoji} {label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="notes">メモ</Label>
                                <Input
                                    id="notes"
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    placeholder="営業時間や予約情報など"
                                />
                            </div>
                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? (editPlaceId ? "更新中..." : "追加中...") : (editPlaceId ? "更新する" : "追加する")}
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {filteredPlaces.length === 0 ? (
                <Card className="border-dashed border-2">
                    <CardContent className="py-12 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                            <span className="text-3xl">📍</span>
                        </div>
                        <h3 className="text-lg font-medium mb-2">
                            {filter === "all" ? "場所がありません" : `${filter === "tentative" ? "未確定" : "確定"}の場所がありません`}
                        </h3>
                        <p className="text-muted-foreground">
                            行きたい場所を追加しましょう
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {filteredPlaces.map((place) => {
                        const categoryInfo = CATEGORIES[place.category as keyof typeof CATEGORIES] || CATEGORIES.other;
                        return (
                            <Card key={place.id} className="hover:shadow-md transition-shadow">
                                <CardContent className="p-4">
                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-xl">
                                            {categoryInfo.emoji}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2 mb-1">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <h4 className="font-medium truncate">{place.name}</h4>
                                                    <Badge
                                                        variant={place.status === "confirmed" ? "default" : "secondary"}
                                                        className="text-xs shrink-0"
                                                    >
                                                        {place.status === "confirmed" ? "確定" : "未確定"}
                                                    </Badge>
                                                </div>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => handleEdit(place)}>
                                                            ✏️ 編集
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            className="text-red-600 focus:text-red-600"
                                                            onClick={() => handleDelete(place.id)}
                                                        >
                                                            🗑️ 削除
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                            {place.address && (
                                                <p className="text-sm text-muted-foreground mb-1">📍 {place.address}</p>
                                            )}
                                            {place.notes && (
                                                <p className="text-sm text-muted-foreground">{place.notes}</p>
                                            )}
                                            <div className="flex gap-2 mt-3">
                                                {place.address && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => openInMaps(place.address!)}
                                                    >
                                                        🗺️ Mapsで開く
                                                    </Button>
                                                )}
                                                {place.status === "tentative" ? (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleConfirm(place.id)}
                                                    >
                                                        ✅ 確定する
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleUnconfirm(place.id)}
                                                    >
                                                        ↩️ 未確定に戻す
                                                    </Button>
                                                )}
                                            </div>
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
