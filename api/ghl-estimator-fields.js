export default async function handler(req, res) {
  try {
    const token = process.env.GHL_ACCESS_TOKEN;
    const locationId = process.env.GHL_LOCATION_ID;

    if (!token) return res.status(500).json({ ok: false, error: "Missing GHL_ACCESS_TOKEN" });
    if (!locationId) return res.status(500).json({ ok: false, error: "Missing GHL_LOCATION_ID" });

    const r = await fetch(`https://services.leadconnectorhq.com/locations/${locationId}/customFields`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Version: "2021-07-28",
        Accept: "application/json",
      },
    });

    const json = await r.json();
    if (!r.ok) return res.status(r.status).json({ ok: false, body: json });

    const fields = json?.customFields || json?.fields || [];

    const wantedKeys = [
      "contact.selected_services",
      "contact.business_scale",
      "contact.service_level",
      "contact.estimated_investment",
      "contact.bundle_discount",
      "contact.final_quote_total",
      "contact.project_description",
      "contact.video_walkthrough",
      "contact.full_quote_json",
      "contact.industry_type",
      "contact.estimate_range",
      "contact.estimate_min",
      "contact.estimate_max",
    ];

    const matches = fields
      .filter(f => wantedKeys.includes(f.fieldKey || f.key))
      .map(f => ({
        id: f.id || f._id,
        name: f.name,
        key: f.fieldKey || f.key,
        type: f.type,
        options: f.options || f.values || null
      }));

    return res.status(200).json({
      ok: true,
      found: matches.length,
      matches
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}
