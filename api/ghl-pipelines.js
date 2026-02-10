export default async function handler(req, res) {
  try {
    const token = process.env.GHL_ACCESS_TOKEN;
    const locationId = process.env.GHL_LOCATION_ID;

    if (!token) return res.status(500).json({ ok:false, error:"Missing GHL_ACCESS_TOKEN" });
    if (!locationId) return res.status(500).json({ ok:false, error:"Missing GHL_LOCATION_ID" });

    const r = await fetch(`https://services.leadconnectorhq.com/opportunities/pipelines?locationId=${locationId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Version: "2021-07-28",
        Accept: "application/json",
      }
    });

    const text = await r.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch {}

    if (!r.ok) return res.status(r.status).json({ ok:false, status:r.status, body: json || text });

    return res.status(200).json({ ok:true, pipelines: json });
  } catch (e) {
    return res.status(500).json({ ok:false, error: e.message });
  }
}
