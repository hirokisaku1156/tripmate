import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// Manually parse .env.local
const envPath = path.resolve(process.cwd(), ".env.local");
const envContent = fs.readFileSync(envPath, "utf-8");
const env: Record<string, string> = {};

envContent.split("\n").forEach((line) => {
    const [key, value] = line.split("=");
    if (key && value) {
        env[key.trim()] = value.trim();
    }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing SUPABASE environment variables in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function listUsers() {
    console.log("--- Profiles ---");
    const { data: profiles, error: pError } = await supabase.from("profiles").select("*");
    if (pError) console.error("Profiles Error:", pError);
    else console.table(profiles);

    console.log("--- Trips ---");
    const { data: trips, error: tError } = await supabase.from("trips").select("*");
    if (tError) console.error("Trips Error:", tError);
    else console.table(trips);

    console.log("--- Trip Members ---");
    const { data: members, error: mError } = await supabase.from("trip_members").select("*");
    if (mError) console.error("Members Error:", mError);
    else console.table(members);
}

listUsers();
