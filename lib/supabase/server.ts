import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/env";

export async function createClient() {
    const cookieStore = await cookies();

    return createServerClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY,

        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        );
                    } catch (error) {
                        // Server Componentからの呼び出し時は書き込み不可
                        // これは想定内の挙動なのでログレベルをdebugに
                        if (process.env.NODE_ENV === "development") {
                            console.debug("Cookie set skipped in Server Component:", error);
                        }
                    }
                },
            },
        }
    );
}
