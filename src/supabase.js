import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const configured =
  !SUPABASE_URL.includes("ВАШ") && !SUPABASE_ANON_KEY.includes("ВАШ");
