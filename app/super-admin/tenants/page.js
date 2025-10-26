// app/super-admin/tenants/page.js
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
// Client Component'i import ediyoruz (Server Action importları artık burada değil)
import TenantActions from "./TenantActions";

// --- SUNUCU TARAFI SUPABASE ADMİN İSTEMCİSİ ---
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_KEY || ""
);
// --- ---

// Veri Çekme Fonksiyonu (Sunucuda Çalışır - E-postaları ayrı çeker)
async function getTenantsWithEmails() {
  // 1. Adım: Temel tenant bilgilerini çek
  const { data: tenantsData, error: tenantsError } = await supabaseAdmin
    .from("tenants")
    .select(
      `id, company_name, is_active, subscription_expires_at, created_at, admin_user_id`
    )
    .order("created_at", { ascending: false });

  if (tenantsError) {
    console.error(
      "Süper Admin tenant listesi çekme hatası (Adım 1):",
      tenantsError
    );
    // Hata durumunda boş dizi dönelim ki sayfa çökmesin
    return [];
  }
  if (!tenantsData || tenantsData.length === 0) {
    return []; // Tenant yoksa boş dön
  }

  // 2. Adım: Her tenant için ayrı ayrı kullanıcı e-postasını çek
  const tenantsWithEmails = await Promise.all(
    tenantsData.map(async (tenant) => {
      let userEmail = null;
      if (tenant.admin_user_id) {
        try {
          const { data: userData, error: userError } =
            await supabaseAdmin.auth.admin.getUserById(tenant.admin_user_id);
          if (userError) {
            console.warn(
              `Kullanıcı çekilemedi (ID: ${tenant.admin_user_id}):`,
              userError.message
            );
          } else {
            userEmail = userData?.user?.email;
          }
        } catch (e) {
          console.error(
            `Beklenmedik hata getUserById (ID: ${tenant.admin_user_id}):`,
            e
          );
        }
      }
      return {
        ...tenant,
        admin_email: userEmail, // Yeni alan: admin_email
      };
    })
  );

  return tenantsWithEmails;
}

// Sayfa Bileşeni (Sunucuda Render Edilir)
export default async function SuperAdminTenantsPage() {
  const tenants = await getTenantsWithEmails();

  // Helper fonksiyonlar (const ile doğru şekilde tanımlandı)
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    try {
      return new Date(dateString).toLocaleDateString("tr-TR", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (e) {
      return "Geçersiz Tarih";
    }
  };
  const formatDateTime = (dateString) => {
    if (!dateString) return "-";
    try {
      return new Date(dateString).toLocaleString("tr-TR", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {
      return "Geçersiz Tarih";
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Müşteri Yönetimi (Tenants)</h1>
        <Link
          href="/super-admin/tenants/new"
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
        >
          + Yeni Müşteri Ekle
        </Link>
      </div>

      {/* Müşteri Listesi Tablosu */}
      <div className="bg-white shadow-md rounded-lg overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Şirket Adı
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Yönetici Email
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Durum
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Abonelik Bitiş
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Oluşturulma
              </th>
              <th scope="col" className="relative px-6 py-3">
                Eylemler
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {tenants.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                  Henüz hiç müşteri (tenant) bulunmuyor.
                </td>
              </tr>
            ) : (
              tenants.map((tenant) => (
                <tr key={tenant.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {tenant.company_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {tenant.admin_email || (
                      <span className="text-red-500 italic">
                        Email Yok/Bulunamadı
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {tenant.is_active ? (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        Aktif
                      </span>
                    ) : (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                        Pasif
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(tenant.subscription_expires_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDateTime(tenant.created_at)}
                  </td>
                  <td className="px-6 py-4">
                    {/* Client Component eylem butonlarını render ediyor */}
                    <TenantActions tenant={tenant} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
