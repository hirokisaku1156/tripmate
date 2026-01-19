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

    // 残りのデータを並列で取得
    const [membersResult, itineraryResult, placesResult] = await Promise.all([
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
            .from("places")
            .select("*")
            .eq("trip_id", id)
            .order("created_at", { ascending: false }),
    ]);

    if (membersResult.error) {
        console.error("Members fetch error:", membersResult.error);
    }
    if (itineraryResult.error) {
        console.error("Itinerary fetch error:", itineraryResult.error);
    }
    if (placesResult.error) {
        console.error("Places fetch error:", placesResult.error);
    }

    return (
        <TripDetailClient
            trip={trip}
            members={membersResult.data ?? []}
            itineraryItems={itineraryResult.data ?? []}
            places={placesResult.data ?? []}
            currentUserId={user.id}
            isOwner={member.role === "owner"}
        />
    );
}
