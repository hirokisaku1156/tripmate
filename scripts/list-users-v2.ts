import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const envPath = path.resolve(process.cwd(), ".env.local");
const envContent = fs.readFileSync(envPath, "utf-8");
const env: Record<string, string> = {};
envContent.split("\n").forEach((line) => {
    const [key, value] = line.split("=");
    if (key && value) env[key.trim()] = value.trim();
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function listMixedUsers() {
    console.log("--- Supabase Data Summary ---");

    // RLS might block profiles, so we look at trip_members which usually contains the names we care about
    const { data: members, error: mError } = await supabase
        .from("trip_members")
        .select("user_id, display_name_override, role, joined_at, trips(name)");

    if (mError) {
        console.error("Error fetching members:", mError);
        return;
    }

    // Create a map of users and their trips
    const userMap = new Map();

    members?.forEach(m => {
        const id = m.user_id || "GUEST";
        const name = m.display_name_override || (id === "GUEST" ? "Guest/Manual" : "Registered User");
        const trip = m.trips?.name || "Unknown Trip";

        if (!userMap.has(id)) {
            userMap.set(id, { id, names: new Set(), trips: new Set(), firstSeen: m.joined_at });
        }
        const entry = userMap.get(id);
        entry.names.add(name);
        entry.trips.add(trip);
        if (new Date(m.joined_at) < new Date(entry.firstSeen)) {
            entry.firstSeen = m.joined_at;
        }
    });

    const summary = Array.from(userMap.values()).map(u => ({
        ID: u.id,
        Name: Array.from(u.names).join(", "),
        Trips: Array.from(u.trips).join(", "),
        JoinedAt: u.firstSeen,
        LikelyEnv: new Date(u.firstSeen) < new Date("2026-01-20") ? "Vercel/Initial" : "Recent/Local"
    }));

    console.table(summary);
}

listMixedUsers();
