/**
 * GHL INTEGRATION MODULE (PRODUCTION SAFE)
 * - Loads GHL custom field IDs from /api/ghl-estimator-fields
 * - Sends dropdown OPTION VALUES (not labels)
 * - Adds friendly keys for workflow mapping (Inbound Webhook)
 * - Better error surfacing
 */

class GHLIntegration {
  constructor() {
    this.apiUrl = '/api/submit-quote';

    this.fieldIds = null;      // will be filled by loadFieldIds()
    this.ready = this.loadFieldIds();

    this.maxRetries = 3;
    this.retryDelay = 1000;
  }

  // ==================== LOAD FIELD IDS ====================
  async loadFieldIds() {
    try {
      const r = await fetch('/api/ghl-estimator-fields', { method: 'GET' });
      const j = await r.json().catch(() => null);

      if (!r.ok || !j?.ok) {
        console.error('[GHLIntegration] Failed to load field IDs:', j);
        return;
      }

      // Convert:
      // "contact.selected_services" -> { selected_services: "FIELD_ID" }
      const map = {};
      (j.matches || []).forEach((f) => {
        const key = f.key || '';
        if (!key.startsWith('contact.')) return;
        const shortKey = key.replace('contact.', '');
        map[shortKey] = f.id;
      });

      this.fieldIds = map;
      this.assertConfig();
    } catch (e) {
      console.error('[GHLIntegration] Error loading field IDs:', e);
    }
  }

  // ==================== CONFIG GUARD ====================
  assertConfig() {
    const required = [
      'selected_services',
      'business_scale',
      'service_level',
      'estimated_investment',
      'bundle_discount',
      'final_quote_total',
      'project_description',
      'video_walkthrough',
      'full_quote_json',
      'industry_type'
    ];

    if (!this.fieldIds) {
      console.error('[GHLIntegration] Missing fieldIds (loadFieldIds failed).');
      return;
    }

    const missing = required.filter((k) => !this.fieldIds[k] || typeof this.fieldIds[k] !== 'string');
    if (missing.length) {
      console.error('[GHLIntegration] Missing custom field IDs for:', missing);
    }
  }

  // ==================== VALIDATION ====================
  validateContactData(data) {
    const errors = [];
    if (!data.firstName) errors.push('First name is required.');
    if (!data.email || !data.email.includes('@')) errors.push('A valid email is required.');
    return errors;
  }

  // ==================== SUBMIT ====================
  async submitQuote(contactData, quoteData, state) {
    await this.ready; // ensure field IDs loaded (best effort)

    const errors = this.validateContactData(contactData);
    if (errors.length) throw new Error(errors.join(' '));

    const payload = this.formatGHLPayload(contactData, quoteData, state);
    console.log('[GHLIntegration] Submitting payload:', payload);

    const response = await this.sendWithRetry(payload);

    const text = await response.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch {}

    if (!response.ok) {
      const msg =
        json?.message ||
        json?.error ||
        (json?.details ? JSON.stringify(json.details) : null) ||
        text ||
        `API Error: ${response.status}`;
      throw new Error(msg);
    }

    return { success: true, data: json || { ok: true } };
  }

