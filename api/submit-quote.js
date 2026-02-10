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

  // ====== Defaults from your pipeline list (Service Estimator Sales) ======
  const DEFAULT_PIPELINE_ID = "CGQF7dMJrcE3iUcVnFi3";
  const DEFAULT_STAGE_SETUP = "ecfeec95-ec21-44d6-bd58-ccaa1a30cdb0"; // New Quote Submitted

  // ====== Allow env overrides (recommended) ======
  const pipelineId = process.env.GHL_PIPELINE_ID || DEFAULT_PIPELINE_ID;

  // If you set these in env, they override. Otherwise, we’ll fall back.
  const stageSetup = process.env.GHL_STAGE_ID_SETUP || DEFAULT_STAGE_SETUP;

  // Optional stages (set in env if you want different routing)
  const stageMigration = process.env.GHL_STAGE_ID_MIGRATION || stageSetup;
  const stageMonthly = process.env.GHL_STAGE_ID_MONTHLY || stageSetup;

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
      pipelineStage = "setup",
    } = body;

    if (!email || !firstName) {
      return res.status(422).json({
        ok: false,
        message: "Missing required fields: firstName, email",
      });
    }

    // Convert { FIELD_ID: value } -> [{ id, value }]
    // This is the correct shape for contacts/upsert "customFields".
    const customFieldsArr = Object.entries(customField).map(([id, value]) => ({
      id,
      value,
    }));

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

    // 2) ADD TAGS (best workflow trigger)
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
      try {
        tagJson = tagText ? JSON.parse(tagText) : null;
      } catch {
        tagJson = { raw: tagText };
      }

      tagsResult = tagRes.ok ? { ok: true, body: tagJson } : { ok: false, body: tagJson };
      // We do NOT fail the whole request if tags fail.
    }

    // 3) CREATE OPPORTUNITY (THIS is what makes it appear in Opportunities)
    // Map your incoming pipelineStage string -> stageId
    const stageMap = {
      setup: stageSetup,
      migration: stageMigration,
      monthly_management: stageMonthly,
    };
    const pipelineStageId = stageMap[pipelineStage] || stageSetup;

    // Use Final Quote Total custom field (your ID) if present, otherwise find any number
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
        pipelineId,
        pipelineStageId,
        status: "open",
        contactId,
        name: `Service Estimate - ${company || email}`,
        monetaryValue,
      }),
    });

    const oppText = await oppRes.text();
    let oppJson = null;
    try {
      oppJson = oppText ? JSON.parse(oppText) : null;
    } catch {
      oppJson = { raw: oppText };
    }

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
      pipelineId,
      pipelineStageId,
      tagsResult,
      opportunity: oppJson,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message });
  }
}
