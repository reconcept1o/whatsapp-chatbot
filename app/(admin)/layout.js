// app/(admin)/layout.js
"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

const SUPER_ADMIN_EMAIL = "super@admin.com";

export default function AdminLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Login sayfasındaysak güvenlik kontrolü yapma
    if (pathname === "/login") {
      setLoading(false);
      return;
    }

    // Giriş yapmış kullanıcıyı kontrol et
    async function checkUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        // Giriş yapmamışsa /login'e yönlendir
        router.replace("/login");
      } else if (user.email === SUPER_ADMIN_EMAIL) {
        // Süper Admin ise erişimi engelle ve /login'e yönlendir
        console.warn("Süper Admin bu paneli göremez.");
        await supabase.auth.signOut();
        router.replace("/login");
      } else {
        // Geçerli bir müşteri ise yükleniyor durumunu bitir
        setLoading(false);
      }
    }
    checkUser();
  }, [router, pathname]);

  // Çıkış yapma fonksiyonu
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  // Yükleniyor ekranı
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Yükleniyor...</p>
      </div>
    );
  }

  // Login sayfasındaysak sadece içeriği (formu) göster
  if (pathname === "/login") {
    return <>{children}</>;
  }

  // Kullanıcı doğrulaması başarılı, paneli göster
  return (
    <div className="flex min-h-screen">
      {/* Sol Menü (Sidebar) */}
      <nav className="w-64 bg-gray-800 text-white p-4 flex flex-col flex-shrink-0">
        {" "}
        {/* flex-shrink-0 eklendi */}
        <h2 className="text-xl font-bold mb-4">Müşteri Paneli</h2>
        <Link href="/dashboard" className="py-2 px-3 rounded hover:bg-gray-700">
          Dashboard
        </Link>
        {/* --- YENİ LİNK --- */}
        <Link href="/intents" className="py-2 px-3 rounded hover:bg-gray-700">
          Niyetler (Intents)
        </Link>
        {/* ------------------ */}
        <Link href="/flows" className="py-2 px-3 rounded hover:bg-gray-700">
          Akış Tasarımcısı
        </Link>
        <Link href="/settings" className="py-2 px-3 rounded hover:bg-gray-700">
          Bot Ayarları
        </Link>
        {/* Çıkış butonu en alta itildi */}
        <div className="mt-auto">
          <button
            onClick={handleSignOut}
            className="w-full text-left py-2 px-3 rounded hover:bg-gray-700"
          >
            Çıkış Yap
          </button>
        </div>
      </nav>
      {/* Ana İçerik Alanı */}
      <main className="flex-1 p-8 bg-gray-100 overflow-y-auto">
        {children}
      </main>{" "}
      {/* Scroll eklendi */}
    </div>
  );
}
