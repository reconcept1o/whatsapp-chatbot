// app/(auth)/login/page.js
"use client"; // Form etkileşimi için istemci bileşeni

import { useState } from "react";
import { useRouter } from "next/navigation";
// Supabase istemcimizi (lib/supabaseClient.js'den) import ediyoruz
import { supabase } from "@/lib/supabaseClient";

// TODO: Bu bileşenleri daha sonra 'components/ui/' klasöründen import edebiliriz
// import { Button } from '@/components/ui/Button';
// import { Input } from '@/components/ui/Input';
// import { Card } from '@/components/ui/Card';

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();

  // Süper Admin e-postasını .env'den okuyabiliriz veya burada sabit kodlayabiliriz
  // Şimdilik test için oluşturduğumuz e-postayı kullanalım:
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
        // Şifre yanlışsa veya kullanıcı yoksa hata fırlat
        throw new Error("Girdiğiniz e-posta veya şifre hatalı.");
      }

      // 2. GÜVENLİK KONTROLÜ (Rol Ayırma)
      // Giriş başarılı, ama giren kişi Süper Admin mi?
      if (data.user.email === SUPER_ADMIN_EMAIL) {
        // Eğer Süper Admin ise, buradan giriş yapmasını engelle
        setError(
          "Adminler bu sayfadan giriş yapamaz. Lütfen size özel giriş panelini kullanın."
        );
        // Güvenlik için hesaptan hemen geri çıkış yap
        await supabase.auth.signOut();
        return; // Fonksiyonu durdur
      }

      // 3. BAŞARILI MÜŞTERİ GİRİŞİ
      // Giren kişi Süper Admin değilse, o bir müşteridir.
      console.log("Müşteri girişi başarılı:", data.user.email);
      router.push("/dashboard"); // Müşteri paneline yönlendir
    } catch (error) {
      console.error("Giriş hatası:", error.message);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 bg-white p-8 shadow-md rounded-lg w-full max-w-md">
      <h2 className="text-2xl font-bold text-center text-gray-900">
        Müşteri Girişi
      </h2>
      <form onSubmit={handleLogin} className="space-y-6">
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium leading-6 text-gray-900"
          >
            Email adresi
          </label>
          <div className="mt-2">
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className="block w-full rounded-md border-0 p-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 disabled:opacity-50"
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
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              // HATA BURADAYDI: e.targe.value -> e.target.value olarak düzeltildi
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className="block w-full rounded-md border-0 p-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 disabled:opacity-50"
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div>
          <button
            type="submit"
            disabled={loading}
            className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:bg-indigo-400"
          >
            {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
          </button>
        </div>
      </form>
    </div>
  );
}
