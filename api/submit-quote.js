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
    try {
      upsertJson = upsertText ? JSON.parse(upsertText) : null;
    } catch {
      upsertJson = { raw: upsertText };
    }

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
      // don't fail whole request if tagging fails
    }

    // 3) TRIGGER YOUR OLD WORKFLOW (Inbound Webhook) FROM BACKEND (secure)
    // This is the key change: workflow will handle task/note/opportunity.
    const webhookPayload = {
      ...body,
      locationId,
      contactId,
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
