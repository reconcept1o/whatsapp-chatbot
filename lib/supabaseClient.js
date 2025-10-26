// lib/supabaseClient.js
import { createClient } from "@supabase/supabase-js";

// .env dosyalarından URL ve Anahtarı otomatik olarak çeker
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Değişkenlerin tanımlı olup olmadığını kontrol et
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL and/or Anon Key is missing from .env files.");
}

// Supabase istemcisini oluştur ve dışarı aktar
// Bu 'supabase' objesini projemizin her yerinde veritabanı işlemleri için kullanacağız.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
