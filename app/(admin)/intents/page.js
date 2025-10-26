// app/(admin)/intents/page.js
"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function IntentsPage() {
  // --- STATE TANIMLAMALARI ---
  const [intents, setIntents] = useState([]); // Tüm niyetleri ve örneklerini tutar
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [newIntentName, setNewIntentName] = useState(""); // Yeni niyet ekleme formu
  const [newExampleText, setNewExampleText] = useState(""); // Yeni örnek ekleme formu
  const [editingIntentId, setEditingIntentId] = useState(null); // Hangi niyetin örneğini ekliyoruz?

  // --- 1. VERİ ÇEKME ---
  const fetchIntentsAndExamples = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      // RLS sayesinde sadece bu müşterinin niyetlerini ve onlara bağlı örnekleri çeker
      const { data, error } = await supabase
        .from("intents")
        .select(
          `
          id,
          intent_name,
          intent_examples ( id, example_text )
        `
        )
        .order("intent_name", { ascending: true }); // Alfabetik sırala

      if (error) throw error;
      setIntents(data || []);
    } catch (error) {
      console.error("Niyetler ve örnekler çekilirken hata:", error);
      setMessage("Hata: Niyetler yüklenemedi. " + error.message);
    } finally {
      setLoading(false);
    }
  }, []); // Bağımlılığı yok, sadece bir kez çalışacak şekilde referans

  // Sayfa yüklendiğinde verileri çek
  useEffect(() => {
    fetchIntentsAndExamples();
  }, [fetchIntentsAndExamples]); // fetchIntentsAndExamples'ı dependency array'e ekle

  // --- 2. YENİ NİYET EKLEME ---
  const handleAddIntent = async (e) => {
    e.preventDefault();
    if (!newIntentName.trim()) return; // Boşsa ekleme
    setLoading(true);
    setMessage("");

    try {
      // Önce tenant_id'yi bul (RLS bunu yazma için gerektirir)
      const { data: tenantData, error: tenantError } = await supabase
        .from("tenants")
        .select("id")
        .single();
      if (tenantError || !tenantData)
        throw new Error("Müşteri (tenant) bilgisi bulunamadı.");
      const tenantId = tenantData.id;

      // Yeni niyeti 'intents' tablosuna ekle
      const { error } = await supabase.from("intents").insert({
        tenant_id: tenantId,
        intent_name: newIntentName.trim(),
      });

      if (error) throw error;

      setNewIntentName(""); // Formu temizle
      setMessage(`Niyet "${newIntentName.trim()}" başarıyla eklendi.`);
      await fetchIntentsAndExamples(); // Listeyi yenile
    } catch (error) {
      console.error("Niyet eklenirken hata:", error);
      // Unique constraint hatasını yakala (aynı isimde niyet varsa)
      if (error.code === "23505") {
        setMessage(
          `Hata: "${newIntentName.trim()}" adında bir niyet zaten var.`
        );
      } else {
        setMessage("Hata: Niyet eklenemedi. " + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // --- 3. NİYET SİLME ---
  const handleDeleteIntent = async (intentId, intentName) => {
    // Güvenlik onayı
    if (
      !window.confirm(
        `"${intentName}" niyetini ve tüm örneklerini silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`
      )
    ) {
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      // Supabase cascade delete (SQL'de ON DELETE CASCADE tanımladık)
      // sayesinde sadece intent'i silmemiz yeterli, örnekleri otomatik silinir.
      const { error } = await supabase
        .from("intents")
        .delete()
        .match({ id: intentId }); // RLS zaten doğru tenant'ı garantiler

      if (error) throw error;

      setMessage(`Niyet "${intentName}" başarıyla silindi.`);
      await fetchIntentsAndExamples(); // Listeyi yenile
    } catch (error) {
      console.error("Niyet silinirken hata:", error);
      setMessage("Hata: Niyet silinemedi. " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // --- 4. YENİ ÖRNEK EKLEME ---
  const handleAddExample = async (e) => {
    e.preventDefault();
    if (!newExampleText.trim() || !editingIntentId) return;
    setLoading(true);
    // setMessage(''); // Anlık mesaj için bunu temizleme

    try {
      // Yeni örneği 'intent_examples' tablosuna ekle
      const { error } = await supabase.from("intent_examples").insert({
        intent_id: editingIntentId,
        example_text: newExampleText.trim(),
      });

      if (error) throw error;

      setNewExampleText(""); // Formu temizle
      //setMessage(`Örnek "${newExampleText.trim()}" başarıyla eklendi.`);
      await fetchIntentsAndExamples(); // Listeyi yenile
      // editingIntentId'yi sıfırlamıyoruz, kullanıcı aynı niyete birden fazla örnek ekleyebilir.
    } catch (error) {
      console.error("Örnek eklenirken hata:", error);
      setMessage("Hata: Örnek eklenemedi. " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // --- 5. ÖRNEK SİLME ---
  const handleDeleteExample = async (exampleId, exampleText) => {
    if (
      !window.confirm(
        `"${exampleText}" örneğini silmek istediğinizden emin misiniz?`
      )
    ) {
      return;
    }
    setLoading(true);
    // setMessage('');
    try {
      const { error } = await supabase
        .from("intent_examples")
        .delete()
        .match({ id: exampleId }); // RLS zaten doğru intent'e ait olduğunu garantiler (dolaylı olarak)

      if (error) throw error;

      //setMessage(`Örnek "${exampleText}" başarıyla silindi.`);
      await fetchIntentsAndExamples(); // Listeyi yenile
    } catch (error) {
      console.error("Örnek silinirken hata:", error);
      setMessage("Hata: Örnek silinemedi. " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // --- 6. RENDER ---
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Niyetler (Intents) Yönetimi</h1>
      <p className="mb-6 text-gray-600">
        Botunuzun anlayabileceği komutları (niyetleri) ve bu komutları
        tetikleyecek örnek cümleleri buradan yönetin. Burada oluşturduğunuz
        niyetler, "Akış Tasarımcısı" sayfasında tetikleyici olarak
        kullanılabilir.
      </p>

      {/* Mesaj Alanı */}
      {message && (
        <div
          className={`p-4 rounded-md mb-6 ${
            message.startsWith("Hata:")
              ? "bg-red-100 text-red-700"
              : "bg-green-100 text-green-700"
          }`}
        >
          {message}
        </div>
      )}

      {/* Yeni Niyet Ekleme Formu */}
      <form
        onSubmit={handleAddIntent}
        className="mb-8 p-4 bg-gray-50 rounded-lg border"
      >
        <h2 className="text-lg font-semibold mb-2">Yeni Niyet Ekle</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={newIntentName}
            onChange={(e) => setNewIntentName(e.target.value)}
            placeholder="Niyet Adı (örn: fiyat_sor, randevu_al)"
            disabled={loading}
            className="flex-grow rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
          <button
            type="submit"
            disabled={loading || !newIntentName.trim()}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed"
          >
            {loading ? "Ekleniyor..." : "Niyet Ekle"}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Niyet adı boşluksuz, Türkçe karakter olmadan ve kısa olmalıdır.
        </p>
      </form>

      {/* Mevcut Niyetler Listesi */}
      {loading && intents.length === 0 && <p>Niyetler yükleniyor...</p>}
      {!loading && intents.length === 0 && !message.startsWith("Hata:") && (
        <p className="text-gray-500">
          Henüz hiç niyet oluşturulmamış. Yukarıdaki formdan ekleyebilirsiniz.
        </p>
      )}

      <div className="space-y-6">
        {intents.map((intent) => (
          <div
            key={intent.id}
            className="bg-white p-6 shadow-md rounded-lg border"
          >
            {/* Niyet Başlığı ve Silme Butonu */}
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h3 className="text-xl font-semibold text-gray-800">
                {intent.intent_name}
              </h3>
              <button
                onClick={() =>
                  handleDeleteIntent(intent.id, intent.intent_name)
                }
                disabled={loading}
                className="text-red-600 hover:text-red-800 text-sm disabled:opacity-50"
                title="Niyeti Sil"
              >
                Sil
              </button>
            </div>

            {/* Örnek Cümleler Listesi */}
            <div className="mb-4">
              <h4 className="text-md font-medium text-gray-700 mb-2">
                Örnek Cümleler ({intent.intent_examples.length}):
              </h4>
              {intent.intent_examples.length === 0 ? (
                <p className="text-sm text-gray-500">
                  Bu niyet için henüz örnek cümle eklenmemiş.
                </p>
              ) : (
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 max-h-40 overflow-y-auto pr-2">
                  {intent.intent_examples.map((example) => (
                    <li
                      key={example.id}
                      className="flex justify-between items-center group"
                    >
                      <span>{example.example_text}</span>
                      <button
                        onClick={() =>
                          handleDeleteExample(example.id, example.example_text)
                        }
                        disabled={loading}
                        className="text-red-500 hover:text-red-700 text-xs ml-2 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                        title="Örneği Sil"
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Yeni Örnek Ekleme Formu (O niyete özel) */}
            <form onSubmit={handleAddExample} className="mt-4 pt-4 border-t">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Yeni Örnek Ekle:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={editingIntentId === intent.id ? newExampleText : ""} // Sadece aktif formda göster
                  onFocus={() => {
                    setEditingIntentId(intent.id);
                    setNewExampleText("");
                  }} // Forma tıklayınca aktif et
                  onChange={(e) => {
                    if (editingIntentId === intent.id)
                      setNewExampleText(e.target.value);
                  }}
                  placeholder="Kullanıcının yazabileceği örnek bir cümle"
                  disabled={loading}
                  className="flex-grow rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
                <button
                  type="submit"
                  disabled={
                    loading ||
                    editingIntentId !== intent.id ||
                    !newExampleText.trim()
                  }
                  onClick={() => setEditingIntentId(intent.id)} // Butona basınca da aktif et
                  className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-green-500 disabled:bg-green-400 disabled:cursor-not-allowed"
                >
                  {loading && editingIntentId === intent.id
                    ? "Ekleniyor..."
                    : "Örnek Ekle"}
                </button>
              </div>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
