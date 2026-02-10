/**
 * GHL INTEGRATION MODULE (PRODUCTION SAFE)
 * - Uses Vercel proxy endpoint /api/submit-quote
 * - Sends customFields using FIELD IDs (not merge keys)
 * - IMPORTANT: Dropdown fields should send OPTION VALUES (often snake_case ids),
 *   not display labels, unless your GHL option values are the labels.
 */

class GHLIntegration {
  constructor() {
    this.apiUrl = '/api/submit-quote';

    // You said you already fetched these field IDs successfully.
    // This must be an object like:
    // { selected_services: "eA6bJ4aG4wjmA214vAKr", business_scale: "...", ... }
    this.fieldIds = window.GHL_CONFIG?.customFields || null;

    this.maxRetries = 3;
    this.retryDelay = 1000;

    this.assertConfig();
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
      console.error('[GHLIntegration] Missing window.GHL_CONFIG.customFields (must contain field IDs).');
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
    const errors = this.validateContactData(contactData);
    if (errors.length) throw new Error(errors.join(' '));

    const payload = this.formatGHLPayload(contactData, quoteData, state);

    console.log('[GHLIntegration] Submitting payload to Vercel API:', payload);

    const response = await this.sendWithRetry(payload);

    // Always try to read response body so you see REAL error messages
    const text = await response.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }

    if (!response.ok) {
      console.error('[GHLIntegration] Server error response:', data);
      throw new Error(data?.message || data?.error || `API Error: ${response.status}`);
    }

    console.log('[GHLIntegration] Submission successful:', data);
    return { success: true, data };
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

  /**
   * IMPORTANT FIX:
   * For dropdown option fields in GHL, you almost always want to send the OPTION VALUE.
   * Your service IDs already match your option values (new_ghl_setup, platform_migration, fix_optimize),
   * so don’t convert them into labels like "New GHL Setup" (that can break option matching).
   */
  getSelectedServiceOptionValues(state) {
    return Array.isArray(state.selectedServices) ? state.selectedServices : [];
  }

  getIndustryOptionValue(state) {
    return state.commonConfig?.industry || '';
  }

  getScaleOptionValue(state) {
    return state.commonConfig?.scale || '';
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

  getVideoWalkthroughValue(state) {
    // If your GHL options are "Yes"/"No" then keep this.
    // If your option values are "yes"/"no" then change it.
    return state.preferences?.wantsVideo ? 'Yes' : 'No';
  }

  // ==================== PAYLOAD FORMAT ====================
  formatGHLPayload(contactData, quoteData, state) {
    const fieldIds = this.fieldIds || {};

    // OPTION VALUES (not labels)
    const selectedServices = this.getSelectedServiceOptionValues(state); // MULTIPLE_OPTIONS -> array of option values
    const businessScale = this.getScaleOptionValue(state);              // SINGLE_OPTIONS -> option value
    const industryType = this.getIndustryOptionValue(state);            // SINGLE_OPTIONS -> option value
    const serviceLevel = this.getPrimaryServiceLevelId(state);          // SINGLE_OPTIONS -> option value (standard/premium/luxury)

    // Pricing (MONETARY fields should be numbers)
    const estimatedInvestment = this.toNumber(quoteData?.subtotal, 0);
    const bundleDiscount = this.toNumber(quoteData?.totalDiscount ?? quoteData?.discount, 0);
    const finalQuoteTotal = this.toNumber(quoteData?.finalTotal ?? quoteData?.total, 0);

    const projectDescription = this.toStringSafe(contactData.projectDescription, '');
    const videoWalkthrough = this.getVideoWalkthroughValue(state);

    const fullQuoteJson = JSON.stringify({
      selectedServices,
      commonConfig: state.commonConfig || {},
      serviceConfigs: state.serviceConfigs || {},
      quote: quoteData || {},
      timestamp: new Date().toISOString()
    });

    // customField keys MUST be FIELD IDs
    const customField = {};
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

    return {
      email: contactData.email,
      firstName: contactData.firstName,
      lastName: contactData.lastName || '',
      phone: contactData.phone || '',
      company: contactData.company || '',

      customField,

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
