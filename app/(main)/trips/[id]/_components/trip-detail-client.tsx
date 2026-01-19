"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ItineraryTab } from "./itinerary-tab";
import { PlacesTab } from "./places-tab";
import { MembersTab } from "./members-tab";
import { ExpensesTab } from "./expenses-tab";
import type { Database } from "@/lib/supabase/types";

type Trip = Database["public"]["Tables"]["trips"]["Row"];
type TripMember = Database["public"]["Tables"]["trip_members"]["Row"] & {
    profiles: { id: string; display_name: string } | null;
};
type ItineraryItem = Database["public"]["Tables"]["itinerary_items"]["Row"];
type Place = Database["public"]["Tables"]["places"]["Row"];
type Expense = Database["public"]["Tables"]["expenses"]["Row"];
type ExpenseSplit = Database["public"]["Tables"]["expense_splits"]["Row"];

interface TripDetailClientProps {
    trip: Trip;
    members: TripMember[];
    itineraryItems: ItineraryItem[];
    places: Place[];
    expenses: Expense[];
    expenseSplits: ExpenseSplit[];
    currentUserId: string;
    isOwner: boolean;
}

export function TripDetailClient({
    trip,
    members,
    itineraryItems,
    places,
    expenses,
    expenseSplits,
    currentUserId,
    isOwner,
}: TripDetailClientProps) {
    const [activeTab, setActiveTab] = useState("itinerary");

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
                                <p className="text-sm text-muted-foreground truncate">
                                    📍 {trip.destinations.join(", ")}
                                </p>
                            )}
                        </div>
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
                    <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0 h-auto">
                        <TabsTrigger
                            value="itinerary"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent px-4 py-3"
                        >
                            🗓️ 旅程
                        </TabsTrigger>
                        <TabsTrigger
                            value="places"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent px-4 py-3"
                        >
                            📍 場所
                        </TabsTrigger>
                        <TabsTrigger
                            value="members"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent px-4 py-3"
                        >
                            👥 メンバー
                        </TabsTrigger>
                        <TabsTrigger
                            value="expenses"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent px-4 py-3"
                        >
                            💰 費用
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="itinerary" className="px-4 py-4">
                        <ItineraryTab tripId={trip.id} items={itineraryItems} />
                    </TabsContent>

                    <TabsContent value="places" className="px-4 py-4">
                        <PlacesTab tripId={trip.id} places={places} />
                    </TabsContent>

                    <TabsContent value="members" className="px-4 py-4">
                        <MembersTab
                            tripId={trip.id}
                            members={members}
                            inviteCode={trip.invite_code ?? ""}
                            isOwner={isOwner}
                        />
                    </TabsContent>

                    <TabsContent value="expenses" className="px-4 py-4">
                        <ExpensesTab
                            tripId={trip.id}
                            expenses={expenses}
                            expenseSplits={expenseSplits}
                            members={members}
                            currentUserId={currentUserId}
                        />
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    );
}
