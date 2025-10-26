// app/(admin)/settings/page.js
"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

// Arayüzü 'Genel', 'Davranış' ve 'Gelişmiş' olarak 3 sekmeye ayırıyoruz
const TABS = ["Genel", "Akıllı Davranış", "Gelişmiş"];

export default function SettingsPage() {
  // 1. STATE TANIMLAMALARI
  const [activeTab, setActiveTab] = useState(TABS[0]); // Hangi sekmenin aktif olduğunu tutar
  const [textSettings, setTextSettings] = useState({}); // bot_settings (metinler)
  const [profileSettings, setProfileSettings] = useState({}); // bot_profile (davranışlar)
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: "", content: "" });

  // 2. VERİ ÇEKME (Değişiklik yok, kodumuz zaten iki tabloyu da çekiyordu)
  useEffect(() => {
    async function fetchAllSettings() {
      setLoading(true);
      setMessage({ type: "", content: "" });
      try {
        const [settingsResult, profileResult] = await Promise.all([
          supabase.from("bot_settings").select("setting_key, setting_value"),
          supabase.from("bot_profile").select("*").maybeSingle(),
        ]);

        if (settingsResult.error) throw settingsResult.error;
        if (profileResult.error) throw profileResult.error;

        const settingsObject = settingsResult.data.reduce((acc, setting) => {
          acc[setting.setting_key] = setting.setting_value;
          return acc;
        }, {});
        setTextSettings(settingsObject);

        if (profileResult.data) {
          setProfileSettings(profileResult.data);
        }
      } catch (error) {
        console.error("Ayarlar çekilirken hata:", error);
        setMessage({
          type: "error",
          content: "Ayarlar yüklenemedi: " + error.message,
        });
      } finally {
        setLoading(false);
      }
    }
    fetchAllSettings();
  }, []);

  // 3. FORM GÜNCELLEME FONKSİYONLARI (Form alanları için)
  const handleTextChange = (e) => {
    const { name, value } = e.target;
    setTextSettings((prev) => ({ ...prev, [name]: value }));
  };
  const handleProfileChange = (e) => {
    const { name, value, type, checked } = e.target;
    // 'type'a göre 'value' veya 'checked' al
    const val = type === "checkbox" ? checked : value;
    setProfileSettings((prev) => ({ ...prev, [name]: val }));
  };

  // 4. KAYDETME FONKSİYONU (Değişiklik yok, kodumuz zaten dinamik)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", content: "" });
    try {
      const { data: tenantData, error: tenantError } = await supabase
        .from("tenants")
        .select("id")
        .single();
      if (tenantError || !tenantData)
        throw new Error("Müşteri (tenant) bilgisi bulunamadı.");
      const tenantId = tenantData.id;

      // Görev 1: Metinleri (bot_settings) güncelle
      const textDataToUpsert = Object.entries(textSettings)
        .map(([key, value]) => ({
          tenant_id: tenantId,
          setting_key: key,
          setting_value: value,
        }))
        .filter((d) => d.setting_value);
      const { error: settingsError } = await supabase
        .from("bot_settings")
        .upsert(textDataToUpsert, { onConflict: "tenant_id, setting_key" });
      if (settingsError) throw settingsError;

      // Görev 2: Profili (bot_profile) güncelle
      const profileDataToUpsert = { ...profileSettings, tenant_id: tenantId };
      const { error: profileError } = await supabase
        .from("bot_profile")
        .upsert(profileDataToUpsert, { onConflict: "tenant_id" });
      if (profileError) throw profileError;

      setMessage({ type: "success", content: "Ayarlar başarıyla kaydedildi!" });
    } catch (error) {
      console.error("Ayarlar kaydedilirken hata:", error);
      setMessage({ type: "error", content: "Hata: " + error.message });
    } finally {
      setLoading(false);
    }
  };

  // 5. RENDER (GÖRÜNÜM - Sekmeli (Tabbed) Tasarım)
  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold">Bot Ayarları</h1>
        <p className="mt-4">Ayarlar yükleniyor...</p>
      </div>
    );
  }

  // Helper component (JSX) for form fields
  const FormInput = ({
    id,
    label,
    type = "text",
    value,
    onChange,
    placeholder,
    hint,
    rows,
  }) => (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-medium leading-6 text-gray-900"
      >
        {label}
      </label>
      {hint && <p className="text-xs text-gray-500 mb-2">{hint}</p>}
      {type === "textarea" ? (
        <textarea
          id={id}
          name={id}
          rows={rows || 3}
          value={value || ""}
          onChange={onChange}
          className="block w-full rounded-md border-0 p-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300"
          placeholder={placeholder}
        />
      ) : (
        <input
          id={id}
          name={id}
          type={type}
          value={value || (type === "time" ? "00:00" : "")}
          onChange={onChange}
          className="block w-full rounded-md border-0 p-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300"
          placeholder={placeholder}
        />
      )}
    </div>
  );
  const FormToggle = ({ id, label, checked, onChange, hint }) => (
    <div className="relative flex items-start">
      <div className="flex h-6 items-center">
        <input
          id={id}
          name={id}
          type="checkbox"
          checked={checked || false}
          onChange={onChange}
          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
        />
      </div>
      <div className="ml-3 text-sm leading-6">
        <label htmlFor={id} className="font-medium text-gray-900">
          {label}
        </label>
        {hint && <p className="text-gray-500 text-xs">{hint}</p>}
      </div>
    </div>
  );
  const FormSection = ({ title, children }) => (
    <div className="space-y-6 bg-white p-6 shadow-md rounded-lg col-span-1">
      <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">
        {title}
      </h2>
      {children}
    </div>
  );

  return (
    <form onSubmit={handleSubmit}>
      {/* Üst Başlık ve Kaydet Butonu */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Bot Ayarları</h1>
          <p className="mt-1 text-gray-600">
            Botunuzun davranışlarını, cevaplarını ve entegrasyonlarını yönetin.
          </p>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:bg-indigo-400 h-10"
        >
          {loading ? "Kaydediliyor..." : "Ayarları Kaydet"}
        </button>
      </div>

      {message.content && (
        <div
          className={`p-4 rounded-md mb-6 ${
            message.type === "error"
              ? "bg-red-100 text-red-700"
              : "bg-green-100 text-green-700"
          }`}
        >
          {message.content}
        </div>
      )}

      {/* --- YENİ SEKMELİ (TABBED) YAPI --- */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`
                ${
                  tab === activeTab
                    ? "border-indigo-500 text-indigo-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
              `}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Sekme İçerikleri */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* --- SEKME 1: GENEL (Temel Cevaplar ve İşletme Bilgileri) --- */}
        <div
          className={`${
            activeTab === "Genel" ? "block" : "hidden"
          } lg:col-span-2 grid grid-cols-1 lg:grid-cols-2 gap-6`}
        >
          <FormSection title="Temel Cevaplar">
            <FormInput
              id="welcome_message"
              name="welcome_message"
              label="Karşılama Mesajı"
              type="textarea"
              value={textSettings.welcome_message}
              onChange={handleTextChange}
              hint="Kullanıcı bota ilk yazdığında verilecek cevap."
            />
            <FormInput
              id="default_reply"
              name="default_reply"
              label="Varsayılan Cevap (Anlayamadım)"
              type="textarea"
              value={textSettings.default_reply}
              onChange={handleTextChange}
              hint="Bot, kullanıcının niyetini anlayamadığında verilecek cevap."
            />
            <FormInput
              id="out_of_hours_message"
              name="out_of_hours_message"
              label="Mesai Dışı Cevap Metni"
              type="textarea"
              value={textSettings.out_of_hours_message}
              onChange={handleTextChange}
              hint="'Gelişmiş' sekmesindeki ayar aktifse bu metin gönderilir."
            />
            <FormInput
              id="handover_message"
              name="handover_message"
              label="Operatöre Devir Mesajı"
              type="textarea"
              value={profileSettings.handover_message}
              onChange={handleProfileChange}
              hint="'Akıllı Davranış' sekmesindeki ayar aktifse bu metin gönderilir."
            />
          </FormSection>

          <FormSection title="İşletme Bilgileri">
            <FormInput
              id="company_info"
              name="company_info"
              label="İşletme Bilgisi (Hakkında)"
              type="textarea"
              rows={6}
              value={textSettings.company_info}
              onChange={handleTextChange}
              hint="Adres, kimsiniz gibi sorular için temel bilgi."
            />
            <FormInput
              id="business_hours"
              name="business_hours"
              label="Çalışma Saatleri (Metin)"
              type="textarea"
              rows={4}
              value={textSettings.business_hours}
              onChange={handleTextChange}
              hint="Mesai saatlerini belirten metin."
              placeholder="Örn: Hafta içi: 09:00 - 18:00"
            />
            <FormInput
              id="contact_phone"
              name="contact_phone"
              label="İletişim Telefonu"
              type="text"
              value={textSettings.contact_phone}
              onChange={handleTextChange}
              placeholder="+90 555 123 4567"
            />
            <FormInput
              id="website_url"
              name="website_url"
              label="Web Sitesi"
              type="text"
              value={textSettings.website_url}
              onChange={handleTextChange}
              placeholder="https://www.orneksite.com"
            />
          </FormSection>
        </div>

        {/* --- SEKME 2: AKILLI DAVRANIŞ (AI, Kişiselleştirme, Veri Toplama, İnsan-Devir) --- */}
        <div
          className={`${
            activeTab === "Akıllı Davranış" ? "block" : "hidden"
          } lg:col-span-2 grid grid-cols-1 lg:grid-cols-2 gap-6`}
        >
          <FormSection title="Yapay Zeka (AI)">
            <FormToggle
              id="ai_enabled"
              name="ai_enabled"
              label="Yapay Zeka (AI) Cevapları Aktif"
              checked={profileSettings.ai_enabled}
              onChange={handleProfileChange}
              hint="Bot, niyet (intent) bulamazsa AI ile cevap versin mi?"
            />
            <FormInput
              id="ai_prompt"
              name="ai_prompt"
              label="AI Kişilik Profili (Prompt)"
              type="textarea"
              rows={6}
              value={profileSettings.ai_prompt}
              onChange={handleProfileChange}
              placeholder="Sen X Kebap adına konuşan, samimi ve esprili bir asistansın. Her zaman kısa cevaplar ver."
            />
          </FormSection>

          <FormSection title="Kişiselleştirme & Veri Toplama">
            <FormToggle
              id="personalization_enabled"
              name="personalization_enabled"
              label="Kişiselleştirme Aktif"
              checked={profileSettings.personalization_enabled}
              onChange={handleProfileChange}
              hint="Bot, kullanıcının adını biliyorsa 'Merhaba {isim}' diye hitap etsin mi?"
            />
            <FormToggle
              id="capture_user_name"
              name="capture_user_name"
              label="Kullanıcı Adını Otomatik Sor"
              checked={profileSettings.capture_user_name}
              onChange={handleProfileChange}
              hint="Bot, konuşmanın başında 'Adınız nedir?' diye sorsun mu?"
            />
            <FormToggle
              id="capture_user_email"
              name="capture_user_email"
              label="Kullanıcı E-postasını Otomatik Sor"
              checked={profileSettings.capture_user_email}
              onChange={handleProfileChange}
              hint="Bot, konuşmanın başında 'Emailiniz nedir?' diye sorsun mu?"
            />
          </FormSection>

          <FormSection title="Müşteri Temsilcisine Devir (Handover)">
            <FormToggle
              id="handover_enabled"
              name="handover_enabled"
              label="Müşteri Temsilcisine Devir Aktif"
              checked={profileSettings.handover_enabled}
              onChange={handleProfileChange}
              hint="Bot, belirli durumlarda konuşmayı operatöre devretsin mi?"
            />
            <FormInput
              id="handover_keyword"
              name="handover_keyword"
              label="Devir Tetikleme Kelimesi"
              type="text"
              value={profileSettings.handover_keyword}
              onChange={handleProfileChange}
              hint="Kullanıcı bu kelimeyi yazarsa (örn: temsilci) bota devredilir."
            />
            <FormInput
              id="handover_fails_count"
              name="handover_fails_count"
              label="Hata Sayısı Sonrası Devir"
              type="number"
              value={profileSettings.handover_fails_count}
              onChange={handleProfileChange}
              hint="Bot, bu kadar 'anlayamadım' cevabı verirse otomatik devretsin."
            />
          </FormSection>
        </div>

        {/* --- SEKME 3: GELİŞMİŞ (Çalışma Saatleri, Entegrasyonlar, Spam Koruması) --- */}
        <div
          className={`${
            activeTab === "Gelişmiş" ? "block" : "hidden"
          } lg:col-span-2 grid grid-cols-1 lg:grid-cols-2 gap-6`}
        >
          <FormSection title="Çalışma Saatleri Ayarları">
            <FormToggle
              id="out_of_hours_reply_enabled"
              name="out_of_hours_reply_enabled"
              label="Mesai Dışı Otomatik Cevap Aktif"
              checked={profileSettings.out_of_hours_reply_enabled}
              onChange={handleProfileChange}
              hint="Bot, sadece belirlenen çalışma saatleri dışında 'Mesai Dışı Cevabı'nı göndersin."
            />
            <label className="block text-sm font-medium leading-6 text-gray-900">
              Hafta İçi Saatleri
            </label>
            <div className="flex gap-4">
              <FormInput
                id="work_hours_weekday_start"
                name="work_hours_weekday_start"
                label="Başlangıç"
                type="time"
                value={profileSettings.work_hours_weekday_start}
                onChange={handleProfileChange}
              />
              <FormInput
                id="work_hours_weekday_end"
                name="work_hours_weekday_end"
                label="Bitiş"
                type="time"
                value={profileSettings.work_hours_weekday_end}
                onChange={handleProfileChange}
              />
            </div>
            <label className="block text-sm font-medium leading-6 text-gray-900">
              Hafta Sonu Saatleri (Boş bırakmak = Kapalı)
            </label>
            <div className="flex gap-4">
              <FormInput
                id="work_hours_weekend_start"
                name="work_hours_weekend_start"
                label="Başlangıç"
                type="time"
                value={profileSettings.work_hours_weekend_start}
                onChange={handleProfileChange}
              />
              <FormInput
                id="work_hours_weekend_end"
                name="work_hours_weekend_end"
                label="Bitiş"
                type="time"
                value={profileSettings.work_hours_weekend_end}
                onChange={handleProfileChange}
              />
            </div>
          </FormSection>

          <FormSection title="Entegrasyonlar & Bildirimler">
            <FormInput
              id="notification_email"
              name="notification_email"
              label="Bildirim E-postası"
              type="email"
              value={profileSettings.notification_email}
              onChange={handleProfileChange}
              hint="Yeni bir olay (devir, sipariş) olduğunda kime e-posta gitsin?"
              placeholder="bildirimler@sirketiniz.com"
            />
            <FormInput
              id="webhook_url"
              name="webhook_url"
              label="Webhook URL"
              type="text"
              value={profileSettings.webhook_url}
              onChange={handleProfileChange}
              hint="Bot, veriyi (örn: sipariş) hangi URL'e göndermeli?"
              placeholder="https://sizin-siteniz.com/api/siparis-al"
            />
          </FormSection>

          <FormSection title="Spam Koruması">
            <FormInput
              id="spam_trigger_count"
              name="spam_trigger_count"
              label="Spam Mesaj Limiti (1 Dk)"
              type="number"
              value={profileSettings.spam_trigger_count}
              onChange={handleProfileChange}
              hint="Kullanıcı 1 dk içinde bu sayıdan fazla mesaj atarsa spam sayılır."
            />
            <FormInput
              id="spam_lockout_duration"
              name="spam_lockout_duration"
              label="Spam Engelleme Süresi (Dakika)"
              type="number"
              value={profileSettings.spam_lockout_duration}
              onChange={handleProfileChange}
              hint="Spam yapan kullanıcı kaç dakika engellensin?"
            />
          </FormSection>
        </div>
      </div>
    </form>
  );
}
