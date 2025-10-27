import { NextResponse } from "next/server";

const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN;

/**
 * ADIM 1: Webhook Doğrulama (GET İsteği)
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
 * ADIM 2: Gerçek Mesajları Alma (POST İsteği)
 */
export async function POST(req) {
  // Dinamik importlar
  const { supabaseAdmin } = await import("@/lib/supabaseClient");
  const { sendTextMessage } = await import("@/lib/metaApi");
  const { processMessageWithNlp } = await import("@/lib/nlpManager");

  let body;
  try {
    body = await req.json();
  } catch (err) {
    console.error("JSON parse hatası:", err);
    return NextResponse.json({ status: "INVALID_JSON" }, { status: 200 });
  }

  // Gelen payload'i debug için logla (isteğe bağlı, üretimde kapatılabilir)
  // console.log("Incoming webhook body:", JSON.stringify(body, null, 2));

  try {
    // === 1. GÜVENLİ VERİ AYIKLAMA VE FİLTRELEME ===
    const entry = body.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;

    // Temel yapı eksikse veya mesaj yoksa
    if (
      !value ||
      !value.messages ||
      !Array.isArray(value.messages) ||
      value.messages.length === 0
    ) {
      console.log("Webhook event ignored: No messages in payload.");
      return NextResponse.json({ status: "EVENT_IGNORED" }, { status: 200 });
    }

    const messageEntry = value.messages[0];

    // Sadece metin mesajlarını işle
    if (messageEntry.type !== "text") {
      console.log(
        `Webhook event ignored: Message type is ${messageEntry.type}, not text.`
      );
      return NextResponse.json({ status: "EVENT_IGNORED" }, { status: 200 });
    }

    // Gerekli alanlar eksikse
    const phoneNumberId = value.metadata?.phone_number_id;
    const userPhone = messageEntry.from;
    const messageText = messageEntry.text?.body;

    if (!phoneNumberId || !userPhone || !messageText) {
      console.log(
        "Webhook event ignored: Missing critical fields (phone_number_id, from, text.body)."
      );
      return NextResponse.json({ status: "EVENT_IGNORED" }, { status: 200 });
    }

    // === 2. Tenant (Müşteri) Kontrolü ===
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from("tenants")
      .select("id, is_active, subscription_expires_at")
      .eq("phone_number_id", phoneNumberId)
      .single();

    if (tenantError || !tenant) {
      console.error(
        `Tenant bulunamadı (phone_number_id: ${phoneNumberId}). Hata:`,
        tenantError
      );
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

    // === 3. Bot Ayarlarını Çek ===
    const [profileResult, settingsResult] = await Promise.all([
      supabaseAdmin
        .from("bot_profile")
        .select("*")
        .eq("tenant_id", tenantId)
        .maybeSingle(),
      supabaseAdmin
        .from("bot_settings")
        .select("setting_key, setting_value")
        .eq("tenant_id", tenantId),
    ]);

    if (profileResult.error && profileResult.error.code !== "PGRST116") {
      console.error("Profil ayarları çekilirken hata:", profileResult.error);
      return NextResponse.json({ status: "SETTINGS_ERROR" }, { status: 200 });
    }
    if (settingsResult.error) {
      console.error("Bot ayarları çekilirken hata:", settingsResult.error);
      return NextResponse.json({ status: "SETTINGS_ERROR" }, { status: 200 });
    }

    const botSettings = (settingsResult.data || []).reduce((acc, setting) => {
      acc[setting.setting_key] = setting.setting_value;
      return acc;
    }, {});

    const botProfile = profileResult.data || {};
    const config = { ...botSettings, ...botProfile };

    // === 4. Mesai Saati Kontrolü ===
    if (config.out_of_hours_reply_enabled && isOffHours(config)) {
      await sendTextMessage(
        userPhone,
        config.out_of_hours_message ||
          "Şu anda mesai saatleri dışındayız. En kısa sürede size dönüş yapacağız."
      );
      return NextResponse.json(
        { status: "PROCESSED_OFF_HOURS" },
        { status: 200 }
      );
    }

    // === 5. Niyet (Intent) Çekme ===
    const { data: rawIntents, error: rawIntentsError } = await supabaseAdmin
      .from("intents")
      .select("id, intent_name")
      .eq("tenant_id", tenantId);

    if (rawIntentsError) {
      console.error("Niyetler çekilirken hata:", rawIntentsError);
      return NextResponse.json(
        { status: "INTENT_FETCH_ERROR" },
        { status: 200 }
      );
    }

    console.log(
      `Tenant ${tenantId} için ${rawIntents?.length || 0} niyet bulundu.`
    );

    // Örneklerle birlikte niyetleri hazırla
    const intentsWithExamples = await Promise.all(
      (rawIntents || []).map(async (intent) => {
        const { data: examples } = await supabaseAdmin
          .from("intent_examples")
          .select("example_text")
          .eq("intent_id", intent.id);

        return {
          intent_name: intent.intent_name,
          intent_examples: (examples || []).map((e) => ({
            example_text: e.example_text,
          })),
        };
      })
    );

    // === 6. NLP ile Mesaj İşleme ===
    const nlpResult = await processMessageWithNlp(
      messageText.toLowerCase(),
      intentsWithExamples
    );

    // === 7. Flow Engine (Akış Motoru) ===
    if (nlpResult.intent && nlpResult.intent !== "None") {
      const triggerIntentName = nlpResult.intent.toLowerCase();

      const { data: flowRecord, error: flowError } = await supabaseAdmin
        .from("bot_flows")
        .select("flow_data")
        .eq("tenant_id", tenantId)
        .eq("trigger_intent_name", triggerIntentName)
        .single();

      if (!flowError && flowRecord?.flow_data) {
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

    // === 8. AI Cevabı ===
    if (config.ai_enabled) {
      const aiResponse = config.ai_prompt
        ? config.ai_prompt.replace(/\{message\}/g, messageText)
        : `[AI Cevabı]: ${messageText}`;
      await sendTextMessage(userPhone, aiResponse);
      return NextResponse.json({ status: "PROCESSED_AI" }, { status: 200 });
    }

    // === 9. Varsayılan Cevap ===
    await sendTextMessage(
      userPhone,
      config.default_reply ||
        "Üzgünüm, mesajınızı anlayamadım. Lütfen tekrar deneyin."
    );
    return NextResponse.json({ status: "PROCESSED_DEFAULT" }, { status: 200 });
  } catch (error) {
    console.error("Webhook işlenirken KÖK HATA:", error.message || error);
    return NextResponse.json({ status: "ERROR_PROCESSING" }, { status: 200 });
  }
}

// === Yardımcı Fonksiyon: Mesai Saati Kontrolü ===
function isOffHours(config) {
  try {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Pazar, 6 = Cumartesi
    const currentTime = now.getHours() * 100 + now.getMinutes();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    let startTimeStr, endTimeStr;

    if (isWeekend) {
      if (!config.work_hours_weekend_start || !config.work_hours_weekend_end)
        return true;
      startTimeStr = config.work_hours_weekend_start;
      endTimeStr = config.work_hours_weekend_end;
    } else {
      if (!config.work_hours_weekday_start || !config.work_hours_weekday_end)
        return false;
      startTimeStr = config.work_hours_weekday_start;
      endTimeStr = config.work_hours_weekday_end;
    }

    const startTime = parseInt(startTimeStr.replace(":", ""), 10);
    const endTime = parseInt(endTimeStr.replace(":", ""), 10);

    return currentTime < startTime || currentTime > endTime;
  } catch (e) {
    console.error("Mesai saati kontrolü hatası:", e);
    return false;
  }
}
