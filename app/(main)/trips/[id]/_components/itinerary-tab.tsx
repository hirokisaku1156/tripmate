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
    Tag,
    Bot
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { analyzeFlightScreenshot } from "@/app/actions/analyze-flight";
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

const TIMEZONES = [
    { label: "日本標準時 (JST) +09:00", value: "+09:00" },
    { label: "ハワイ (ホノルル) -10:00", value: "-10:00" },
    { label: "米国西海岸 夏時間 (サンフランシスコ/LA) -07:00 (PDT)", value: "-07:00" },
    { label: "米国西海岸 標準時 (サンフランシスコ/LA) -08:00 (PST)", value: "-08:00" },
    { label: "米国東海岸 夏時間 (NY/ワシントン) -04:00 (EDT)", value: "-04:00" },
    { label: "米国東海岸 標準時 (NY/ワシントン) -05:00 (EST)", value: "-05:00" },
    { label: "協定世界時 (UTC) +00:00", value: "+00:00" },
    { label: "ヨーロッパ中央 夏時間 (パリ/ベルリン) +02:00 (CEST)", value: "+02:00" },
    { label: "ヨーロッパ中央 標準時 (パリ/ベルリン) +01:00 (CET)", value: "+01:00" },
    { label: "オーストラリア東部 (シドニー) +10:00", value: "+10:00" },
    { label: "シンガポール (SGT) +08:00", value: "+08:00" },
];

