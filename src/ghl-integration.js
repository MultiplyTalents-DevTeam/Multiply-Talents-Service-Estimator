/**
 * GHL INTEGRATION MODULE (PRODUCTION SAFE)
 * - Sends GHL Custom Fields using FIELD IDs (not merge keys)
 * - MULTIPLE_OPTIONS -> array
 * - SINGLE_OPTIONS/LARGE_TEXT -> string
 * - MONETARY -> number
 */

class GHLIntegration {
  constructor() {
    // Vercel proxy endpoint
    this.webhookUrl = '/api/submit-quote';

    /**
     * IMPORTANT:
     * These MUST be the actual GHL Custom Field IDs (not the merge keys).
     * Example (fake): "selected_services": "8YhK1x9QpLz...."
     *
     * If this is missing or still using the merge keys,
     * your fields will stay blank in GHL.
     */
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

  // ==================== WEBHOOK INTEGRATION ====================
  async submitQuote(contactData, quoteData, state) {
    const payload = this.formatGHLPayload(contactData, quoteData, state);

    console.log('[GHLIntegration] Submitting payload to Vercel proxy:', payload);

    try {
      const response = await this.sendWithRetry(payload);

      if (response.ok) {
        return await this.handleSuccessResponse(response);
      }

      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `API Error: ${response.status}`);
    } catch (error) {
      console.error('[GHLIntegration] Submission failed:', error);
      await this.handleFailure(error, payload);
      throw error;
    }
  }

  async sendWithRetry(payload, retryCount = 0) {
    try {
      return await fetch(this.webhookUrl, {
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

  // ==================== DATA HELPERS ====================
  toNumber(v, fallback = 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }

  toStringSafe(v, fallback = '') {
    if (v === null || v === undefined) return fallback;
    return String(v);
  }

  // Convert internal IDs to labels so they match your GHL dropdown options
  mapServiceIdsToNames(serviceIds) {
    if (!Array.isArray(serviceIds)) return [];
    return serviceIds.map((id) => CONFIG?.SERVICES?.[id]?.name || id);
  }

  mapIndustryIdToName(industryId) {
    const found = (CONFIG?.INDUSTRIES || []).find((i) => i.id === industryId);
    return found?.name || 'Other';
  }

  mapScaleIdToName(scaleId) {
    const found = (CONFIG?.BUSINESS_SCALES || []).find((s) => s.id === scaleId);
    return found?.name || 'Solopreneur';
  }

  mapServiceLevelIdToName(levelId) {
    const found = (CONFIG?.SERVICE_LEVELS || []).find((l) => l.id === levelId);
    // If not found, fallback to title-case
    return found?.name || (levelId ? levelId.charAt(0).toUpperCase() + levelId.slice(1) : 'Standard');
  }

  getPrimaryServiceLevelId(state) {
    // highest among selected services
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
    // If field IDs are missing, still send basic contact data (avoid hard crash)
    const fieldIds = this.fieldIds || {};

    // Build values in the EXACT type GHL expects
    const selectedServicesNames = this.mapServiceIdsToNames(state.selectedServices); // MULTIPLE_OPTIONS -> array
    const businessScaleName = this.mapScaleIdToName(state.commonConfig?.scale);     // SINGLE_OPTIONS -> string
    const industryName = this.mapIndustryIdToName(state.commonConfig?.industry);   // SINGLE_OPTIONS -> string
    const serviceLevelName = this.mapServiceLevelIdToName(this.getPrimaryServiceLevelId(state)); // SINGLE_OPTIONS -> string

    // These should match your calculator output:
    // If your calculator uses different names, update these 3 lines only.
    const estimatedInvestment = this.toNumber(quoteData?.subtotal, 0);        // MONETARY -> number
    const bundleDiscount = this.toNumber(quoteData?.totalDiscount ?? quoteData?.discount, 0);
    const finalQuoteTotal = this.toNumber(quoteData?.finalTotal ?? quoteData?.total, 0);

    const projectDescription = this.toStringSafe(contactData.projectDescription, '');
    const videoWalkthrough = state.preferences?.wantsVideo ? 'Yes' : 'No';

    const fullQuoteJson = JSON.stringify({
      selectedServices: state.selectedServices || [],
      selectedServicesNames,
      commonConfig: state.commonConfig || {},
      serviceConfigs: state.serviceConfigs || {},
      quote: quoteData || {},
      timestamp: new Date().toISOString()
    });

    // IMPORTANT: customField keys must be FIELD IDs
    const customField = {};

    // Only set if IDs exist (prevents sending wrong keys)
    if (fieldIds.selected_services) customField[fieldIds.selected_services] = selectedServicesNames;
    if (fieldIds.business_scale) customField[fieldIds.business_scale] = businessScaleName;
    if (fieldIds.service_level) customField[fieldIds.service_level] = serviceLevelName;
    if (fieldIds.industry_type) customField[fieldIds.industry_type] = industryName;

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

  async handleSuccessResponse(response) {
    const data = await response.json().catch(() => ({ status: 'ok' }));
    console.log('[GHLIntegration] Submission successful:', data);
    return { success: true, data };
  }

  async handleFailure(error, payload) {
    this.saveFailedSubmission(payload);
    return { success: false, error: error.message };
  }

  saveFailedSubmission(payload) {
    try {
      const failed = JSON.parse(localStorage.getItem('ghl_failed_submissions') || '[]');
      failed.push({ payload, timestamp: Date.now() });
      localStorage.setItem('ghl_failed_submissions', JSON.stringify(failed.slice(-5)));
    } catch (e) {
      console.warn('[GHLIntegration] LocalStorage save failed', e);
    }
  }

  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

window.ghlIntegration = new GHLIntegration();
