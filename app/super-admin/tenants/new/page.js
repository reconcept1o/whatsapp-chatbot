// app/super-admin/tenants/new/page.js
"use client"; // Form etkileşimi için istemci bileşeni

import { useState } from "react";
import { useRouter } from "next/navigation";
// Server Action'ımızı import ediyoruz
import { addTenantAction } from "../actions";

export default function NewTenantPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Form gönderildiğinde Server Action'ı çağıran fonksiyon
  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(event.currentTarget);

    try {
      // --- SERVER ACTION ÇAĞRISI ---
      const result = await addTenantAction(formData); // Action'ı çağır

      // Action'dan hata dönerse göster
      if (result?.error) {
        throw new Error(result.error);
      }
      // --- ---

      // Başarılı olursa Server Action zaten yönlendirecek (redirect),
      // bu yüzden burada ek bir yönlendirme yapmaya gerek yok.
      // Eğer yönlendirme (redirect) Server Action içinde hata verirse
      // veya yapılmazsa, loading state'i burada false yapılmalı.
    } catch (err) {
      setError(err.message || "Bir hata oluştu.");
      console.error("Müşteri ekleme hatası (Client):", err);
      // Hata oluştuğu için loading'i burada false yapalım ki buton tekrar aktifleşsin
      setLoading(false);
    }
    // Başarılı durumda setLoading(false) yapmaya gerek yok, çünkü yönlendirme olacak.
  };

  return (
    // 'Card' bileşeni kullanabiliriz
    <div className="max-w-xl mx-auto bg-white p-8 shadow-md rounded-lg">
      <h1 className="text-2xl font-bold mb-6">Yeni Müşteri Ekle</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Şirket Adı */}
        <div>
          <label
            htmlFor="company_name"
            className="block text-sm font-medium leading-6 text-gray-900"
          >
            Şirket Adı
          </label>
          <input
            id="company_name"
            name="company_name" // Server Action için 'name' önemli
            type="text"
            required
            className="block w-full rounded-md border-0 p-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600"
          />
        </div>

        {/* Müşteri E-postası */}
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium leading-6 text-gray-900"
          >
            Müşteri Yöneticisi Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="block w-full rounded-md border-0 p-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600"
          />
        </div>

        {/* Geçici Şifre */}
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium leading-6 text-gray-900"
          >
            Geçici Şifre
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength="8" // Supabase genellikle min. 6-8 ister
            className="block w-full rounded-md border-0 p-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600"
          />
          <p className="text-xs text-gray-500 mt-1">
            Müşteriye bu şifreyi ileteceksiniz. Güçlü bir şifre belirleyin (min
            8 karakter).
          </p>
        </div>

        {/* Abonelik Bitiş Tarihi (Opsiyonel) */}
        <div>
          <label
            htmlFor="subscription_expires_at"
            className="block text-sm font-medium leading-6 text-gray-900"
          >
            Abonelik Bitiş Tarihi (Opsiyonel)
          </label>
          <input
            id="subscription_expires_at"
            name="subscription_expires_at"
            type="date"
            className="block w-full rounded-md border-0 p-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600"
          />
        </div>

        {/* Hata Mesajı */}
        {error && (
          <div className="p-4 rounded-md bg-red-100 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Butonlar */}
        <div className="flex justify-end gap-4 pt-4">
          <button
            type="button"
            onClick={() => router.back()} // Geri dön butonu
            disabled={loading}
            className="rounded-md bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-300 disabled:opacity-50"
          >
            İptal
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed"
          >
            {loading ? "Ekleniyor..." : "Müşteriyi Ekle"}
          </button>
        </div>
      </form>
    </div>
  );
}
