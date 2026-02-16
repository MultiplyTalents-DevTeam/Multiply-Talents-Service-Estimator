// /api/ghl-estimate-range-fields.js
export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  try {
    const token = process.env.GHL_ACCESS_TOKEN;
    const locationId = process.env.GHL_LOCATION_ID;

    if (!token) return res.status(500).json({ ok: false, error: "Missing GHL_ACCESS_TOKEN" });
    if (!locationId) return res.status(500).json({ ok: false, error: "Missing GHL_LOCATION_ID" });

    const r = await fetch(
      `https://services.leadconnectorhq.com/locations/${locationId}/customFields`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Version: "2021-07-28",
          Accept: "application/json",
        },
      }
    );

    const json = await r.json();
    if (!r.ok) return res.status(r.status).json({ ok: false, body: json });

    const fields = json?.customFields || json?.fields || [];

    // We match by normalized key so it works whether the API returns "contact.estimate_min" or "estimate_min".
    const wanted = new Set(["estimate_min", "estimate_max", "estimate_range"]);

    const matches = fields
      .map((f) => {
        const rawKey = f.fieldKey || f.key || "";
        const normalizedKey = rawKey.startsWith("contact.") ? rawKey.slice("contact.".length) : rawKey;

        return {
          id: f.id || f._id,
          name: f.name,
          key: rawKey,
          normalizedKey,
          type: f.type,
          options: f.options || f.values || null,
        };
      })
      .filter((f) => wanted.has(f.normalizedKey));

    // Avoid caching so you always see new fields after creating them in GHL.
    res.setHeader("Cache-Control", "no-store");

    return res.status(200).json({
      ok: true,
      found: matches.length,
      matches,
      missing: [...wanted].filter((k) => !matches.some((m) => m.normalizedKey === k)),
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}
