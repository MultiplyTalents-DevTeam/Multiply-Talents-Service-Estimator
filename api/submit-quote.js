// api/submit-quote.js
export default async function handler(req, res) {
  // Handle preflight (CORS)
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, message: 'Method Not Allowed' });

  const token = process.env.GHL_ACCESS_TOKEN;
  const locationId = process.env.GHL_LOCATION_ID;

  // Required if you want opportunities created in a specific pipeline/stage
  const pipelineId = process.env.GHL_PIPELINE_ID;
  const stageSetup = process.env.GHL_STAGE_ID_SETUP;
  const stageMigration = process.env.GHL_STAGE_ID_MIGRATION;
  const stageMonthly = process.env.GHL_STAGE_ID_MONTHLY;

  if (!token) return res.status(500).json({ ok: false, message: 'Missing GHL_ACCESS_TOKEN' });
  if (!locationId) return res.status(500).json({ ok: false, message: 'Missing GHL_LOCATION_ID' });

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
      pipelineStage = 'setup'
    } = body;

    if (!email || !firstName) {
      return res.status(422).json({ ok: false, message: 'Missing required fields: firstName, email' });
    }

    // Convert { FIELD_ID: value } -> [{ id, value }]
    const customFieldsArr = Object.entries(customField).map(([id, value]) => ({
      id,
      value
    }));

    // 1) UPSERT CONTACT
    const upsertRes = await fetch('https://services.leadconnectorhq.com/contacts/upsert', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Version: '2021-07-28',
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({
        locationId,
        email,
        firstName,
        lastName: lastName || '',
        phone: phone || '',
        companyName: company || '',
        customFields: customFieldsArr
      })
    });

    const upsertText = await upsertRes.text();
    let upsertJson = null;
    try { upsertJson = upsertText ? JSON.parse(upsertText) : null; } catch {}

    if (!upsertRes.ok) {
      return res.status(upsertRes.status).json({
        ok: false,
        message: 'Contact upsert failed',
        details: upsertJson || upsertText
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
        message: 'Upsert succeeded but contactId missing in response',
        details: upsertJson
      });
    }

    // 2) ADD TAGS (best workflow trigger)
    if (Array.isArray(tags) && tags.length) {
      const tagRes = await fetch(`https://services.leadconnectorhq.com/contacts/${contactId}/tags`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Version: '2021-07-28',
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({ tags })
      });

      // If tags fail, we still continue, but report it
      if (!tagRes.ok) {
        const t = await tagRes.text();
        console.warn('Tag add failed:', t);
      }
    }

    // 3) CREATE OPPORTUNITY (optional, but you want it)
    let opportunity = null;

    if (pipelineId) {
      let pipelineStageId = stageSetup;

      if (pipelineStage === 'migration') pipelineStageId = stageMigration;
      if (pipelineStage === 'monthly_management') pipelineStageId = stageMonthly;

      if (pipelineStageId) {
        // find a monetary value to use
        const monetaryValue = Number(
          Object.values(customField).find((v) => typeof v === 'number') || 0
        );

        const oppRes = await fetch('https://services.leadconnectorhq.com/opportunities/', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            Version: '2021-07-28',
            'Content-Type': 'application/json',
            Accept: 'application/json'
          },
          body: JSON.stringify({
            locationId,
            pipelineId,
            pipelineStageId,
            status: 'open',
            contactId,
            name: `Service Estimate - ${company || email}`,
            monetaryValue
          })
        });

        const oppText = await oppRes.text();
        let oppJson = null;
        try { oppJson = oppText ? JSON.parse(oppText) : null; } catch {}

        if (!oppRes.ok) {
          return res.status(oppRes.status).json({
            ok: false,
            message: 'Opportunity create failed',
            details: oppJson || oppText
          });
        }

        opportunity = oppJson;
      }
    }

    return res.status(200).json({
      ok: true,
      contactId,
      opportunity
    });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message });
  }
}
