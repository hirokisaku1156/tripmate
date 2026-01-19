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
import type { Database } from "@/lib/supabase/types";

type ItineraryItem = Database["public"]["Tables"]["itinerary_items"]["Row"];

interface ItineraryTabProps {
    tripId: string;
    items: ItineraryItem[];
    members: {
        user_id: string;
        profiles: { display_name: string } | null;
    }[];
    currentUserId: string;
}

const ITEM_TYPES = {
    flight: { label: "フライト", emoji: "✈️", category: "transport" },
    hotel: { label: "ホテル", emoji: "🏨", category: "accommodation" },
    activity: { label: "アクティビティ", emoji: "🎯", category: "activity" },
    restaurant: { label: "レストラン", emoji: "🍽️", category: "food" },
    other: { label: "その他", emoji: "📌", category: "other" },
};

export function ItineraryTab({ tripId, items, members, currentUserId }: ItineraryTabProps) {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        type: "activity",
        title: "",
        date: "",
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
        departureTime: "",
        arrivalTime: "",
        confirmationNumber: "",
        // Hotel specific
        checkInDate: "",
        checkOutDate: "",
    });
    const router = useRouter();
    const supabase = createClient();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const { data: { user } } = await supabase.auth.getUser();

        const insertData: Database["public"]["Tables"]["itinerary_items"]["Insert"] = {
            trip_id: tripId,
            type: formData.type,
            title: formData.title,
            date: formData.date || null,
            start_time: formData.startTime ? `${formData.date}T${formData.startTime}` : null,
            end_time: formData.endTime ? `${formData.date}T${formData.endTime}` : null,
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
            insertData.check_out_date = formData.checkOutDate || null;
        }

        const { error } = await supabase.from("itinerary_items").insert(insertData);

        if (error) {
            toast.error("追加に失敗しました", { description: error.message });
        } else {
            // 金額が入力されていたら費用も自動登録
            if (formData.price && Number(formData.price) > 0 && user) {
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
                        paid_by: currentUserId,
                        date: formData.date || formData.checkInDate || formData.departureTime?.split("T")[0] || null,
                    })
                    .select()
                    .single();

                if (!expenseError && expense) {
                    // 全メンバーを対象者として登録
                    const splits = members.map((m) => ({
                        expense_id: expense.id,
                        user_id: m.user_id,
                    }));
                    await supabase.from("expense_splits").insert(splits);
                }
            }

            toast.success("旅程を追加しました");
            setDialogOpen(false);
            setFormData({
                type: "activity",
                title: "",
                date: "",
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
                checkOutDate: "",
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

    const sortedDates = Object.keys(groupedItems).sort();

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700">
                            + 旅程を追加
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>旅程を追加</DialogTitle>
                            <DialogDescription>
                                フライト、ホテル、アクティビティなどを追加
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label>種類</Label>
                                <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                                    <SelectTrigger>
                                        <SelectValue />
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
                                        <Label htmlFor="checkOutDate">チェックアウト</Label>
                                        <Input
                                            id="checkOutDate"
                                            type="date"
                                            value={formData.checkOutDate}
                                            onChange={(e) => setFormData({ ...formData, checkOutDate: e.target.value })}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Common fields */}
                            {formData.type !== "flight" && (
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

                            <div className="space-y-2">
                                <Label htmlFor="price">金額（円）- 費用に自動登録</Label>
                                <Input
                                    id="price"
                                    type="number"
                                    value={formData.price}
                                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                    placeholder="入力すると費用タブにも登録されます"
                                />
                            </div>

                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? "追加中..." : "追加する"}
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
                <div className="space-y-6">
                    {sortedDates.map((date) => (
                        <div key={date}>
                            <h3 className="text-sm font-semibold text-muted-foreground mb-3 sticky top-0 bg-gray-50 dark:bg-gray-900 py-2">
                                {date === "未定"
                                    ? "📅 日付未定"
                                    : `📅 ${new Date(date).toLocaleDateString("ja-JP", {
                                        month: "long",
                                        day: "numeric",
                                        weekday: "short",
                                    })}`}
                            </h3>
                            <div className="space-y-3">
                                {groupedItems[date].map((item) => {
                                    const typeInfo = ITEM_TYPES[item.type as keyof typeof ITEM_TYPES] || ITEM_TYPES.other;
                                    return (
                                        <Card key={item.id} className="hover:shadow-md transition-shadow">
                                            <CardContent className="p-4">
                                                <div className="flex items-start gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-xl">
                                                        {typeInfo.emoji}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <h4 className="font-medium truncate">{item.title}</h4>
                                                            <Badge variant="secondary" className="text-xs shrink-0">
                                                                {typeInfo.label}
                                                            </Badge>
                                                        </div>
                                                        {item.type === "flight" && (
                                                            <p className="text-sm text-muted-foreground">
                                                                {item.airline} {item.flight_number}
                                                                {item.departure_airport && item.arrival_airport && (
                                                                    <span className="ml-2">
                                                                        {item.departure_airport} → {item.arrival_airport}
                                                                    </span>
                                                                )}
                                                            </p>
                                                        )}
                                                        {item.type === "hotel" && item.check_in_date && (
                                                            <p className="text-sm text-muted-foreground">
                                                                {new Date(item.check_in_date).toLocaleDateString("ja-JP")} 〜{" "}
                                                                {item.check_out_date && new Date(item.check_out_date).toLocaleDateString("ja-JP")}
                                                            </p>
                                                        )}
                                                        {item.location && (
                                                            <p className="text-sm text-muted-foreground">📍 {item.location}</p>
                                                        )}
                                                        {item.start_time && (
                                                            <p className="text-sm text-muted-foreground">
                                                                🕐 {new Date(item.start_time).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
                                                                {item.end_time && ` - ${new Date(item.end_time).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}`}
                                                            </p>
                                                        )}
                                                        {item.notes && (
                                                            <p className="text-sm text-muted-foreground mt-1">{item.notes}</p>
                                                        )}
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
