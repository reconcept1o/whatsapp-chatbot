// app/api/whatsapp/route.js
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { sendTextMessage } from "@/lib/metaApi"; // Mesaj gönderme fonksiyonu
import { processMessageWithNlp } from "@/lib/nlpManager"; // Niyet bulma motoru

const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN;

// GET fonksiyonu (Webhook doğrulama - Değişiklik Yok)
export async function GET(req) {
  /* ... önceki kod ... */
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");
  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("WEBHOOK_VERIFIED");
    return new NextResponse(challenge, { status: 200 });
  } else {
    console.warn("Webhook verification failed.");
    return new NextResponse("Forbidden", { status: 403 });
  }
}

// POST fonksiyonu (Mesaj Alma & Bot Motoru - GÜNCELLENDİ)
export async function POST(req) {
  const body = await req.json();

  try {
    // 1. Gelen Veriyi Ayıkla ve Filtrele
    console.log("Gelen Webhook Verisi:", JSON.stringify(body, null, 2));
    const messageEntry = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (!messageEntry || messageEntry.type !== "text") {
      console.log("Metin mesajı olmayan webhook. İşlenmiyor.");
      return NextResponse.json({ status: "EVENT_IGNORED" }, { status: 200 });
    }
    const phoneNumberId =
      body.entry[0].changes[0].value.metadata.phone_number_id;
    const userPhone = messageEntry.from;
    const messageText = messageEntry.text.body;

    // 2. Müşteriyi (Tenant) Bul ve Aktif mi Kontrol Et
    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .select("id, is_active, subscription_expires_at")
      .eq("phone_number_id", phoneNumberId)
      .single();
    if (tenantError || !tenant) {
      /* ... Hata loglama ve çıkış ... */
      console.error(`Tenant bulunamadı (phone_number_id: ${phoneNumberId}).`);
      return NextResponse.json({ status: "TENANT_NOT_FOUND" }, { status: 200 });
    }
    const now = new Date();
    const subscriptionDate = tenant.subscription_expires_at
      ? new Date(tenant.subscription_expires_at)
      : null;
    if (!tenant.is_active || (subscriptionDate && subscriptionDate < now)) {
      /* ... Hata loglama ve çıkış ... */
      console.warn(`Pasif veya aboneliği bitmiş tenant (ID: ${tenant.id}).`);
      return NextResponse.json({ status: "TENANT_INACTIVE" }, { status: 200 });
    }
    const tenantId = tenant.id;

    // 3. Müşteriye Ait TÜM Ayarları Çek
    const [profileResult, settingsResult] = await Promise.all([
      supabase
        .from("bot_profile")
        .select("*")
        .eq("tenant_id", tenantId)
        .single(), // Profil single olmalı
      supabase
        .from("bot_settings")
        .select("setting_key, setting_value")
        .eq("tenant_id", tenantId),
    ]);
    if (profileResult.error && profileResult.error.code !== "PGRST116") {
      // Profil yoksa hata verme
      console.error(`Profil ayarları çekilirken hata:`, profileResult.error);
      return NextResponse.json({ status: "SETTINGS_ERROR" }, { status: 200 });
    }
    if (settingsResult.error) {
      console.error(`Metin ayarları çekilirken hata:`, settingsResult.error);
      return NextResponse.json({ status: "SETTINGS_ERROR" }, { status: 200 });
    }
    const botSettings = settingsResult.data.reduce((acc, setting) => {
      acc[setting.setting_key] = setting.setting_value;
      return acc;
    }, {});
    const botProfile = profileResult.data || {}; // Profil yoksa boş obje
    const config = { ...botSettings, ...botProfile }; // Tüm ayarlar tek objede

    // --- BOT MANTIK MOTORU BAŞLANGIÇ ---

    // 4. TODO: Spam Kontrolü (Aynı)
    // ...

    // 5. Mesai Saati Kontrolü (Aynı)
    if (config.out_of_hours_reply_enabled && isOffHours(config)) {
      console.log("Mesai saati dışında.");
      await sendTextMessage(
        userPhone,
        config.out_of_hours_message || "Şu anda mesai saatleri dışındayız."
      );
      return NextResponse.json(
        { status: "PROCESSED_OFF_HOURS" },
        { status: 200 }
      );
    }

    // 6. Niyet (Intent) Arama (Aynı)
    const { data: intents } = await supabase
      .from("intents")
      .select("intent_name, intent_examples ( example_text )")
      .eq("tenant_id", tenantId);
    const nlpResult = await processMessageWithNlp(messageText, intents || []);

    // --- 7. AKIŞ MOTORU (Flow Engine) --- GÜNCELLENDİ
    if (nlpResult.intent !== "None") {
      console.log(`Niyet bulundu: ${nlpResult.intent}`);
      const { data: flowRecord, error: flowError } = await supabase
        .from("bot_flows")
        .select("flow_data")
        .eq("tenant_id", tenantId)
        .eq("trigger_intent_name", nlpResult.intent)
        .single();

      if (flowError && flowError.code !== "PGRST116") {
        console.error("Akış çekilirken veritabanı hatası:", flowError);
        // Hata durumunda belki varsayılan cevaba düşebiliriz? Şimdilik çıkalım.
        return NextResponse.json({ status: "FLOW_DB_ERROR" }, { status: 200 });
      }

      if (flowRecord && flowRecord.flow_data) {
        console.log("Akış bulundu, çalıştırılıyor...");
        const flow = flowRecord.flow_data; // { nodes: [...], edges: [...] }
        const nodes = flow.nodes || [];
        const edges = flow.edges || [];

        // 7a. Başlangıç Düğümünü Bul (type: 'input')
        const startNode = nodes.find((node) => node.type === "input");
        if (!startNode) {
          console.error("Akışta başlangıç (input) düğümü bulunamadı!");
          // Başlangıç yoksa varsayılan cevaba düş
        } else {
          // 7b. Başlangıç Düğümünden Çıkan İlk Bağlantıyı (Edge) Bul
          const firstEdge = edges.find((edge) => edge.source === startNode.id);
          if (!firstEdge) {
            console.warn(
              "Başlangıç düğümüne bağlı bir sonraki adım bulunamadı."
            );
            // Akış burada bitiyor, belki varsayılan cevap?
          } else {
            // 7c. Sonraki Düğümü Bul
            const nextNodeId = firstEdge.target;
            const nextNode = nodes.find((node) => node.id === nextNodeId);

            if (!nextNode) {
              console.error(
                `Akışta bir sonraki düğüm (ID: ${nextNodeId}) bulunamadı!`
              );
            } else {
              // 7d. Düğüm Tipine Göre İşlem Yap
              console.log(`Bir sonraki düğüm tipi: ${nextNode.type}`);

              if (nextNode.type === "editableNode" && nextNode.data?.message) {
                // Eğer "Mesaj Gönder" düğümü ise, mesajı gönder
                await sendTextMessage(userPhone, nextNode.data.message);
                console.log("Mesaj gönderildi:", nextNode.data.message);
                // TODO: Bu düğümden sonra başka adımlar varsa devam etmeli (şimdilik duruyoruz)
                return NextResponse.json(
                  { status: "PROCESSED_FLOW_MESSAGE" },
                  { status: 200 }
                );
              } else if (
                nextNode.type === "questionNode" &&
                nextNode.data?.question
              ) {
                // Eğer "Soru Sor" düğümü ise, soruyu gönder
                await sendTextMessage(userPhone, nextNode.data.question);
                console.log("Soru soruldu:", nextNode.data.question);
                // --- KRİTİK TODO: ---
                // Kullanıcının cevabını beklemek ve akışa devam etmek için
                // state yönetimi (örn: Redis veya 'user_sessions' tablosu ile
                // kullanıcının hangi düğümde kaldığını saklamak) GEREKİR.
                // Şimdilik sadece soruyu sorup duruyoruz.
                // --- ---
                return NextResponse.json(
                  { status: "PROCESSED_FLOW_QUESTION_ASKED" },
                  { status: 200 }
                );
              } else {
                console.warn(
                  `Akışta bilinmeyen veya eksik verili düğüm tipi: ${nextNode.type}`
                );
                // Bilinmeyen tip, varsayılan cevaba düşebilir.
              }
            }
          }
        }
      } else {
        console.log(
          `Niyet (${nlpResult.intent}) için kayıtlı akış bulunamadı.`
        );
        // Akış yoksa varsayılan cevaba düşebilir.
      }
    } // Niyet bulundu bloğu sonu

    // --- ---

    // 8. İnsan-Devir (Handover) Kontrolü (Aynı)
    if (config.handover_enabled) {
      /* ... önceki kod ... */
      const lowerMessage = messageText.toLowerCase();
      const lowerKeyword = config.handover_keyword?.toLowerCase();
      // TODO: Hata sayısı kontrolü
      if (lowerKeyword && lowerMessage.includes(lowerKeyword)) {
        console.log("İnsan-devir anahtar kelimesi algılandı.");
        await sendTextMessage(
          userPhone,
          config.handover_message ||
            "Sizi bir müşteri temsilcisine bağlıyorum..."
        );
        // TODO: Bildirim E-postası
        return NextResponse.json(
          { status: "PROCESSED_HANDOVER" },
          { status: 200 }
        );
      }
    }

    // 9. Yapay Zeka (AI) Kontrolü (Aynı - TODO)
    if (config.ai_enabled) {
      /* ... önceki kod ... */
      console.log("AI'a yönlendiriliyor...");
      // TODO: Groq API Çağrısı
      await sendTextMessage(userPhone, `[AI Cevabı (TODO)]: ${messageText}`);
      return NextResponse.json({ status: "PROCESSED_AI" }, { status: 200 });
    }

    // 10. Varsayılan Cevap (Aynı)
    console.log("Hiçbir kural eşleşmedi. Varsayılan cevap gönderiliyor.");
    await sendTextMessage(
      userPhone,
      config.default_reply || "Üzgünüm, sizi anlayamadım."
    );
    return NextResponse.json({ status: "PROCESSED_DEFAULT" }, { status: 200 });

    // --- BOT MANTIK MOTORU BİTİŞ ---
  } catch (error) {
    console.error("Webhook işlenirken KÖK HATA:", error.message || error);
    return NextResponse.json({ status: "ERROR_PROCESSING" }, { status: 200 });
  }
}

// Yardımcı Fonksiyon: isOffHours (Değişiklik Yok)
function isOffHours(config) {
  /* ... önceki kod ... */
  try {
    /* ... saat hesaplama mantığı ... */ return false;
  } catch (e) {
    console.error("Mesai saati hesaplama hatası:", e);
    return false;
  }
}
