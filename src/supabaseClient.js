import { createClient } from "@supabase/supabase-js";

// ==========================================
// PASTE YOUR ACTUAL SUPABASE ENDPOINT AND PUBLIC ANON KEY BELOW:
// ==========================================
const SUPABASE_URL = "https://dkcsyuuzixeklreufgar.supabase.co";
const SUPABASE_PUBLIC_KEY = "sb_publishable_qKP8vejRCjN3wO4LQ60g0A_FDdSS_y4";

// Export the initialized client to use throughout the application
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY);
