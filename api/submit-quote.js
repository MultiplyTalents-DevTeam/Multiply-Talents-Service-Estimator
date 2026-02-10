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

  if (!token) return res.status(500).json({ ok: false, message: "Missing GHL_ACCESS_TOKEN" });
  if (!locationId) return res.status(500).json({ ok: false, message: "Missing GHL_LOCATION_ID" });

  // Hard set to your estimator pipeline + first stage (can be env override if you want)
  const PIPELINE_ID = process.env.GHL_PIPELINE_ID || "CGQF7dMJrcE3iUcVnFi3";
  const STAGE_ID_NEW_QUOTE = process.env.GHL_STAGE_ID_NEW_QUOTE || "ecfeec95-ec21-44d6-bd58-ccaa1a30cdb0";

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

    // 1) UPSERT CONTACT
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
    try { upsertJson = upsertText ? JSON.parse(upsertText) : null; } catch { upsertJson = { raw: upsertText }; }

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

    // 2) ADD TAGS (workflow trigger)
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

    // 3) ALWAYS CREATE OPPORTUNITY IN "New Quote Submitted"
    const FINAL_QUOTE_TOTAL_FIELD_ID = "zFS9xdsDgUREGnidzjKW";
    const monetaryValue = Number(
      customField?.[FINAL_QUOTE_TOTAL_FIELD_ID] ??
      Object.values(customField).find((v) => typeof v === "number") ??
      0
    );

    const oppRes = await fetch("https://services.leadconnectorhq.com/opportunities/", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Version: "2021-07-28",
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        locationId,
        pipelineId: PIPELINE_ID,
        pipelineStageId: STAGE_ID_NEW_QUOTE,
        status: "open",
        contactId,
        name: `Service Estimate - ${company || email}`,
        monetaryValue,
      }),
    });

    const oppText = await oppRes.text();
    let oppJson = null;
    try { oppJson = oppText ? JSON.parse(oppText) : null; } catch { oppJson = { raw: oppText }; }

    if (!oppRes.ok) {
      return res.status(oppRes.status).json({
        ok: false,
        message: "Opportunity create failed",
        details: oppJson,
      });
    }

    return res.status(200).json({
      ok: true,
      contactId,
      pipelineId: PIPELINE_ID,
      pipelineStageId: STAGE_ID_NEW_QUOTE,
      tagsResult,
      opportunity: oppJson,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message });
  }
}
