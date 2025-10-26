// app/super-admin/tenants/actions.js
"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
// Bu import sadece addTenantAction'da kullanılır.
// updateTenantStatusAction ve deleteTenantAction bu dosyada tanımlanmıştır.

// --- SUNUCU TARAFI SUPABASE ADMİN İSTEMCİSİ ---
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_KEY || ""
);
// --- ---

// --- 1. YENİ MÜŞTERİ EKLEME ACTION'I (new/page.js tarafından çağrılır) ---
export async function addTenantAction(formData) {
  const companyName = formData.get("company_name")?.toString();
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();
  const subscriptionDate = formData.get("subscription_expires_at")?.toString();

  if (!companyName || !email || !password) {
    return { error: "Şirket adı, email ve şifre zorunludur." };
  }
  if (password.length < 8) {
    return { error: "Şifre en az 8 karakter olmalıdır." };
  }

  let newUserId = null;

  try {
    // Auth Kullanıcısı Oluştur
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
      });

    if (authError) {
      if (
        authError.message.includes(
          "duplicate key value violates unique constraint"
        )
      ) {
        return { error: `Bu e-posta adresi (${email}) zaten kullanılıyor.` };
      }
      throw new Error(`Auth kullanıcısı oluşturulamadı: ${authError.message}`);
    }

    if (!authData?.user?.id) {
      throw new Error("Kullanıcı oluşturuldu ancak ID alınamadı.");
    }
    newUserId = authData.user.id;

    // Tenants Tablosuna Kayıt Ekle
    const { error: tenantInsertError } = await supabaseAdmin
      .from("tenants")
      .insert({
        company_name: companyName,
        admin_user_id: newUserId,
        is_active: true,
        subscription_expires_at: subscriptionDate || null,
      });

    if (tenantInsertError) {
      console.error(
        `Tenant eklenemedi. Auth kullanıcısı (${newUserId}) siliniyor...`
      );
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      throw new Error(
        `Tenant kaydı oluşturulamadı: ${tenantInsertError.message}`
      );
    }
  } catch (error) {
    console.error("addTenantAction Hatası:", error);
    return {
      error: error.message || "Müşteri eklenirken bilinmeyen bir hata oluştu.",
    };
  }

  // Başarılıysa listeye geri yönlendir
  revalidatePath("/super-admin/tenants");
  redirect("/super-admin/tenants");
}

// --- 2. DURUM GÜNCELLEME ACTION'I (page.js tarafından çağrılır) ---
export async function updateTenantStatusAction(tenantId, newStatus) {
  if (!tenantId) {
    return { error: "Tenant ID eksik." };
  }

  try {
    const { error } = await supabaseAdmin
      .from("tenants")
      .update({ is_active: newStatus })
      .eq("id", tenantId);

    if (error) {
      throw new Error(`Tenant durumu güncellenemedi: ${error.message}`);
    }

    // Cache'i temizle
    revalidatePath("/super-admin/tenants");
    return { success: true };
  } catch (error) {
    console.error("updateTenantStatusAction Hatası:", error);
    return {
      error:
        error.message || "Durum güncellenirken bilinmeyen bir hata oluştu.",
    };
  }
}

// --- 3. SİLME ACTION'I (page.js tarafından çağrılır) ---
export async function deleteTenantAction(tenantId) {
  if (!tenantId) {
    return { error: "Tenant ID eksik." };
  }

  try {
    // 1. Önce tenant'ın admin_user_id'sini bul
    const { data: tenantData, error: tenantError } = await supabaseAdmin
      .from("tenants")
      .select("admin_user_id")
      .eq("id", tenantId)
      .single();

    if (tenantError)
      throw new Error(`Tenant bulunamadı: ${tenantError.message}`);
    const userId = tenantData.admin_user_id;

    // 2. Tenant kaydını sil (CASCADE sayesinde diğer tablolar da temizlenir)
    const { error: deleteTenantError } = await supabaseAdmin
      .from("tenants")
      .delete()
      .eq("id", tenantId);

    if (deleteTenantError)
      throw new Error(`Tenant kaydı silinemedi: ${deleteTenantError.message}`);

    // 3. Auth kullanıcısını sil
    if (userId) {
      const { error: deleteUserError } =
        await supabaseAdmin.auth.admin.deleteUser(userId);
      if (deleteUserError) {
        console.warn(
          `Auth kullanıcısı silinemedi (${userId}): ${deleteUserError.message}. Kayıt silindi, kullanıcı kaldı.`
        );
      }
    }

    revalidatePath("/super-admin/tenants");
    return { success: true };
  } catch (error) {
    console.error("deleteTenantAction Hatası:", error);
    return {
      error: error.message || "Silme işlemi sırasında bir hata oluştu.",
    };
  }
}
