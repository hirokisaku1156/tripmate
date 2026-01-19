import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TripDetailClient } from "./_components/trip-detail-client";

interface TripDetailPageProps {
    params: Promise<{ id: string }>;
}

export default async function TripDetailPage({ params }: TripDetailPageProps) {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError) {
        console.error("Auth error:", authError);
    }

    if (!user) {
        redirect("/login");
    }

    // 旅行データとメンバー確認を並列で取得
    const [tripResult, memberResult] = await Promise.all([
        supabase
            .from("trips")
            .select("*")
            .eq("id", id)
            .single(),
        supabase
            .from("trip_members")
            .select("*")
            .eq("trip_id", id)
            .eq("user_id", user.id)
            .single(),
    ]);

    if (tripResult.error || !tripResult.data) {
        console.error("Trip fetch error:", tripResult.error);
        notFound();
    }

    if (!memberResult.data) {
        notFound();
    }

    const trip = tripResult.data;
    const member = memberResult.data;

    // 費用データを先に取得
    const { data: expenses, error: expensesError } = await supabase
        .from("expenses")
        .select("*")
        .eq("trip_id", id)
        .order("date", { ascending: false });

    if (expensesError) {
        console.error("Expenses fetch error:", expensesError);
    }

    const expenseIds = (expenses ?? []).map(e => e.id);

    // 残りのデータを取得
    const [membersResult, itineraryResult, todosResult, memosResult, expenseSplitsResult] = await Promise.all([
        supabase
            .from("trip_members")
            .select(`
              *,
              profiles (
                id,
                display_name
              )
            `)
            .eq("trip_id", id),
        supabase
            .from("itinerary_items")
            .select("*")
            .eq("trip_id", id)
            .order("date", { ascending: true })
            .order("start_time", { ascending: true }),
        supabase
            .from("trip_todos")
            .select("*")
            .eq("trip_id", id)
            .order("created_at", { ascending: false }),
        supabase
            .from("trip_memos")
            .select("*")
            .eq("trip_id", id)
            .order("created_at", { ascending: false }),
        expenseIds.length > 0
            ? supabase
                .from("expense_splits")
                .select("*")
                .in("expense_id", expenseIds)
            : Promise.resolve({ data: [], error: null }),
    ]);

    const chatSessions: any[] = [];
    const initialChatMessages: any[] = [];

    if (membersResult.error) {
        console.error("Members fetch error:", membersResult.error);
    }
    if (itineraryResult.error) {
        console.error("Itinerary fetch error:", itineraryResult.error);
    }
    if (todosResult.error) {
        console.error("Todos fetch error:", todosResult.error);
    }
    if (memosResult.error) {
        console.error("Memos fetch error:", memosResult.error);
    }
    // フィルタリング済みデータを使用
    const filteredSplits = expenseSplitsResult.data ?? [];

    return (
        <TripDetailClient
            trip={trip}
            members={membersResult.data ?? []}
            itineraryItems={itineraryResult.data ?? []}
            todos={todosResult.data ?? []}
            memos={memosResult.data ?? []}
            expenses={expenses ?? []}
            expenseSplits={filteredSplits}
            currentUserId={user.id}
            isOwner={member.role === "owner"}
        />
    );
}
