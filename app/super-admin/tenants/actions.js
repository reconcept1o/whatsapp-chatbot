// app/super-admin/tenants/actions.js
"use server"; // Bu dosyanın Server Action'lar içerdiğini belirtir

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

// --- SUNUCU TARAFI SUPABASE ADMİN İSTEMCİSİ ---
// Service Role Key ile RLS'i atlar
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_KEY || ""
);
// --- ---

// --- TENANT DURUMUNU GÜNCELLEME ACTION'I ---
export async function updateTenantStatusAction(tenantId, newStatus) {
  if (!tenantId) {
    return { error: "Tenant ID eksik." };
  }
  if (typeof newStatus !== "boolean") {
    return { error: "Geçersiz durum değeri." };
  }

  try {
    const { error } = await supabaseAdmin
      .from("tenants")
      .update({ is_active: newStatus }) // is_active kolonunu güncelle
      .eq("id", tenantId); // Sadece bu ID'ye sahip tenant için

    if (error) {
      throw new Error(`Tenant durumu güncellenemedi: ${error.message}`);
    }

    console.log(
      `Tenant ${tenantId} durumu ${
        newStatus ? "Aktif" : "Pasif"
      } olarak güncellendi.`
    );

    // Listeleme sayfasının cache'ini temizle ki güncel veri görünsün
    revalidatePath("/super-admin/tenants");

    return { success: true }; // Başarılı olduğunu belirt
  } catch (error) {
    console.error("updateTenantStatusAction Hatası:", error);
    return {
      error:
        error.message || "Durum güncellenirken bilinmeyen bir hata oluştu.",
    };
  }
}

// --- TODO: TENANT SİLME ACTION'I BURAYA EKLENECEK ---
export async function deleteTenantAction(tenantId) {
  console.warn(
    `TODO: Tenant silme işlemi (${tenantId}) henüz implemente edilmedi.`
  );
  // Buraya supabaseAdmin.from('tenants').delete().eq('id', tenantId);
  // Ve supabaseAdmin.auth.admin.deleteUser(adminUserId); kodları gelecek.
  revalidatePath("/super-admin/tenants");
  return { error: "Silme işlemi henüz aktif değil." };
}