export function ItineraryTab({ tripId, items, members, currentMemberId, tripStartDate }: ItineraryTabProps) {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [analysisLoading, setAnalysisLoading] = useState(false);
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
        // Timezone
        startTimezone: "+09:00",
        endTimezone: "+09:00",
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

        // 既存のタイムゾーンがあればそれを使う、なければデフォルト(+09:00)
        // ※DBに start_timezone がない古いデータの場合は JST と仮定するしかない
        const startTz = item.start_timezone || "+09:00";
        const endTz = item.end_timezone || startTz || "+09:00";

        // UTC時間をローカル時間に変換してinput(time/datetime-local)にセットするためのヘルパー
        // しかし、JSのDateはブラウザのタイムゾーンに依存するため、ISO文字列を直接操作したほうが正確かもしれない
        // ここでは簡易的に、UTCとオフセットから「ローカル時間文字列」を生成する
        // 例: 2024-01-01T10:00:00Z (UTC) で +09:00 なら 2024-01-01T19:00:00 にしたい
        const toLocalISO = (dateStr: string | null, offsetStr: string) => {
            if (!dateStr) return "";
            try {
                // オフセット文字列 ("+09:00") を分に変換
                const sign = offsetStr.startsWith("+") ? 1 : -1;
                const [h, m] = offsetStr.slice(1).split(":").map(Number);
                const offsetMinutes = sign * ((h * 60) + m);

                const date = new Date(dateStr);
                // UTC時刻を取得
                const utc = date.getTime();
                // オフセット分ずらす
                const localTime = new Date(utc + (offsetMinutes * 60 * 1000));

                // ISO文字列化して 'Z' をとる (ただし toISOString は UTC に戻してしまうので注意)
                // ローカル時間を UTC として解釈させて ISO 文字列を取得し、末尾の Z を削るハック
                return localTime.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
            } catch (e) {
                return "";
            }
        };

        const startTimeLocal = toLocalISO(item.start_time, startTz);
        const endTimeLocal = toLocalISO(item.end_time, endTz);
        const depTimeLocal = toLocalISO(item.departure_time, startTz);
        const arrTimeLocal = toLocalISO(item.arrival_time, endTz);

        setFormData({
            type: item.type || "",
            title: item.title || "",
            date: item.date || "",
            startTime: (item.type === "hotel" && startTimeLocal) ? startTimeLocal : (startTimeLocal ? startTimeLocal.split("T")[1] : ""),
            endTime: (item.type === "hotel" && endTimeLocal) ? endTimeLocal : (endTimeLocal ? endTimeLocal.split("T")[1] : ""),
            location: item.location || "",
            notes: item.notes || "",
            price: (item as any).price?.toString() || "",
            airline: item.airline || "",
            flightNumber: item.flight_number || "",
            departureAirport: item.departure_airport || "",
            arrivalAirport: item.arrival_airport || "",
            departureTime: depTimeLocal,
            arrivalTime: arrTimeLocal,
            confirmationNumber: item.confirmation_number || "",
            checkInDate: item.check_in_date || "",
            nights: nights,
            autoRegisterExpense: !!(item as any).expense_id,
            paidBy: currentMemberId,
            splitMembers: members.map(m => m.id),
            startTimezone: startTz,
            endTimezone: endTz,
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

        const insertData: any = { // 型定義更新待ちのため any
            trip_id: tripId,
            type: formData.type,
            title: formData.title,
            date: formData.date || (formData.type === "hotel" ? formData.checkInDate : (formData.departureTime ? formData.departureTime.split("T")[0] : formData.date)) || null,
            location: formData.location || null,
            notes: formData.notes || null,
            created_by: user?.id || null,
            start_timezone: formData.startTimezone,
            end_timezone: formData.endTimezone,
            price: formData.price ? Number(formData.price) : null,
        };

        // Flight以外かつHotel以外の場合の通常処理
        if (formData.type !== "flight" && formData.type !== "hotel") {
            if (formData.startTime) {
                insertData.start_time = `${formData.date}T${formData.startTime}:00${formData.startTimezone}`;
            }
            if (formData.endTime) {
                insertData.end_time = `${formData.date}T${formData.endTime}:00${formData.endTimezone}`;
            }
        }


        if (formData.type === "flight") {
            insertData.airline = formData.airline || null;
            insertData.flight_number = formData.flightNumber || null;
            insertData.departure_airport = formData.departureAirport || null;
            insertData.arrival_airport = formData.arrivalAirport || null;
            insertData.start_timezone = formData.startTimezone; // 出発TZ
            insertData.end_timezone = formData.endTimezone;     // 到着TZ

            if (formData.departureTime) {
                insertData.departure_time = `${formData.departureTime}:00${formData.startTimezone}`;
                // flightの場合 start_time にも departure_time を入れておくとソートしやすい
                insertData.start_time = insertData.departure_time;
            }
            if (formData.arrivalTime) {
                insertData.arrival_time = `${formData.arrivalTime}:00${formData.endTimezone}`;
                insertData.end_time = insertData.arrival_time;
            }

            insertData.confirmation_number = formData.confirmationNumber || null;
        }

        if (formData.type === "hotel") {
            // Hotelの場合は datetime-local の値 (YYYY-MM-DDTHH:mm) をそのまま使用
            if (formData.startTime) {
                insertData.start_time = `${formData.startTime}:00${formData.startTimezone}`;
                insertData.check_in_date = formData.startTime.split("T")[0];
            }
            if (formData.endTime) {
                insertData.end_time = `${formData.endTime}:00${formData.endTimezone}`;
                insertData.check_out_date = formData.endTime.split("T")[0];
            }
        }

        const { data: savedItem, error } = editItemId
            ? await supabase.from("itinerary_items").update(insertData).eq("id", editItemId).select().single()
            : await supabase.from("itinerary_items").insert(insertData).select().single();

        if (error) {
            toast.error(editItemId ? "更新に失敗しました" : "追加に失敗しました", { description: error.message });
        } else {
            // 費用の自動登録処理（新規・編集両方対応）
            if (formData.price && Number(formData.price) > 0 && formData.autoRegisterExpense && user) {
                const typeInfo = ITEM_TYPES[formData.type as keyof typeof ITEM_TYPES];
                const expenseData = {
                    trip_id: tripId,
                    title: formData.title,
                    amount: Number(formData.price),
                    currency: "JPY",
                    amount_jpy: Number(formData.price),
                    category: typeInfo.category,
                    paid_by: formData.paidBy,
                    date: formData.date || formData.checkInDate || formData.departureTime?.split("T")[0] || null,
                };

                let finalExpenseId = (savedItem as any).expense_id;

                if (finalExpenseId) {
                    // 既存の費用を更新
                    await supabase.from("expenses").update(expenseData).eq("id", finalExpenseId);
                } else {
                    // 新規作成
                    const { data: newExpense, error: expenseError } = await supabase
                        .from("expenses")
                        .insert(expenseData)
                        .select()
                        .single();

                    if (!expenseError && newExpense) {
                        finalExpenseId = newExpense.id;
                        // 旅程アイテムに費用IDを紐付け
                        await supabase.from("itinerary_items").update({ expense_id: finalExpenseId }).eq("id", savedItem.id);
                    }
                }

                if (finalExpenseId) {
                    // 割り勘対象を同期
                    await supabase.from("expense_splits").delete().eq("expense_id", finalExpenseId);
                    const splits = formData.splitMembers.map((userId) => ({
                        expense_id: finalExpenseId,
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
                startTimezone: "+09:00",
                endTimezone: "+09:00",
            });
            router.refresh();
        }

        setLoading(false);
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setAnalysisLoading(true);
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const base64 = event.target?.result as string;
                const result = await analyzeFlightScreenshot(base64);

                setFormData(prev => ({
                    ...prev,
                    type: "flight",
                    title: result.title || "フライト",
                    airline: result.airline || "",
                    flightNumber: result.flightNumber || "",
                    departureAirport: result.departureAirport || "",
                    arrivalAirport: result.arrivalAirport || "",
                    departureTime: result.departureTime || "",
                    arrivalTime: result.arrivalTime || "",
                    confirmationNumber: result.confirmationNumber || "",
                    date: result.departureTime ? result.departureTime.split("T")[0] : prev.date,
                    startTimezone: result.departureTimezone || prev.startTimezone,
                    endTimezone: result.arrivalTimezone || prev.endTimezone,
                }));
                // 既にダイアログは開いているはずだが念のため
                setDialogOpen(true);
                toast.success("スクショを解析しました！内容を確認してください。");
            } catch (error) {
                toast.error("情報の解析に失敗しました");
            } finally {
                setAnalysisLoading(false);
                // Reset input
                e.target.value = "";
            }
        };
        reader.readAsDataURL(file);
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

    // 各日付グループ内で時間をソート
    Object.keys(groupedItems).forEach(date => {
        groupedItems[date].sort((a, b) => {
            const getTime = (item: ItineraryItem) => {
                // フライト: 出発時間
                if (item.type === "flight" && item.departure_time) {
                    return new Date(item.departure_time).getTime();
                }
                // ホテル: チェックイン日 (15:00と仮定)
                if (item.type === "hotel" && item.check_in_date) {
                    return new Date(`${item.check_in_date}T15:00:00`).getTime();
                }
                // その他: 開始時間
                if (item.start_time) {
                    return new Date(item.start_time).getTime();
                }
                // 時間未定: 最後へ
                return 8640000000000000;
            };
            return getTime(a) - getTime(b);
        });
    });


    // ホテル滞在の期間マップを作成
    const datesWithHotels = new Set<string>();
    const hotelStaysPerDate: Record<string, ItineraryItem[]> = {};

    items.filter(i => i.type === "hotel").forEach(hotel => {
        if (!hotel.check_in_date || !hotel.check_out_date) return;

        const start = new Date(hotel.check_in_date);
        const end = new Date(hotel.check_out_date);
        const current = new Date(start);

        while (current <= end) {
            const dateStr = current.toISOString().split('T')[0];
            datesWithHotels.add(dateStr);
            if (!hotelStaysPerDate[dateStr]) hotelStaysPerDate[dateStr] = [];
            hotelStaysPerDate[dateStr].push(hotel);
            current.setDate(current.getDate() + 1);
        }
    });

    Object.keys(groupedItems).forEach(d => datesWithHotels.add(d));
    const sortedDates = Array.from(datesWithHotels).sort();

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
                                    startTimezone: "+09:00",
                                    endTimezone: "+09:00",
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
                                <Select value={formData.type} onValueChange={(v) => {
                                    const updates: any = { type: v };
                                    if (v === "hotel" && !formData.startTime && formData.date) {
                                        updates.startTime = `${formData.date}T15:00`;
                                    }
                                    setFormData({ ...formData, ...updates });
                                }}>
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
                                    <div className="p-3 border rounded-lg bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800 space-y-2">
                                        <p className="text-[11px] text-blue-700 dark:text-blue-300 font-medium flex items-center gap-1">
                                            <span>✨</span> 便名をスクショから自動入力する
                                        </p>
                                        <input
                                            type="file"
                                            id="flight-upload-dialog"
                                            className="hidden"
                                            accept="image/*"
                                            onChange={handleFileChange}
                                            disabled={analysisLoading}
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            asChild
                                            disabled={analysisLoading}
                                            className="w-full bg-white dark:bg-gray-900 border-blue-200 text-blue-600 hover:bg-blue-50"
                                        >
                                            <label htmlFor="flight-upload-dialog" className="cursor-pointer">
                                                {analysisLoading ? "⏳ 解析中..." : "✈️ 予約スクショを読み込む"}
                                            </label>
                                        </Button>
                                    </div>
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

                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label className="text-xs text-muted-foreground">出発タイムゾーン</Label>
                                            <Select value={formData.startTimezone} onValueChange={(v) => setFormData({ ...formData, startTimezone: v })}>
                                                <SelectTrigger className="text-xs h-8">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {TIMEZONES.map((tz) => (
                                                        <SelectItem key={tz.value} value={tz.value} className="text-xs">
                                                            {tz.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs text-muted-foreground">到着タイムゾーン</Label>
                                            <Select value={formData.endTimezone} onValueChange={(v) => setFormData({ ...formData, endTimezone: v })}>
                                                <SelectTrigger className="text-xs h-8">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {TIMEZONES.map((tz) => (
                                                        <SelectItem key={tz.value} value={tz.value} className="text-xs">
                                                            {tz.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
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

                            {formData.type !== "flight" && (
                                <>
                                    <div className="space-y-2">
                                        <Label htmlFor="date">日付</Label>
                                        <Input
                                            id="date"
                                            type="date"
                                            value={formData.date}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                const updates: any = { date: val };

                                                // ホテルの場合、日付を変更したらチェックイン日時の日付も合わせる
                                                if (formData.type === "hotel" && val) {
                                                    const currentTime = formData.startTime && formData.startTime.includes("T")
                                                        ? formData.startTime.split("T")[1]
                                                        : "15:00";
                                                    updates.startTime = `${val}T${currentTime}`;
                                                }

                                                setFormData({ ...formData, ...updates });
                                            }}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="startTime">
                                                {formData.type === "hotel" ? "チェックイン日時" : "開始時刻"}
                                            </Label>
                                            <Input
                                                id="startTime"
                                                type={formData.type === "hotel" ? "datetime-local" : "time"}
                                                value={formData.startTime}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setFormData({
                                                        ...formData,
                                                        startTime: val,
                                                        // もしhotelなら、開始日の日付をdateにもセットしておく（グループ化用）
                                                        date: (formData.type === "hotel" && val) ? val.split("T")[0] : formData.date
                                                    });
                                                }}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="endTime">
                                                {formData.type === "hotel" ? "チェックアウト日時" : "終了時刻"}
                                            </Label>
                                            <Input
                                                id="endTime"
                                                type={formData.type === "hotel" ? "datetime-local" : "time"}
                                                value={formData.endTime}
                                                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label className="text-xs text-muted-foreground">{formData.type === "hotel" ? "チェックイン タイムゾーン" : "開始タイムゾーン"}</Label>
                                            <Select value={formData.startTimezone} onValueChange={(v) => setFormData({ ...formData, startTimezone: v, endTimezone: formData.type === "hotel" ? formData.endTimezone : v })}>
                                                <SelectTrigger className="text-xs h-8">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {TIMEZONES.map((tz) => (
                                                        <SelectItem key={tz.value} value={tz.value} className="text-xs">
                                                            {tz.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs text-muted-foreground">{formData.type === "hotel" ? "チェックアウト タイムゾーン" : "終了タイムゾーン"}</Label>
                                            <Select value={formData.endTimezone} onValueChange={(v) => setFormData({ ...formData, endTimezone: v })}>
                                                <SelectTrigger className="text-xs h-8">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {TIMEZONES.map((tz) => (
                                                        <SelectItem key={tz.value} value={tz.value} className="text-xs">
                                                            {tz.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
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
                    {sortedDates.map((date) => {
                        // Helper for formatting times
                        const formatLocalTime = (isoString: string | null, offset: string | null) => {
                            if (!isoString) return null;
                            if (!offset) {
                                return new Date(isoString).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
                            }
                            try {
                                const date = new Date(isoString);
                                const utcMs = date.getTime();
                                const sign = offset.startsWith("+") ? 1 : -1;
                                const [h, m] = offset.slice(1).split(":").map(Number);
                                const offsetMs = sign * (h * 60 + m) * 60 * 1000;
                                const localDate = new Date(utcMs + offsetMs);
                                return localDate.toLocaleTimeString("ja-JP", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    timeZone: "UTC"
                                });
                            } catch (e) {
                                return "";
                            }
                        };

                        return (
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
                                    {/* Hotel Stay Banner - Integrated into the list flow */}
                                    {(hotelStaysPerDate[date] || []).map(hotel => {
                                        const isCheckIn = date === hotel.check_in_date;
                                        const isCheckOut = date === hotel.check_out_date;
                                        const startTime = isCheckIn ? formatLocalTime(hotel.start_time, hotel.start_timezone) : null;
                                        const endTime = isCheckOut ? formatLocalTime(hotel.end_time, hotel.end_timezone) : null;

                                        return (
                                            <div key={`stay-${hotel.id}`} className="mb-4 p-3 bg-indigo-50/80 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-lg flex items-center gap-3 text-indigo-700 dark:text-indigo-300">
                                                <div className="bg-indigo-100 dark:bg-indigo-800 p-1.5 rounded-md shrink-0">
                                                    <Hotel className="h-4 w-4" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="text-xs font-semibold uppercase tracking-wider opacity-70">Staying at</div>
                                                    <div className="font-bold text-sm truncate">{hotel.title}</div>
                                                </div>

                                                {/* Times for Check-in/Check-out days */}
                                                {(startTime || endTime) && (
                                                    <div className="flex items-center gap-3 text-xs font-medium px-2 shrink-0">
                                                        {startTime && (
                                                            <div className="flex items-center gap-1 bg-white/50 dark:bg-black/20 px-2 py-1 rounded">
                                                                <span className="text-indigo-500">IN</span>
                                                                <span className="font-bold">{startTime}</span>
                                                            </div>
                                                        )}
                                                        {endTime && (
                                                            <div className="flex items-center gap-1 bg-white/50 dark:bg-black/20 px-2 py-1 rounded">
                                                                <span className="text-indigo-500">OUT</span>
                                                                <span className="font-bold">{endTime}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                <div className="shrink-0 ml-2">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-indigo-200/50">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={() => handleEdit(hotel)}>
                                                                ✏️ 編集
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                className="text-red-600 focus:text-red-600"
                                                                onClick={() => handleDelete(hotel.id)}
                                                            >
                                                                🗑️ 削除
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {(groupedItems[date] || []).filter(item => item.type !== "hotel").map((item) => {
                                        const typeInfo = ITEM_TYPES[item.type as keyof typeof ITEM_TYPES] || ITEM_TYPES.other;
                                        const Icon = typeInfo.icon;



                                        const displayTime = item.type === "flight"
                                            ? formatLocalTime(item.departure_time, item.start_timezone)
                                            : formatLocalTime(item.start_time, item.start_timezone);

                                        const displayEndTime = item.type === "flight"
                                            ? formatLocalTime(item.arrival_time, item.end_timezone)
                                            : formatLocalTime(item.end_time, item.end_timezone);

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
                                                                    <div className="flex items-center gap-2 min-w-0">
                                                                        <h4 className="text-xl font-bold truncate leading-tight">{item.title}</h4>
                                                                        {item.is_ai_generated && (
                                                                            <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200 gap-1 shrink-0 h-5 px-1.5 text-[10px]">
                                                                                <Bot className="h-3 w-3" /> AI
                                                                            </Badge>
                                                                        )}
                                                                    </div>
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
                        );
                    })}
                </div>
            )
            }
        </div>
    );
}
