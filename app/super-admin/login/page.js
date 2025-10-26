// app/super-admin/login/page.js
"use client"; // Form etkileşimi için istemci bileşeni

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function SuperAdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();

  // Sistemin tek Süper Admin'inin e-postası
  const SUPER_ADMIN_EMAIL = "super@admin.com";

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // 1. Supabase Auth ile giriş yapmayı dene
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) {
        throw new Error("Girdiğiniz e-posta veya şifre hatalı.");
      }

      // 2. GÜVENLİK KONTROLÜ (Rol Ayırma)
      // Giren kişi SÜPER ADMİN DEĞİLSE engelle
      if (data.user.email !== SUPER_ADMIN_EMAIL) {
        setError("Bu panel sadece Süper Admin içindir. Erişim reddedildi.");
        // Güvenlik için hesaptan hemen geri çıkış yap
        await supabase.auth.signOut();
        return; // Fonksiyonu durdur
      }

      // 3. BAŞARILI SÜPER ADMİN GİRİŞİ
      console.log("Süper Admin girişi başarılı:", data.user.email);
      router.push("/super-admin/tenants"); // Süper Admin paneline yönlendir
    } catch (error) {
      console.error("Giriş hatası:", error.message);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    // Bu, (auth)/layout.js'e benzeyen basit bir ortalama layout'u
    <div className="flex min-h-screen items-center justify-center bg-slate-900 p-4">
      <div className="space-y-6 bg-white p-8 shadow-md rounded-lg w-full max-w-md">
        <h2 className="text-2xl font-bold text-center text-gray-900">
          Süper Admin Girişi
        </h2>

        {/* Müşteri Giriş sayfasındaki formun aynısı */}
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium leading-6 text-gray-900"
            >
              Email
            </label>
            <div className="mt-2">
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="block w-full rounded-md border-0 p-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300"
              />
            </div>
          </div>
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium leading-6 text-gray-900"
            >
              Şifre
            </label>
            <div className="mt-2">
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="block w-full rounded-md border-0 p-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300"
              />
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div>
            <button
              type="submit"
              disabled={loading}
              className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:bg-indigo-400"
            >
              {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
