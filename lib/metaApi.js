// lib/metaApi.js

// .env dosyalarından Meta anahtarlarını çek
const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID;

// Doğru API URL'i: PHONE_NUMBER_ID kullanıyoruz.
const META_API_URL = `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`;

/**
 * Kullanıcıya metin mesajı gönderir.
 * @param {string} to - Kullanıcının telefon numarası (örn: 905551234567)
 * @param {string} text - Gönderilecek mesajın içeriği
 */
export async function sendTextMessage(to, text) {
  if (!ACCESS_TOKEN || !PHONE_NUMBER_ID) {
    console.error("Meta API anahtarları eksik! (.env dosyasını kontrol et)");
    // Eksik ENV değişkeni hatası fırlat
    throw new Error("META_ACCESS_TOKEN veya PHONE_NUMBER_ID eksik!");
  }

  try {
    const response = await fetch(META_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: to,
        type: "text",
        text: {
          preview_url: false,
          body: text,
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      // Hata detayını yakala
      const errorMessage = data.error?.message || "Bilinmeyen Meta Hatası";
      console.error("Meta API Hata Detayı:", errorMessage);
      throw new Error(`Meta API'ye mesaj gönderilemedi: ${errorMessage}`);
    }

    console.log("Mesaj başarıyla gönderildi:", data);
    return data;
  } catch (error) {
    // Bu, ağ hatası veya diğer beklenmedik hatalar için
    console.error("Mesaj gönderme fonksiyonunda kök hata:", error.message);
    throw error; // POST fonksiyonunun ana try/catch bloğuna ilet
  }
}
