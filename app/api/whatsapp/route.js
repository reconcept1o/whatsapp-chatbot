// app/api/whatsapp/route.js

// SADECE NEXT RESPONSE'U IMPORT EDİYORUZ!
import { NextResponse } from "next/server";

const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN;

/**
 * ADIM 1: Webhook Doğrulama (GET İsteği) - KÖKTEN YALITILDI
 */
export async function GET(req) {
  try {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("WEBHOOK_VERIFIED - Token Eşleşti.");
      return new NextResponse(challenge, { status: 200 });
    } else {
      console.warn(
        "Webhook doğrulama BAŞARISIZ: Token eşleşmedi veya mod yanlış."
      );
      return new NextResponse("Forbidden", { status: 403 });
    }
  } catch (error) {
    console.error("Webhook GET sırasında beklenmedik hata:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

/**
 * ADIM 2: Gerçek Mesajları Alma (POST İsteği) - TÜM BOT MANTIĞI VE IMPORTLAR BURADA
 */
export async function POST(req) {
  // GEREKLİ TÜM IMPORTLAR ARTIK BURADA VE AWAIT İLE YÜKLENİR (Yalıtım için zorunlu)
  const { supabase } = await import("@/lib/supabaseClient");
  const { sendTextMessage } = await import("@/lib/metaApi");
  const { processMessageWithNlp } = await import("@/lib/nlpManager");

  const body = await req.json();

  try {
    // --- 1. Gelen Veriyi Ayıkla ve Filtrele ---
    const messageEntry = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (!messageEntry || messageEntry.type !== "text") {
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
      console.error(`Tenant bulunamadı (phone_number_id: ${phoneNumberId}).`);
      return NextResponse.json({ status: "TENANT_NOT_FOUND" }, { status: 200 });
    }
    const now = new Date();
    const subscriptionDate = tenant.subscription_expires_at
      ? new Date(tenant.subscription_expires_at)
      : null;
    if (!tenant.is_active || (subscriptionDate && subscriptionDate < now)) {
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
        .maybeSingle(),
      supabase
        .from("bot_settings")
        .select("setting_key, setting_value")
        .eq("tenant_id", tenantId),
    ]);
    if (profileResult.error && profileResult.error.code !== "PGRST116") {
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
    const botProfile = profileResult.data || {};
    const config = { ...botSettings, ...botProfile };

    // --- BOT MANTIK MOTORU BAŞLANGIÇ ---

    // 5. Mesai Saati Kontrolü
    if (config.out_of_hours_reply_enabled && isOffHours(config)) {
      await sendTextMessage(
        userPhone,
        config.out_of_hours_message || "Şu anda mesai saatleri dışındayız."
      );
      return NextResponse.json(
        { status: "PROCESSED_OFF_HOURS" },
        { status: 200 }
      );
    }

    // 6. Niyet (Intent) Arama (GÜNCELLENMİŞ VERSİYON)
    // 6a. Adım: Sadece niyet isimlerini ve ID'lerini çek
    const { data: rawIntents, error: rawIntentsError } = await supabase
      .from("intents")
      .select("id, intent_name")
      .eq("tenant_id", tenantId);

    if (rawIntentsError) {
      console.error("Niyet ID'leri çekilirken hata:", rawIntentsError);
      return NextResponse.json(
        { status: "INTENT_ID_FETCH_ERROR" },
        { status: 200 }
      );
    }

    // 6b. Adım: Her niyet için örnekleri AYRI AYRI çek (Anonim okuma için zorunlu)
    const intentsWithExamples = await Promise.all(
      (rawIntents || []).map(async (intent) => {
        const { data: examples } = await supabase
          .from("intent_examples")
          .select("example_text")
          .eq("intent_id", intent.id);

        return {
          intent_name: intent.intent_name,
          // Veriyi nlpManager'ın beklediği formata dönüştür: [{example_text: '...'}]
          intent_examples: (examples || []).map((e) => ({
            example_text: e.example_text,
          })),
        };
      })
    );

    // NLU motorunu çağır
    const nlpResult = await processMessageWithNlp(
      messageText,
      intentsWithExamples
    );
    // ------------------------------------

    // 7. AKIŞ MOTORU (Flow Engine)
    if (nlpResult.intent !== "None") {
      const { data: flowRecord, error: flowError } = await supabase
        .from("bot_flows")
        .select("flow_data")
        .eq("tenant_id", tenantId)
        .eq("trigger_intent_name", nlpResult.intent)
        .single();

      if (flowRecord && flowRecord.flow_data) {
        const flow = flowRecord.flow_data;
        const nodes = flow.nodes || [];
        const edges = flow.edges || [];

        const startNode = nodes.find((node) => node.type === "input");
        if (startNode) {
          const firstEdge = edges.find((edge) => edge.source === startNode.id);
          if (firstEdge) {
            const nextNode = nodes.find((node) => node.id === firstEdge.target);

            if (nextNode) {
              if (nextNode.type === "editableNode" && nextNode.data?.message) {
                await sendTextMessage(userPhone, nextNode.data.message);
                return NextResponse.json(
                  { status: "PROCESSED_FLOW_MESSAGE" },
                  { status: 200 }
                );
              } else if (
                nextNode.type === "questionNode" &&
                nextNode.data?.question
              ) {
                await sendTextMessage(userPhone, nextNode.data.question);
                // TODO: STATE YÖNETİMİ GEREKİR
                return NextResponse.json(
                  { status: "PROCESSED_FLOW_QUESTION_ASKED" },
                  { status: 200 }
                );
              }
            }
          }
        }
      }
    }

    // 9. Yapay Zeka (AI) Kontrolü
    if (config.ai_enabled) {
      await sendTextMessage(
        userPhone,
        config.ai_prompt || `[AI Cevabı (TODO)]: ${messageText}`
      );
      return NextResponse.json({ status: "PROCESSED_AI" }, { status: 200 });
    }

    // 10. Varsayılan Cevap
    await sendTextMessage(
      userPhone,
      config.default_reply || "Üzgünüm, sizi anlayamadım."
    );
    return NextResponse.json({ status: "PROCESSED_DEFAULT" }, { status: 200 });
  } catch (error) {
    console.error("Webhook işlenirken KÖK HATA:", error.message || error);
    return NextResponse.json({ status: "ERROR_PROCESSING" }, { status: 200 });
  }
}

// Yardımcı Fonksiyon: isOffHours (Değişiklik Yok)
function isOffHours(config) {
  try {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const currentTime = now.getHours() * 100 + now.getMinutes();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    let startTimeStr, endTimeStr;

    if (isWeekend) {
      if (!config.work_hours_weekend_start || !config.work_hours_weekend_end) {
        return true;
      }
      startTimeStr = config.work_hours_weekend_start;
      endTimeStr = config.work_hours_weekend_end;
    } else {
      startTimeStr = config.work_hours_weekday_start;
      endTimeStr = config.work_hours_weekday_end;
    }

    const startTime = parseInt(startTimeStr.replace(":", ""));
    const endTime = parseInt(endTimeStr.replace(":", ""));

    if (currentTime < startTime || currentTime > endTime) {
      return true;
    }
    return false;
  } catch (e) {
    console.error("Mesai saati hesaplama hatası:", e);
    return false;
  }
}
