// /api/submit-quote.js  (OPTION B: Direct GHL API upsert)
const API_BASE = "https://services.leadconnectorhq.com";
const VERSION = "2021-07-28";

// Your real Custom Field IDs (from /api/ghl-estimator-fields)
const FIELD_IDS = {
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

function toMoneyNumber(v) {
  if (v === null || v === undefined) return undefined;
  if (typeof v === "number") return v;
  const s = String(v).replace(/[^0-9.]/g, "");
  if (!s) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

function toStringSafe(v) {
  if (v === null || v === undefined) return "";
  return String(v);
}

export default async function handler(req, res) {
  // CORS preflight (safe, helps if called from inside GHL iframe)
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-GHL-Source");
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  try {
    const token = process.env.GHL_ACCESS_TOKEN;
    const locationId = process.env.GHL_LOCATION_ID;

    if (!token) return res.status(500).json({ ok: false, error: "Missing GHL_ACCESS_TOKEN" });
    if (!locationId) return res.status(500).json({ ok: false, error: "Missing GHL_LOCATION_ID" });

    const {
      email,
      firstName,
      lastName,
      phone,
      company,
      estimatorFields,
      tags,
    } = req.body || {};

    if (!email) return res.status(400).json({ ok: false, error: "Missing email" });
    if (!firstName) return res.status(400).json({ ok: false, error: "Missing firstName" });

    // Build GHL customField payload (keys MUST be field IDs)
    const cf = {};

    // MULTIPLE_OPTIONS
    if (estimatorFields?.selected_services) {
      cf[FIELD_IDS.selected_services] = Array.isArray(estimatorFields.selected_services)
        ? estimatorFields.selected_services
        : [estimatorFields.selected_services];
    }

    // SINGLE_OPTIONS / TEXT
    if (estimatorFields?.business_scale)
      cf[FIELD_IDS.business_scale] = toStringSafe(estimatorFields.business_scale);

    if (estimatorFields?.service_level)
      cf[FIELD_IDS.service_level] = toStringSafe(estimatorFields.service_level);

    if (estimatorFields?.industry_type)
      cf[FIELD_IDS.industry_type] = toStringSafe(estimatorFields.industry_type);

    if (estimatorFields?.video_walkthrough)
      cf[FIELD_IDS.video_walkthrough] = toStringSafe(estimatorFields.video_walkthrough);

    if (estimatorFields?.project_description)
      cf[FIELD_IDS.project_description] = toStringSafe(estimatorFields.project_description);

    // JSON snapshot stored as LARGE_TEXT
    if (estimatorFields?.full_quote_json) {
      cf[FIELD_IDS.full_quote_json] =
        typeof estimatorFields.full_quote_json === "string"
          ? estimatorFields.full_quote_json
          : JSON.stringify(estimatorFields.full_quote_json);
    }

    // MONETARY
    const estInv = toMoneyNumber(estimatorFields?.estimated_investment);
    if (estInv !== undefined) cf[FIELD_IDS.estimated_investment] = estInv;

    const disc = toMoneyNumber(estimatorFields?.bundle_discount);
    if (disc !== undefined) cf[FIELD_IDS.bundle_discount] = disc;

    const total = toMoneyNumber(estimatorFields?.final_quote_total);
    if (total !== undefined) cf[FIELD_IDS.final_quote_total] = total;

    const upsertBody = {
      locationId,
      email,
      firstName,
      lastName: lastName || "",
      phone: phone || "",
      company: company || "",
      tags: Array.isArray(tags) ? tags : [],
      customField: cf,
    };

    const r = await fetch(`${API_BASE}/contacts/upsert`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Version: VERSION,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(upsertBody),
    });

    const text = await r.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch {}

    if (!r.ok) {
      return res.status(r.status).json({
        ok: false,
        error: "Upsert failed",
        status: r.status,
        body: json || text,
      });
    }

    return res.status(200).json({ ok: true, contact: json });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}
