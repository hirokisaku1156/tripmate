import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LogoutButton } from "./_components/logout-button";

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

                {trips.length === 0 ? (
                    <Card className="border-dashed border-2">
                        <CardContent className="py-12 text-center">
                            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                                <span className="text-3xl">🌏</span>
                            </div>
                            <h3 className="text-lg font-medium mb-2">旅行がありません</h3>
                            <p className="text-muted-foreground mb-4">
                                新しい旅行を作成して、友達を招待しましょう
                            </p>
                            <Link href="/trips/new">
                                <Button>旅行を作成する</Button>
                            </Link>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {trips.map((trip) => (
                            <Link key={trip?.id} href={`/trips/${trip?.id}`}>
                                <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer hover:border-blue-300 dark:hover:border-blue-700">
                                    <CardHeader className="pb-2">
                                        <div className="flex items-start justify-between">
                                            <CardTitle className="text-lg">{trip?.name}</CardTitle>
                                            {trip?.role === "owner" && (
                                                <Badge variant="secondary" className="text-xs">
                                                    オーナー
                                                </Badge>
                                            )}
                                        </div>
                                        {trip?.description && (
                                            <CardDescription className="line-clamp-2">
                                                {trip.description}
                                            </CardDescription>
                                        )}
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                                            {trip?.start_date && trip?.end_date && (
                                                <div className="flex items-center gap-1">
                                                    <span>📅</span>
                                                    <span>
                                                        {new Date(trip.start_date).toLocaleDateString("ja-JP")} - {new Date(trip.end_date).toLocaleDateString("ja-JP")}
                                                    </span>
                                                </div>
                                            )}
                                            {trip?.destinations && trip.destinations.length > 0 && (
                                                <div className="flex items-center gap-1">
                                                    <span>📍</span>
                                                    <span>{trip.destinations.join(", ")}</span>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
