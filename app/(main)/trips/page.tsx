import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "./_components/logout-button";
import { TripListClient } from "./_components/trip-list-client";

interface TripData {
    id: string;
    name: string;
    description: string | null;
    start_date: string | null;
    end_date: string | null;
    destinations: string[] | null;
}

// 型ガード関数
function isTripData(obj: unknown): obj is TripData {
    return (
        typeof obj === "object" &&
        obj !== null &&
        "id" in obj &&
        "name" in obj
    );
}

export default async function TripsPage() {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError) {
        console.error("Auth error:", authError);
    }

    // ユーザーが参加している旅行を取得
    const { data: tripMembers, error: fetchError } = await supabase
        .from("trip_members")
        .select(`
      trip_id,
      role,
      trips (
        id,
        name,
        description,
        start_date,
        end_date,
        destinations
      )
    `)
        .eq("user_id", user?.id ?? "");

    if (fetchError) {
        console.error("Fetch error:", fetchError);
    }

    // 型ガードを使用した安全な変換
    const trips = (tripMembers ?? []).map(tm => {
        const tripData = Array.isArray(tm.trips) ? tm.trips[0] : tm.trips;
        if (!isTripData(tripData)) return null;
        return {
            ...tripData,
            role: tm.role as string,
        };
    }).filter((trip): trip is NonNullable<typeof trip> => trip !== null);

    return (
        <div className="min-h-screen pb-20">
            {/* ヘッダー */}
            <header className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
                <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                            <span className="text-lg">✈️</span>
                        </div>
                        <h1 className="text-xl font-bold">TripMate</h1>
                    </div>
                    <LogoutButton />
                </div>
            </header>

            {/* メインコンテンツ */}
            <main className="max-w-2xl mx-auto px-4 py-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold">旅行リスト</h2>
                    <Link href="/trips/new">
                        <Button className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700">
                            <span className="mr-2">+</span>
                            新規作成
                        </Button>
                    </Link>
                </div>

                <TripListClient trips={trips} />
            </main>
        </div>
    );
}
