// Environment variable validation
// This file validates required environment variables at startup

function getRequiredEnvVar(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}

export const SUPABASE_URL = getRequiredEnvVar("NEXT_PUBLIC_SUPABASE_URL");
export const SUPABASE_ANON_KEY = getRequiredEnvVar("NEXT_PUBLIC_SUPABASE_ANON_KEY");
