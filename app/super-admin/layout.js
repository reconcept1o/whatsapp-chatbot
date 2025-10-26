// app/super-admin/layout.js
"use client";

import { useEffect, useState } from "react";
// 1. usePathname hook'unu import et
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

const SUPER_ADMIN_EMAIL = "super@admin.com";

export default function SuperAdminLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname(); // 2. Mevcut URL yolunu al
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 3. YENİ KONTROL: Eğer zaten login sayfasındaysak,
    //    hiçbir güvenlik kontrolü yapma, sadece sayfayı göster.
    if (pathname === "/super-admin/login") {
      setLoading(false); // Yükleniyor ekranını kaldır
      return; // Fonksiyonu burada bitir
    }

    // (Eğer login sayfasında değilsek, normal güvenlik kontrolü devam eder)
    async function checkUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || user.email !== SUPER_ADMIN_EMAIL) {
        await supabase.auth.signOut();
        router.replace("/super-admin/login");
      } else {
        setLoading(false); // Kullanıcı Süper Admin, sayfayı göster
      }
    }
    checkUser();

    // 4. pathname'i dependency array'e ekle
  }, [router, pathname]);

  // Çıkış yapma fonksiyonu (Değişiklik yok)
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/super-admin/login");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Yükleniyor...</p>
      </div>
    );
  }

  // 5. YENİ KONTROL: Eğer login sayfasındaysak,
  //    sadece 'children'ı (login formunu) göster, menüyü gösterme.
  if (pathname === "/super-admin/login") {
    return <>{children}</>;
  }

  // Kullanıcı doğrulaması başarılı ve login sayfasında değil, paneli göster
  return (
    <div className="flex min-h-screen">
      <nav className="w-64 bg-slate-900 text-white p-4 flex flex-col">
        <h2 className="text-xl font-bold mb-4">Süper Admin</h2>
        <Link
          href="/super-admin/tenants"
          className="py-2 px-3 rounded hover:bg-slate-700"
        >
          Müşteri Yönetimi
        </Link>
        <div className="mt-auto">
          <button
            onClick={handleSignOut}
            className="w-full text-left py-2 px-3 rounded hover:bg-slate-700"
          >
            Çıkış Yap
          </button>
        </div>
      </nav>
      <main className="flex-1 p-8 bg-gray-100">{children}</main>
    </div>
  );
}
