// lib/metaApi.js

// .env dosyalarından Meta anahtarlarını çek
const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID;

// Meta API'sinin ana URL'i
const META_API_URL = `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`;

/**
 * Kullanıcıya metin mesajı gönderir.
 * @param {string} to - Kullanıcının telefon numarası (örn: 905551234567)
 * @param {string} text - Gönderilecek mesajın içeriği
 */
export async function sendTextMessage(to, text) {
  if (!ACCESS_TOKEN || !PHONE_NUMBER_ID) {
    console.error("Meta API anahtarları eksik! (.env dosyasını kontrol et)");
    return;
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
          preview_url: false, // Link önizlemelerini kapat (genellikle istenir)
          body: text,
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Meta API Hata:", data);
      throw new Error(
        `Meta API'ye mesaj gönderilemedi: ${data.error?.message}`
      );
    }

    console.log("Mesaj başarıyla gönderildi:", data);
    return data;
  } catch (error) {
    console.error("Mesaj gönderme fonksiyonunda hata:", error);
  }
}

// TODO: Gelecekte buraya butonlu mesaj (sendButtonMessage)
// veya listeli mesaj (sendListMessage) gönderme fonksiyonları da eklenebilir.
