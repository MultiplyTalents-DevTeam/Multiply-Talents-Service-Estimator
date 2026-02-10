// api/submit-quote.js
export default async function handler(req, res) {
  // CORS + preflight
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-GHL-Source");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, message: "Method Not Allowed" });
  }

  const token = process.env.GHL_ACCESS_TOKEN;
  const locationId = process.env.GHL_LOCATION_ID;
  const webhookUrl = process.env.GHL_WEBHOOK_URL;

  if (!token) return res.status(500).json({ ok: false, message: "Missing GHL_ACCESS_TOKEN" });
  if (!locationId) return res.status(500).json({ ok: false, message: "Missing GHL_LOCATION_ID" });
  if (!webhookUrl) return res.status(500).json({ ok: false, message: "Missing GHL_WEBHOOK_URL" });

  // Known Contact Custom Field IDs (from your /api/ghl-estimator-fields matches)
  const FIELD = {
    selected_services: "eA6bJ4aG4wjmA214vAKr",
    business_scale: "dP5EFqi1Fvh9B3qBCpIK",
    service_level: "G5GbEE19rnroqjcVW4Bo",
    estimated_investment: "o3kdCfubTyy1RW20GAJZ",
    bundle_discount: "DS0wcauiQL4xfHPINLMI",
    final_quote_total: "zFS9xdsDgUREGnidzjKW",
    project_description: "RJRuoqzj6dsUlSrXISiT",
    video_walkthrough: "sTW1WxQWwzfz8IPGQ9d2",
    full_quote_json: "a4x5p5ufWzrJnw5WczGo",
    industry_type: "cZ8J3yte2sBvXJOcH4sT",
  };

  try {
    const body = req.body || {};
    const {
      email,
      firstName,
      lastName,
      phone,
      company,
      customField = {},
      tags = [],
    } = body;

    if (!email || !firstName) {
      return res.status(422).json({
        ok: false,
        message: "Missing required fields: firstName, email",
      });
    }

    // Convert { FIELD_ID: value } -> [{ id, value }]
    const customFieldsArr = Object.entries(customField).map(([id, value]) => ({ id, value }));

    // 1) UPSERT CONTACT (so {{contact.*}} merge fields exist for the workflow)
    const upsertRes = await fetch("https://services.leadconnectorhq.com/contacts/upsert", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Version: "2021-07-28",
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        locationId,
        email,
        firstName,
        lastName: lastName || "",
        phone: phone || "",
        companyName: company || "",
        customFields: customFieldsArr,
      }),
    });

    const upsertText = await upsertRes.text();
    let upsertJson = null;
    try { upsertJson = upsertText ? JSON.parse(upsertText) : null; }
    catch { upsertJson = { raw: upsertText }; }

    if (!upsertRes.ok) {
      return res.status(upsertRes.status).json({
        ok: false,
        message: "Contact upsert failed",
        details: upsertJson,
      });
    }

    const contactId =
      upsertJson?.contact?.id ||
      upsertJson?.contact?.contactId ||
      upsertJson?.id ||
      upsertJson?.contactId;

    if (!contactId) {
      return res.status(500).json({
        ok: false,
        message: "Upsert succeeded but contactId missing in response",
        details: upsertJson,
      });
    }

    // 2) ADD TAGS (optional, but good for segmentation)
    let tagsResult = { ok: true, skipped: true };
    if (Array.isArray(tags) && tags.length) {
      const tagRes = await fetch(`https://services.leadconnectorhq.com/contacts/${contactId}/tags`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Version: "2021-07-28",
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ tags }),
      });

      const tagText = await tagRes.text();
      let tagJson = null;
      try { tagJson = tagText ? JSON.parse(tagText) : null; } catch { tagJson = { raw: tagText }; }
      tagsResult = tagRes.ok ? { ok: true, body: tagJson } : { ok: false, body: tagJson };
    }

    // 3) TRIGGER YOUR OLD WORKFLOW (Inbound Webhook) FROM BACKEND (secure)
    // Safety net: ensure friendly keys exist (workflow mapping-friendly), even if frontend forgot.
    const selectedServices = body.selected_services ?? customField?.[FIELD.selected_services] ?? [];
    const selectedServicesText = Array.isArray(selectedServices) ? selectedServices.join(", ") : String(selectedServices || "");

    const webhookPayload = {
      ...body,
      locationId,
      contactId,

      // Friendly keys for mapping in workflow Create Contact step:
      selected_services: selectedServices,
      selected_services_text: body.selected_services_text ?? selectedServicesText,
      business_scale: body.business_scale ?? customField?.[FIELD.business_scale] ?? "",
      industry_type: body.industry_type ?? customField?.[FIELD.industry_type] ?? "",
      service_level: body.service_level ?? customField?.[FIELD.service_level] ?? "",
      estimated_investment: body.estimated_investment ?? customField?.[FIELD.estimated_investment] ?? 0,
      bundle_discount: body.bundle_discount ?? customField?.[FIELD.bundle_discount] ?? 0,
      final_quote_total: body.final_quote_total ?? customField?.[FIELD.final_quote_total] ?? 0,
      project_description: body.project_description ?? customField?.[FIELD.project_description] ?? "",
      video_walkthrough: body.video_walkthrough ?? customField?.[FIELD.video_walkthrough] ?? "",
      full_quote_json: body.full_quote_json ?? customField?.[FIELD.full_quote_json] ?? "",

      // keep your original customField (IDs) as well:
      customField,
    };

    const whRes = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(webhookPayload),
    });

    const whText = await whRes.text();
    let whJson = null;
    try { whJson = whText ? JSON.parse(whText) : null; } catch { whJson = { raw: whText }; }

    if (!whRes.ok) {
      return res.status(whRes.status).json({
        ok: false,
        message: "Workflow webhook trigger failed",
        details: whJson,
      });
    }

    return res.status(200).json({
      ok: true,
      contactId,
      tagsResult,
      webhookTriggered: {
        ok: true,
        status: whRes.status,
        body: whJson,
      },
    });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message });
  }
}
