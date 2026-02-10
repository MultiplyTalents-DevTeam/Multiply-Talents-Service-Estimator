// /api/ghl-health.js
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

    const text = await r.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch {}

    if (!r.ok) {
      return res.status(r.status).json({
        ok: false,
        status: r.status,
        statusText: r.statusText,
        body: json || text,
      });
    }

    // return a tiny summary so it’s readable
    const list = json?.customFields || json?.fields || [];
    return res.status(200).json({
      ok: true,
      locationId,
      customFieldsCount: Array.isArray(list) ? list.length : null,
      sampleField: Array.isArray(list) && list[0]
        ? { id: list[0].id || list[0]._id, name: list[0].name, key: list[0].fieldKey || list[0].key }
        : null,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}
