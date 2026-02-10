// /api/submit-quote.js
export default async function handler(req, res) {
  // Basic CORS (helpful if embedded)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-GHL-Source');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

  try {
    const token = process.env.GHL_ACCESS_TOKEN;
    const locationId = process.env.GHL_LOCATION_ID;

    if (!token) return res.status(500).json({ message: 'Missing GHL_ACCESS_TOKEN' });
    if (!locationId) return res.status(500).json({ message: 'Missing GHL_LOCATION_ID' });

    const payload = req.body || {};

    // 1) Upsert Contact (creates or updates by email/phone)
    const upsertRes = await fetch('https://services.leadconnectorhq.com/contacts/upsert', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Version: '2021-07-28',
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        locationId,
        email: payload.email,
        phone: payload.phone || '',
        firstName: payload.firstName || '',
        lastName: payload.lastName || '',
        companyName: payload.company || '',
        tags: payload.tags || [],
        customField: payload.customField || {}
      })
    });

    const upsertText = await upsertRes.text();
    let upsertJson = null;
    try { upsertJson = upsertText ? JSON.parse(upsertText) : null; } catch { upsertJson = { raw: upsertText }; }

    if (!upsertRes.ok) {
      return res.status(upsertRes.status).json({
        message: 'Contact upsert failed',
        status: upsertRes.status,
        body: upsertJson
      });
    }

    // Different responses sometimes nest the contact differently
    const contactId =
      upsertJson?.contact?.id ||
      upsertJson?.contact?._id ||
      upsertJson?.id ||
      upsertJson?._id;

    if (!contactId) {
      return res.status(500).json({
        message: 'Upsert succeeded but contactId was not returned',
        body: upsertJson
      });
    }

    // OPTIONAL 2) Create Opportunity (only if you add pipeline env vars)
    // If you want to create the Opportunity automatically, set these in Vercel:
    // GHL_PIPELINE_ID, and stage IDs:
    // GHL_STAGE_ID_SETUP, GHL_STAGE_ID_MIGRATION, GHL_STAGE_ID_MONTHLY
    const pipelineId = process.env.GHL_PIPELINE_ID;
    const stageMap = {
      setup: process.env.GHL_STAGE_ID_SETUP,
      migration: process.env.GHL_STAGE_ID_MIGRATION,
      monthly_management: process.env.GHL_STAGE_ID_MONTHLY
    };

    let opportunityResult = null;

    if (pipelineId) {
      const stageId = stageMap[payload.pipelineStage] || stageMap.setup;

      if (!stageId) {
        // Pipeline exists but stage ids not configured
        opportunityResult = {
          skipped: true,
          reason: 'Missing stage ID env vars (GHL_STAGE_ID_SETUP etc.)'
        };
      } else {
        const oppRes = await fetch('https://services.leadconnectorhq.com/opportunities/', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            Version: '2021-07-28',
            Accept: 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            locationId,
            contactId,
            pipelineId,
            pipelineStageId: stageId,
            name: `${payload.firstName || ''} ${payload.lastName || ''}`.trim() || payload.email,
            monetaryValue: payload?.customField ? undefined : undefined // keep blank; you can set if you want
          })
        });

        const oppText = await oppRes.text();
        let oppJson = null;
        try { oppJson = oppText ? JSON.parse(oppText) : null; } catch { oppJson = { raw: oppText }; }

        if (!oppRes.ok) {
          opportunityResult = {
            ok: false,
            status: oppRes.status,
            body: oppJson
          };
        } else {
          opportunityResult = { ok: true, body: oppJson };
        }
      }
    } else {
      opportunityResult = {
        skipped: true,
        reason: 'GHL_PIPELINE_ID not set (contact upsert still succeeded)'
      };
    }

    return res.status(200).json({
      ok: true,
      contactId,
      upsert: upsertJson,
      opportunity: opportunityResult
    });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
}
