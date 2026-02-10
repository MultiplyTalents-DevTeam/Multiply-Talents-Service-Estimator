/**
 * GHL INTEGRATION MODULE (OPTION B - PRODUCTION SAFE)
 * - Browser sends only logical estimator fields (NO field IDs, NO secrets)
 * - Server (/api/submit-quote) maps logical keys -> real GHL custom field IDs
 * - MULTIPLE_OPTIONS -> array
 * - SINGLE_OPTIONS/LARGE_TEXT -> string
 * - MONETARY -> number
 */

class GHLIntegration {
  constructor() {
    // Vercel proxy endpoint (serverless function)
    this.endpointUrl = '/api/submit-quote';

    // We no longer require window.GHL_CONFIG.customFields for Option B.
    // (All ID mapping happens server-side)
    this.maxRetries = 3;
    this.retryDelay = 1000;
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
    if (errors.length) {
      const msg = errors.join(' ');
      console.error('[GHLIntegration] Validation failed:', msg);
      throw new Error(msg);
    }

    const payload = this.formatPayload(contactData, quoteData, state);

    console.log('[GHLIntegration] Submitting payload to Vercel API:', payload);

    try {
      const response = await this.sendWithRetry(payload);

      if (response.ok) {
        return await this.handleSuccessResponse(response);
      }

      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.message || `API Error: ${response.status}`);
    } catch (error) {
      console.error('[GHLIntegration] Submission failed:', error);
      await this.handleFailure(error, payload);
      throw error;
    }
  }

  async sendWithRetry(payload, retryCount = 0) {
    try {
      return await fetch(this.endpointUrl, {
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

  // Convert internal IDs to labels (must match your GHL options)
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
    return found?.name || (levelId ? levelId.charAt(0).toUpperCase() + levelId.slice(1) : 'Standard');
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

  // ==================== PAYLOAD FORMAT (Option B) ====================
  formatPayload(contactData, quoteData, state) {
    // Values in the EXACT type we want to store
    const selectedServicesNames = this.mapServiceIdsToNames(state.selectedServices); // array
    const businessScaleName = this.mapScaleIdToName(state.commonConfig?.scale);     // string
    const industryName = this.mapIndustryIdToName(state.commonConfig?.industry);   // string
    const serviceLevelName = this.mapServiceLevelIdToName(this.getPrimaryServiceLevelId(state)); // string

    // Calculator output (adjust if your keys differ)
    const estimatedInvestment = this.toNumber(quoteData?.subtotal, 0);
    const bundleDiscount = this.toNumber(quoteData?.totalDiscount ?? quoteData?.discount, 0);
    const finalQuoteTotal = this.toNumber(quoteData?.finalTotal ?? quoteData?.total, 0);

    const projectDescription = this.toStringSafe(contactData.projectDescription, '');
    const videoWalkthrough = state.preferences?.wantsVideo ? 'Yes' : 'No';

    // Store a JSON snapshot as text (server will stringify if needed too)
    const fullQuoteJson = {
      selectedServices: state.selectedServices || [],
      selectedServicesNames,
      commonConfig: state.commonConfig || {},
      serviceConfigs: state.serviceConfigs || {},
      quote: quoteData || {},
      timestamp: new Date().toISOString()
    };

    // Logical keys ONLY (server maps these to field IDs)
    const estimatorFields = {
      selected_services: selectedServicesNames,
      business_scale: businessScaleName,
      service_level: serviceLevelName,
      industry_type: industryName,

      estimated_investment: estimatedInvestment,
      bundle_discount: bundleDiscount,
      final_quote_total: finalQuoteTotal,

      project_description: projectDescription,
      video_walkthrough: videoWalkthrough,
      full_quote_json: fullQuoteJson
    };

    return {
      email: contactData.email,
      firstName: contactData.firstName,
      lastName: contactData.lastName || '',
      phone: contactData.phone || '',
      company: contactData.company || '',

      estimatorFields, // <-- Option B key

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
