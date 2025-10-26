// lib/nlpManager.js
import { NlpManager } from "node-nlp";

/**
 * Müşteriye özel NLU motorunu eğitir ve bir mesajı işler.
 * @param {string} message - Kullanıcının gönderdiği mesaj (örn: "fiyat nedir")
 * @param {Array} intents - Supabase'den çekilen niyetler (örn: [{ intent_name: 'fiyat_sor', examples: [...] }])
 * @returns {Promise<object>} - Bulunan niyet sonucu (örn: { intent: 'fiyat_sor', score: 0.98 })
 */
export async function processMessageWithNlp(message, intents) {
  if (!intents || intents.length === 0) {
    console.warn(
      "NLU motoru için intent bulunamadı. Varsayılan cevap kullanılacak."
    );
    return { intent: "None", score: 0 };
  }

  try {
    // 1. Yeni bir NlpManager oluştur
    // 'tr' -> Türkçe dil desteği için
    const manager = new NlpManager({ languages: ["tr"], forceNER: true });

    // 2. Supabase'den gelen intent'leri (niyetleri) motora öğret
    for (const intentData of intents) {
      const intentName = intentData.intent_name;
      const examples = intentData.examples; // examples: [{ example_text: 'fiyat nedir?' }, ...]

      if (examples && examples.length > 0) {
        examples.forEach((example) => {
          manager.addDocument("tr", example.example_text, intentName);
        });
      }
    }

    // TODO: Buraya 'bot_settings' tablosundan "anlayamadım" cevaplarını da
    // 'None' niyeti olarak ekleyebiliriz.
    // manager.addAnswer('tr', 'None', 'Anlayamadım, lütfen tekrar eder misin?');
    // manager.addAnswer('tr', 'None', 'Bu konuda yardımcı olamıyorum.');

    // 3. Motoru eğit (Bu işlem çok hızlıdır)
    console.log("NLU motoru eğitiliyor...");
    await manager.train();
    console.log("NLU motoru hazır.");

    // 4. Gelen mesajı işle ve niyeti bul
    const response = await manager.process("tr", message);

    // response objesi şuna benzer:
    // { intent: 'fiyat_sor', score: 0.98, ... }

    console.log(
      `NLU Sonucu: Intent: ${response.intent}, Score: ${response.score}`
    );

    // Belirli bir güven skorunun altındaysa "None" olarak kabul et
    if (response.score < 0.5) {
      // 0.7 eşik değerini sonradan ayarlayabiliriz
      return { intent: "None", score: response.score };
    }

    return response;
  } catch (error) {
    console.error("NLU motorunda hata:", error);
    return { intent: "None", score: 0 }; // Hata durumunda 'None' dön
  }
}
