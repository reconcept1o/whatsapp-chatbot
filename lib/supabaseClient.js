// lib/supabaseClient.js
import { createClient } from "@supabase/supabase-js";

// Ortam değişkenlerini çek
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY; // RLS'i atlayan Gizli Anahtar

// --- 1. ANONİM/MÜŞTERİ CLIENT'I (Frontend ve RLS için) ---
// Bu client, tarayıcıda çalışır ve RLS kurallarına tabidir.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- 2. SÜPER ADMIN CLIENT'I (Webhook ve Server Actions için) ---
// Bu client, sadece sunucu tarafında çalışır ve Service Role Key'i ile RLS'i atlar.
// Bot motorunun (route.js) ve Süper Admin Server Actions'ının veri çekmesini garanti eder.
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
