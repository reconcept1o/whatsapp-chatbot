// components/admin/Sidebar.js
"use client"; // 'usePathname' kancası (hook) istemci bileşeni gerektirir

import Link from "next/link";
import { usePathname } from "next/navigation"; // Aktif linki bulmak için

/**
 * Yeniden kullanılabilir Sidebar bileşeni
 * @param {object} props
 * @param {string} props.title - Sidebar'ın başlığı (örn: "Müşteri Paneli")
 * @param {Array<{href: string, label: string}>} props.links - Navigasyon linkleri
 * @param {string} [props.className] - Ekstra CSS sınıfları eklemek için
 */
export function Sidebar({ title, links = [], className = "" }) {
  const pathname = usePathname(); // Şu anki URL'i al

  const baseStyle = "w-64 bg-gray-800 text-white p-4 flex flex-col";

  return (
    <nav className={`${baseStyle} ${className}`}>
      <h2 className="text-xl font-bold mb-4">{title}</h2>

      {links.map((link) => {
        // O anki sayfadaysak linki vurgula
        const isActive = pathname === link.href;
        const linkStyle = `py-2 px-3 rounded hover:bg-gray-700 ${
          isActive ? "bg-gray-700" : ""
        }`;

        return (
          <Link key={link.href} href={link.href} className={linkStyle}>
            {link.label}
          </Link>
        );
      })}

      <div className="mt-auto">
        {/* TODO: Bu 'Link'i Supabase'in 'signOut' fonksiyonunu 
            çağıran bir butona dönüştüreceğiz. */}
        <Link
          href="/login"
          className="py-2 px-3 rounded hover:bg-gray-700 block"
        >
          Çıkış Yap
        </Link>
      </div>
    </nav>
  );
}
