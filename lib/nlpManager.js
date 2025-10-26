// lib/nlpManager.js
import { NlpManager } from "node-nlp";

/**
 * Müşteriye özel NLU motorunu eğitir ve bir mesajı işler.
 * Bu fonksiyon artık Supabase'den gelen karmaşık veriyi işlemelidir.
 * * @param {string} message - Kullanıcının gönderdiği mesaj
 * @param {Array<Object>} intents - Supabase'den çekilen niyetler ve örnekler
 * Örn: [{ intent_name: 'fiyat_sor', intent_examples: [{ example_text: 'kaç para' }] }, ...]
 * @returns {Promise<object>} - Bulunan niyet sonucu
 */
export async function processMessageWithNlp(message, intents) {
  if (!intents || intents.length === 0) {
    console.warn(
      "NLU motoru için HİÇ INTENT BULUNAMADI. Varsayılan cevap kullanılacak."
    );
    return { intent: "None", score: 0 };
  }

  try {
    // 1. NlpManager'ı oluştur
    const manager = new NlpManager({ languages: ["tr"], forceNER: true });
    let totalExamples = 0;

    // 2. Intent'leri ve Örnekleri Motora Ekle (Kritik formatlama burada yapılır)
    for (const intentData of intents) {
      const intentName = intentData.intent_name;
      const examples = intentData.intent_examples || [];

      if (examples.length > 0) {
        examples.forEach((example) => {
          // Örnek cümleleri ekle
          manager.addDocument("tr", example.example_text, intentName);
          totalExamples++;
        });

        // Botun cevap vermesi için en az bir varsayılan cevap ekle (İstenen akışı tetiklemek için)
        manager.addAnswer("tr", intentName, `Akış tetikleyici: ${intentName}`);
      }
    }

    console.log(
      `NLU Motoru Başlatıldı. Toplam ${intents.length} niyet ve ${totalExamples} örnek ile eğitiliyor...`
    );

    // EĞİTİMİN ÇALIŞTIĞINDAN EMİN OLMAK İÇİN SADECE 1 KEZ EĞİT
    if (totalExamples > 0) {
      await manager.train();
      console.log("NLU Motoru Başarıyla Eğitildi.");
    } else {
      console.warn("Eğitim Verisi YOK. NLU motoru boş kalacak.");
      return { intent: "None", score: 0 };
    }

    // 4. Gelen mesajı işle
    const response = await manager.process("tr", message);

    console.log(
      `NLU Sonucu: Intent: ${response.intent}, Score: ${response.score}`
    );

    // Eşik değeri 0.5 (önceki denemeden)
    if (response.score < 0.5) {
      return { intent: "None", score: response.score };
    }

    return response;
  } catch (error) {
    console.error("NLU Motorunda beklenmedik KÖK HATA:", error);
    // Bu hata durumunda da varsayılan cevaba düşer
    return { intent: "None", score: 0 };
  }
}
