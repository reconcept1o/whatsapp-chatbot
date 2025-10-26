// app/super-admin/tenants/TenantActions.js
"use client"; // <-- Bu satır, bileşeni Client Component yapar

import { updateTenantStatusAction, deleteTenantAction } from "./actions"; // Server Action'ları import et

// Bu bileşen, her bir tenant satırının eylem butonlarını render eder
export default function TenantActions({ tenant }) {
  // Silme onayı ve action'ı çağırma
  const handleDelete = (event) => {
    if (
      !window.confirm(
        `"${tenant.company_name}" müşterisini silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`
      )
    ) {
      event.preventDefault(); // Formun gönderilmesini engelle
    }
    // Onaylanırsa form normal şekilde Server Action'ı tetikler
  };

  return (
    <div className="whitespace-nowrap text-right text-sm font-medium space-x-2">
      {/* Düzenle Butonu (Placeholder) */}
      <button
        className="text-indigo-600 hover:text-indigo-900 disabled:opacity-50"
        disabled
      >
        Düzenle
      </button>

      {/* Aktif Et / Pasif Yap Formları */}
      {tenant.is_active ? (
        <form
          action={updateTenantStatusAction.bind(null, tenant.id, false)}
          className="inline"
        >
          <button
            type="submit"
            className="text-yellow-600 hover:text-yellow-900"
          >
            Pasif Yap
          </button>
        </form>
      ) : (
        <form
          action={updateTenantStatusAction.bind(null, tenant.id, true)}
          className="inline"
        >
          <button type="submit" className="text-green-600 hover:text-green-900">
            Aktif Et
          </button>
        </form>
      )}

      {/* Sil Formu (onClick burada artık GÜVENLİ) */}
      <form
        action={deleteTenantAction.bind(null, tenant.id)}
        className="inline"
      >
        <button
          type="submit"
          className="text-red-600 hover:text-red-900"
          onClick={handleDelete} // Client Component içinde onClick kullanabiliriz
        >
          Sil
        </button>
      </form>
    </div>
  );
}