  async sendWithRetry(payload, retryCount = 0) {
    try {
      return await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-GHL-Source': 'service-estimator-v2'
        },
        body: JSON.stringify(payload)
      });
    } catch (error) {
      if (retryCount < this.maxRetries) {
        console.log(`[GHLIntegration] Retry ${retryCount + 1}/${this.maxRetries}...`);
        await this.delay(this.retryDelay * Math.pow(2, retryCount));
        return this.sendWithRetry(payload, retryCount + 1);
      }
      throw error;
    }
  }

  // ==================== HELPERS ====================
  toNumber(v, fallback = 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }

  toStringSafe(v, fallback = '') {
    if (v === null || v === undefined) return fallback;
    return String(v);
  }

  // IMPORTANT:
  // Send OPTION VALUES that match your GHL custom field option values.
  mapSelectedServicesToOptionValues(serviceIds) {
    if (!Array.isArray(serviceIds)) return [];
    return serviceIds; // option values == internal ids
  }

  mapIndustryToOptionValue(industryId) {
    return industryId || 'other';
  }

  mapScaleToOptionValue(scaleId) {
    return scaleId || 'solopreneur';
  }

  getPrimaryServiceLevelId(state) {
    let highest = 'standard';
    const order = ['standard', 'premium', 'luxury'];

    (state.selectedServices || []).forEach((serviceId) => {
      const lvl = state.serviceConfigs?.[serviceId]?.serviceLevel;
      if (lvl && order.indexOf(lvl) > order.indexOf(highest)) highest = lvl;
    });

    return highest;
  }

  // ==================== PAYLOAD FORMAT ====================
  formatGHLPayload(contactData, quoteData, state) {
    const fieldIds = this.fieldIds || {};
    const customField = {};

    const selectedServices = this.mapSelectedServicesToOptionValues(state.selectedServices);
    const selectedServicesText = selectedServices.join(', ');

    const businessScale = this.mapScaleToOptionValue(state.commonConfig?.scale);
    const industryType = this.mapIndustryToOptionValue(state.commonConfig?.industry);
    const serviceLevel = this.getPrimaryServiceLevelId(state);

    const estimatedInvestment = this.toNumber(quoteData?.subtotal, 0);
    const bundleDiscount = this.toNumber(quoteData?.totalDiscount ?? quoteData?.discount, 0);
    const finalQuoteTotal = this.toNumber(quoteData?.finalTotal ?? quoteData?.total, 0);

    const projectDescription = this.toStringSafe(contactData.projectDescription, '');
    const videoWalkthrough = state.preferences?.wantsVideo ? 'yes' : 'no';

    const fullQuoteJson = JSON.stringify({
      selectedServices,
      commonConfig: state.commonConfig || {},
      serviceConfigs: state.serviceConfigs || {},
      quote: quoteData || {},
      timestamp: new Date().toISOString()
    });

    // IDs as keys (correct for API usage)
    if (fieldIds.selected_services) customField[fieldIds.selected_services] = selectedServices;
    if (fieldIds.business_scale) customField[fieldIds.business_scale] = businessScale;
    if (fieldIds.service_level) customField[fieldIds.service_level] = serviceLevel;
    if (fieldIds.industry_type) customField[fieldIds.industry_type] = industryType;

    if (fieldIds.estimated_investment) customField[fieldIds.estimated_investment] = estimatedInvestment;
    if (fieldIds.bundle_discount) customField[fieldIds.bundle_discount] = bundleDiscount;
    if (fieldIds.final_quote_total) customField[fieldIds.final_quote_total] = finalQuoteTotal;

    if (fieldIds.project_description) customField[fieldIds.project_description] = projectDescription;
    if (fieldIds.video_walkthrough) customField[fieldIds.video_walkthrough] = videoWalkthrough;
    if (fieldIds.full_quote_json) customField[fieldIds.full_quote_json] = fullQuoteJson;

    // ✅ Friendly keys for workflow mapping (Inbound Webhook "Create Contact" step)
    return {
      email: contactData.email,
      firstName: contactData.firstName,
      lastName: contactData.lastName || '',
      phone: contactData.phone || '',
      company: contactData.company || '',

      // For API upsert:
      customField,

      // For workflow mapping:
      selected_services: selectedServices,               // array (best for MULTIPLE_OPTIONS)
      selected_services_text: selectedServicesText,      // string backup
      business_scale: businessScale,
      industry_type: industryType,
      service_level: serviceLevel,
      estimated_investment: estimatedInvestment,
      bundle_discount: bundleDiscount,
      final_quote_total: finalQuoteTotal,
      project_description: projectDescription,
      video_walkthrough: videoWalkthrough,
      full_quote_json: fullQuoteJson,

      tags: ['service-estimator', 'quote-request'],
      pipelineStage: this.determinePipeline(state)
    };
  }

  determinePipeline(state) {
    if ((state.selectedServices || []).includes('monthly_management')) return 'monthly_management';
    if ((state.selectedServices || []).includes('platform_migration')) return 'migration';
    return 'setup';
  }

  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

window.ghlIntegration = new GHLIntegration();
