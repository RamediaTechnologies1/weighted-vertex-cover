import { createClient } from "@supabase/supabase-js";
import type { Report } from "./types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Client for browser/public use
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type { Report };
