"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
    MoreHorizontal,
    Clock,
    MapPin,
    Notebook,
    ArrowRight,
    Plane,
    Hotel,
    Utensils,
    Compass,
    Map,
    Tag
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Database } from "@/lib/supabase/types";

type ItineraryItem = Database["public"]["Tables"]["itinerary_items"]["Row"];

interface ItineraryTabProps {
    tripId: string;
    items: ItineraryItem[];
    members: {
        id: string;
        user_id: string | null;
        display_name_override: string | null;
        profiles: { display_name: string } | null;
    }[];
    currentMemberId: string;
    tripStartDate: string | null;
}

const ITEM_TYPES = {
    flight: { label: "フライト", emoji: "✈️", category: "transport", icon: Plane },
    hotel: { label: "ホテル", emoji: "🏨", category: "accommodation", icon: Hotel },
    activity: { label: "アクティビティ", emoji: "🎯", category: "activity", icon: Compass },
    restaurant: { label: "レストラン", emoji: "🍽️", category: "food", icon: Utensils },
    other: { label: "その他", emoji: "📌", category: "other", icon: Tag },
};

export function ItineraryTab({ tripId, items, members, currentMemberId, tripStartDate }: ItineraryTabProps) {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [editItemId, setEditItemId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        type: "",
        title: "",
        date: tripStartDate ?? "",
        startTime: "",
        endTime: "",
        location: "",
        notes: "",
        // Price for auto-expense
        price: "",
        // Flight specific
        airline: "",
        flightNumber: "",
        departureAirport: "",
        arrivalAirport: "",
        departureTime: tripStartDate ? `${tripStartDate}T10:00` : "",
        arrivalTime: "",
        confirmationNumber: "",
        // Hotel specific
        checkInDate: tripStartDate ?? "",
        nights: "1",
        // Expense options
        autoRegisterExpense: false,
        paidBy: currentMemberId,
        splitMembers: members.map(m => m.id),
    });
    const router = useRouter();
    const supabase = createClient();

    const handleEdit = (item: ItineraryItem) => {
        let nights = "1";
        if (item.type === "hotel" && item.check_in_date && item.check_out_date) {
            const start = new Date(item.check_in_date);
            const end = new Date(item.check_out_date);
            const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
            nights = diff.toString();
        }

        setFormData({
            type: item.type || "",
            title: item.title || "",
            date: item.date || "",
            startTime: item.start_time ? new Date(item.start_time).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit", hour12: false }) : "",
            endTime: item.end_time ? new Date(item.end_time).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit", hour12: false }) : "",
            location: item.location || "",
            notes: item.notes || "",
            price: "", // 既存費用の編集は別途
            airline: item.airline || "",
            flightNumber: item.flight_number || "",
            departureAirport: item.departure_airport || "",
            arrivalAirport: item.arrival_airport || "",
            departureTime: item.departure_time ? new Date(item.departure_time).toISOString().slice(0, 16) : "",
            arrivalTime: item.arrival_time ? new Date(item.arrival_time).toISOString().slice(0, 16) : "",
            confirmationNumber: item.confirmation_number || "",
            checkInDate: item.check_in_date || "",
            nights: nights,
            autoRegisterExpense: false,
            paidBy: currentMemberId,
            splitMembers: members.map(m => m.id),
        });
        setEditItemId(item.id);
        setDialogOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("この旅程を削除してもよろしいですか？")) return;
        setLoading(true);
        const { error } = await supabase.from("itinerary_items").delete().eq("id", id);
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

        if (!formData.type) {
            toast.error("種類を選択してください");
            setLoading(false);
            return;
        }

        const insertData: Database["public"]["Tables"]["itinerary_items"]["Insert"] = {
            trip_id: tripId,
            type: formData.type,
            title: formData.title,
            date: formData.date || null,
            start_time: formData.startTime ? new Date(`${formData.date}T${formData.startTime}`).toISOString() : null,
            end_time: formData.endTime ? new Date(`${formData.date}T${formData.endTime}`).toISOString() : null,
            location: formData.location || null,
            notes: formData.notes || null,
            created_by: user?.id || null,
        };

        if (formData.type === "flight") {
            insertData.airline = formData.airline || null;
            insertData.flight_number = formData.flightNumber || null;
            insertData.departure_airport = formData.departureAirport || null;
            insertData.arrival_airport = formData.arrivalAirport || null;
            insertData.departure_time = formData.departureTime ? new Date(formData.departureTime).toISOString() : null;
            insertData.arrival_time = formData.arrivalTime ? new Date(formData.arrivalTime).toISOString() : null;
            insertData.confirmation_number = formData.confirmationNumber || null;
        }

        if (formData.type === "hotel") {
            insertData.check_in_date = formData.checkInDate || null;
            if (formData.checkInDate && formData.nights) {
                const checkIn = new Date(formData.checkInDate);
                checkIn.setDate(checkIn.getDate() + Number(formData.nights));
                insertData.check_out_date = checkIn.toISOString().split('T')[0];
            }
        }

        const { data: savedItem, error } = editItemId
            ? await supabase.from("itinerary_items").update(insertData).eq("id", editItemId).select().single()
            : await supabase.from("itinerary_items").insert(insertData).select().single();

        if (error) {
            toast.error(editItemId ? "更新に失敗しました" : "追加に失敗しました", { description: error.message });
        } else {
            // 金額が入力されており、かつ自動登録がONかつ新規作成の場合（編集時は複雑になるため一旦新規のみ）
            if (!editItemId && formData.price && Number(formData.price) > 0 && formData.autoRegisterExpense && user) {
                const typeInfo = ITEM_TYPES[formData.type as keyof typeof ITEM_TYPES];
                const { data: expense, error: expenseError } = await supabase
                    .from("expenses")
                    .insert({
                        trip_id: tripId,
                        amount: Number(formData.price),
                        currency: "JPY",
                        amount_jpy: Number(formData.price),
                        category: typeInfo.category,
                        description: formData.title,
                        paid_by: formData.paidBy,
                        date: formData.date || formData.checkInDate || formData.departureTime?.split("T")[0] || null,
                    })
                    .select()
                    .single();

                if (!expenseError && expense) {
                    // 選択されたメンバーを対象者として登録
                    const splits = formData.splitMembers.map((userId) => ({
                        expense_id: expense.id,
                        user_id: userId,
                    }));
                    if (splits.length > 0) {
                        await supabase.from("expense_splits").insert(splits);
                    }
                }
            }

            toast.success(editItemId ? "旅程を更新しました" : "旅程を追加しました");
            setDialogOpen(false);
            setEditItemId(null);
            setFormData({
                type: "",
                title: "",
                date: tripStartDate ?? "",
                startTime: "",
                endTime: "",
                location: "",
                notes: "",
                price: "",
                airline: "",
                flightNumber: "",
                departureAirport: "",
                arrivalAirport: "",
                departureTime: "",
                arrivalTime: "",
                confirmationNumber: "",
                checkInDate: "",
                nights: "1",
                autoRegisterExpense: false,
                paidBy: currentMemberId,
                splitMembers: members.map(m => m.id),
            });
            router.refresh();
        }

        setLoading(false);
    };

    // 日付でグループ化
    const groupedItems = items.reduce((acc, item) => {
        const date = item.date || "未定";
        if (!acc[date]) {
            acc[date] = [];
        }
        acc[date].push(item);
        return acc;
    }, {} as Record<string, ItineraryItem[]>);

    // 各日付内で時間をソート
    Object.keys(groupedItems).forEach((date) => {
        groupedItems[date].sort((a, b) => {
            const timeA = a.type === "flight" ? a.departure_time : (a.start_time || "");
            const timeB = b.type === "flight" ? b.departure_time : (b.start_time || "");
            if (!timeA && !timeB) return 0;
            if (!timeA) return 1;
            if (!timeB) return -1;
            return timeA.localeCompare(timeB);
        });
    });

    const sortedDates = Object.keys(groupedItems).sort();

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Dialog open={dialogOpen} onOpenChange={(val) => {
                    setDialogOpen(val);
                    if (!val) setEditItemId(null);
                }}>
                    <DialogTrigger asChild>
                        <Button
                            className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
                            onClick={() => {
                                setEditItemId(null);
                                setFormData({
                                    type: "",
                                    title: "",
                                    date: tripStartDate ?? "",
                                    startTime: "",
                                    endTime: "",
                                    location: "",
                                    notes: "",
                                    price: "",
                                    airline: "",
                                    flightNumber: "",
                                    departureAirport: "",
                                    arrivalAirport: "",
                                    departureTime: tripStartDate ? `${tripStartDate}T10:00` : "",
                                    arrivalTime: "",
                                    confirmationNumber: "",
                                    checkInDate: tripStartDate ?? "",
                                    nights: "1",
                                    autoRegisterExpense: false,
                                    paidBy: currentMemberId,
                                    splitMembers: members.map(m => m.id),
                                });
                            }}
                        >
                            + 旅程を追加
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>{editItemId ? "旅程を編集" : "旅程を追加"}</DialogTitle>
                            <DialogDescription>
                                {editItemId ? "旅程の内容を修正します" : "フライト、ホテル、アクティビティなどを追加"}
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label>種類</Label>
                                <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="種類を選択してください" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(ITEM_TYPES).map(([key, { label, emoji }]) => (
                                            <SelectItem key={key} value={key}>
                                                {emoji} {label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="title">タイトル *</Label>
                                <Input
                                    id="title"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    placeholder={formData.type === "flight" ? "羽田 → ホノルル" : "例: 首里城観光"}
                                    required
                                />
                            </div>

                            {/* Flight specific fields */}
                            {formData.type === "flight" && (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="airline">航空会社</Label>
                                            <Input
                                                id="airline"
                                                value={formData.airline}
                                                onChange={(e) => setFormData({ ...formData, airline: e.target.value })}
                                                placeholder="JAL"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="flightNumber">便名</Label>
                                            <Input
                                                id="flightNumber"
                                                value={formData.flightNumber}
                                                onChange={(e) => setFormData({ ...formData, flightNumber: e.target.value })}
                                                placeholder="JL784"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="departureAirport">出発空港</Label>
                                            <Input
                                                id="departureAirport"
                                                value={formData.departureAirport}
                                                onChange={(e) => setFormData({ ...formData, departureAirport: e.target.value })}
                                                placeholder="HND"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="arrivalAirport">到着空港</Label>
                                            <Input
                                                id="arrivalAirport"
                                                value={formData.arrivalAirport}
                                                onChange={(e) => setFormData({ ...formData, arrivalAirport: e.target.value })}
                                                placeholder="HNL"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="departureTime">出発日時</Label>
                                            <Input
                                                id="departureTime"
                                                type="datetime-local"
                                                value={formData.departureTime}
                                                onChange={(e) => setFormData({ ...formData, departureTime: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="arrivalTime">到着日時</Label>
                                            <Input
                                                id="arrivalTime"
                                                type="datetime-local"
                                                value={formData.arrivalTime}
                                                onChange={(e) => setFormData({ ...formData, arrivalTime: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="confirmationNumber">予約番号</Label>
                                        <Input
                                            id="confirmationNumber"
                                            value={formData.confirmationNumber}
                                            onChange={(e) => setFormData({ ...formData, confirmationNumber: e.target.value })}
                                        />
                                    </div>
                                </>
                            )}

                            {/* Hotel specific fields */}
                            {formData.type === "hotel" && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="checkInDate">チェックイン</Label>
                                        <Input
                                            id="checkInDate"
                                            type="date"
                                            value={formData.checkInDate}
                                            onChange={(e) => setFormData({ ...formData, checkInDate: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="nights">宿泊数</Label>
                                        <Select
                                            value={formData.nights}
                                            onValueChange={(v) => setFormData({ ...formData, nights: v })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 14, 30].map((n) => (
                                                    <SelectItem key={n} value={n.toString()}>
                                                        {n}泊
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            )}

                            {/* Common fields: FlightとHotel以外で日付を表示 */}
                            {formData.type !== "flight" && formData.type !== "hotel" && (
                                <>
                                    <div className="space-y-2">
                                        <Label htmlFor="date">日付</Label>
                                        <Input
                                            id="date"
                                            type="date"
                                            value={formData.date}
                                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="startTime">開始時刻</Label>
                                            <Input
                                                id="startTime"
                                                type="time"
                                                value={formData.startTime}
                                                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="endTime">終了時刻</Label>
                                            <Input
                                                id="endTime"
                                                type="time"
                                                value={formData.endTime}
                                                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="location">場所</Label>
                                <Input
                                    id="location"
                                    value={formData.location}
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                    placeholder="住所や場所名"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="notes">メモ</Label>
                                <Input
                                    id="notes"
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    placeholder="備考など"
                                />
                            </div>

                            <div className="space-y-4 border rounded-lg p-4 bg-gray-50 dark:bg-gray-900/50">
                                <div className="space-y-2">
                                    <Label htmlFor="price">金額（円）</Label>
                                    <Input
                                        id="price"
                                        type="number"
                                        value={formData.price}
                                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                        placeholder="0"
                                    />
                                </div>

                                <div className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        id="autoRegisterExpense"
                                        checked={formData.autoRegisterExpense}
                                        onChange={(e) => setFormData({ ...formData, autoRegisterExpense: e.target.checked })}
                                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <Label htmlFor="autoRegisterExpense" className="cursor-pointer font-normal">
                                        費用としても登録する
                                    </Label>
                                </div>

                                {formData.autoRegisterExpense && (
                                    <div className="space-y-4 pl-6 border-l-2 border-gray-200 dark:border-gray-700 ml-2">
                                        <div className="space-y-2">
                                            <Label>支払った人</Label>
                                            <Select
                                                value={formData.paidBy}
                                                onValueChange={(v) => setFormData({ ...formData, paidBy: v })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {members.map((member) => (
                                                        <SelectItem key={member.id} value={member.id}>
                                                            {member.profiles?.display_name || member.display_name_override || "不明なユーザー"}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2">
                                            <Label>割り勘対象</Label>
                                            <div className="space-y-2">
                                                {members.map((member) => (
                                                    <div key={member.id} className="flex items-center space-x-2">
                                                        <input
                                                            type="checkbox"
                                                            id={`split-${member.id}`}
                                                            checked={formData.splitMembers.includes(member.id)}
                                                            onChange={(e) => {
                                                                const checked = e.target.checked;
                                                                setFormData(prev => ({
                                                                    ...prev,
                                                                    splitMembers: checked
                                                                        ? [...prev.splitMembers, member.id]
                                                                        : prev.splitMembers.filter(id => id !== member.id)
                                                                }));
                                                            }}
                                                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                        />
                                                        <Label
                                                            htmlFor={`split-${member.id}`}
                                                            className="cursor-pointer font-normal"
                                                        >
                                                            {member.profiles?.display_name || member.display_name_override || "不明なユーザー"}
                                                        </Label>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? (editItemId ? "更新中..." : "追加中...") : (editItemId ? "更新する" : "追加する")}
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {items.length === 0 ? (
                <Card className="border-dashed border-2">
                    <CardContent className="py-12 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                            <span className="text-3xl">🗓️</span>
                        </div>
                        <h3 className="text-lg font-medium mb-2">旅程がありません</h3>
                        <p className="text-muted-foreground">
                            フライトやホテル、観光地を追加しましょう
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-8 relative before:absolute before:inset-0 before:left-4 before:h-full before:w-0.5 before:bg-muted before:z-0">
                    {sortedDates.map((date) => (
                        <div key={date} className="relative z-10">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white shrink-0 z-20 shadow-md">
                                    <Clock className="h-4 w-4" />
                                </div>
                                <h3 className="text-lg font-bold">
                                    {date === "未定"
                                        ? "📅 日付未定"
                                        : `${new Date(date).toLocaleDateString("ja-JP", {
                                            month: "long",
                                            day: "numeric",
                                            weekday: "short",
                                        })}`}
                                </h3>
                            </div>
                            <div className="space-y-6 ml-10">
                                {groupedItems[date].map((item) => {
                                    const typeInfo = ITEM_TYPES[item.type as keyof typeof ITEM_TYPES] || ITEM_TYPES.other;
                                    const Icon = typeInfo.icon;

                                    const displayTime = item.type === "flight"
                                        ? (item.departure_time ? new Date(item.departure_time).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" }) : null)
                                        : (item.start_time ? new Date(item.start_time).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" }) : null);

                                    const displayEndTime = item.type === "flight"
                                        ? (item.arrival_time ? new Date(item.arrival_time).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" }) : null)
                                        : (item.end_time ? new Date(item.end_time).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" }) : null);

                                    return (
                                        <Card key={item.id} className="relative transition-all hover:shadow-lg border-l-4 border-l-blue-500 overflow-hidden">
                                            <CardContent className="p-0">
                                                <div className="p-4 sm:p-5">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="flex-1 min-w-0">
                                                            {/* Time: Visible and prominent as requested */}
                                                            {displayTime && (
                                                                <div className="flex items-center gap-1.5 text-blue-600 font-bold text-sm mb-2 px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 rounded-full w-fit">
                                                                    <Clock className="h-3.5 w-3.5" />
                                                                    <span>{displayTime}</span>
                                                                    {displayEndTime && (
                                                                        <>
                                                                            <ArrowRight className="h-3 w-3 mx-0.5" />
                                                                            <span>{displayEndTime}</span>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            )}

                                                            <div className="flex items-center gap-3 mb-2">
                                                                <div className="w-10 h-10 rounded-xl bg-muted shrink-0 flex items-center justify-center text-2xl">
                                                                    {typeInfo.emoji}
                                                                </div>
                                                                <h4 className="text-xl font-bold truncate leading-tight">{item.title}</h4>
                                                            </div>

                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 mt-4 text-sm">
                                                                {item.location && (
                                                                    <div className="flex items-center gap-2 text-muted-foreground mr-4">
                                                                        <MapPin className="h-4 w-4 shrink-0 text-blue-500" />
                                                                        <span className="truncate">{item.location}</span>
                                                                    </div>
                                                                )}

                                                                {item.type === "flight" && item.flight_number && (
                                                                    <div className="flex items-center gap-2 text-muted-foreground">
                                                                        <Plane className="h-4 w-4 shrink-0 text-blue-500" />
                                                                        <span>{item.airline} {item.flight_number}</span>
                                                                    </div>
                                                                )}

                                                                {item.type === "hotel" && item.check_in_date && (
                                                                    <div className="flex items-center gap-2 text-muted-foreground">
                                                                        <Hotel className="h-4 w-4 shrink-0 text-blue-500" />
                                                                        <span>
                                                                            {new Date(item.check_in_date).toLocaleDateString("ja-JP")} 〜{" "}
                                                                            {item.check_out_date && new Date(item.check_out_date).toLocaleDateString("ja-JP")}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {item.notes && (
                                                                <div className="mt-4 p-3 rounded-lg bg-orange-50/50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/30 flex gap-2">
                                                                    <Notebook className="h-4 w-4 shrink-0 text-orange-500 mt-0.5" />
                                                                    <p className="text-sm text-orange-800 dark:text-orange-200">{item.notes}</p>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Actions: Less noticed but available */}
                                                        <div className="shrink-0 flex flex-col items-end gap-2">
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                                                                        <MoreHorizontal className="h-4 w-4" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end">
                                                                    <DropdownMenuItem onClick={() => handleEdit(item)}>
                                                                        ✏️ 編集
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem
                                                                        className="text-red-600 focus:text-red-600"
                                                                        onClick={() => handleDelete(item.id)}
                                                                    >
                                                                        🗑️ 削除
                                                                    </DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>

                                                            <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-wider rounded-lg px-2">
                                                                {typeInfo.label}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
