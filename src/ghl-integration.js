/**
 * GHL INTEGRATION MODULE (PRODUCTION SAFE)
 * Handles all GHL-specific operations and Vercel proxying
 *
 * Goals:
 * 1) Do NOT break existing automation (keep customField object)
 * 2) Normalize SINGLE_OPTIONS / MULTIPLE_OPTIONS values to readable labels
 * 3) Also include API-style customField array for maximum compatibility
 */

class GHLIntegration {
    constructor() {
        // Use relative path for Vercel deployment best practices
        this.webhookUrl = '/api/submit-quote';

        /**
         * IMPORTANT:
         * In HighLevel, updating custom fields via API typically requires the *custom field ID*.
         * In workflow webhooks, some people map from incoming JSON.
         *
         * We keep your current keys (safe) but also support overrides via:
         * window.GHL_CONFIG.customFields
         */
        this.fieldKeys = window.GHL_CONFIG?.customFields || {
            selected_services: 'selected_services',
            business_scale: 'business_scale',
            service_level: 'service_level',
            industry_type: 'industry_type',
            estimated_investment: 'estimated_investment',
            bundle_discount: 'bundle_discount',
            final_quote_total: 'final_quote_total',
            project_description: 'project_description',
            video_walkthrough: 'video_walkthrough',
            full_quote_json: 'full_quote_json'
        };

        /**
         * OPTIONAL OVERRIDES:
         * If you want exact labels to match your GHL option labels,
         * you can define window.GHL_CONFIG.optionLabels = {...}
         */
        this.optionLabels = window.GHL_CONFIG?.optionLabels || {};

        this.maxRetries = 3;
        this.retryDelay = 1000;
    }

    // ==================== VALIDATION ====================
    validateContactData(data) {
        const errors = [];
        if (!data.firstName) errors.push("First name is required.");
        if (!data.email || !data.email.includes('@')) errors.push("A valid email is required.");
        return errors;
    }

    // ==================== WEBHOOK INTEGRATION ====================
    async submitQuote(contactData, quoteData, state) {
        const payload = this.formatGHLPayload(contactData, quoteData, state);

        console.log('Submitting to Vercel Proxy...', { payload });

        try {
            const response = await this.sendWithRetry(payload);

            if (response.ok) {
                return await this.handleSuccessResponse(response);
            } else {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `API Error: ${response.status}`);
            }
        } catch (error) {
            console.error('Submission failed:', error);
            await this.handleFailure(error, payload);
            throw error;
        }
    }

    async sendWithRetry(payload, retryCount = 0) {
        try {
            const response = await fetch(this.webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-GHL-Source': 'service-estimator-v2'
                },
                body: JSON.stringify(payload)
            });

            return response;
        } catch (error) {
            if (retryCount < this.maxRetries) {
                console.log(`Retry ${retryCount + 1}/${this.maxRetries}...`);
                await this.delay(this.retryDelay * Math.pow(2, retryCount));
                return this.sendWithRetry(payload, retryCount + 1);
            }
            throw error;
        }
    }

    // ==================== OFFLINE SUPPORT ====================
    async retryFailedSubmissions() {
        try {
            const failed = JSON.parse(localStorage.getItem('ghl_failed_submissions') || '[]');
            if (failed.length === 0) return 0;

            console.log(`Attempting to retry ${failed.length} failed submissions...`);
            let successfulCount = 0;

            for (const item of failed) {
                try {
                    const response = await fetch(this.webhookUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(item.payload)
                    });
                    if (response.ok) successfulCount++;
                } catch (e) {
                    console.error('Retry attempt failed for item:', e);
                }
            }

            localStorage.setItem('ghl_failed_submissions', '[]');
            return successfulCount;
        } catch (error) {
            console.error('Failed to retry submissions:', error);
            return 0;
        }
    }

    // ==================== LABEL + VALUE NORMALIZATION ====================
    /**
     * Converts internal ids/slugs to human labels.
     * This is important for GHL SINGLE_OPTIONS / MULTIPLE_OPTIONS fields.
     */
    toServiceLabel(serviceId) {
        const svc = window.CONFIG?.SERVICES?.[serviceId];
        return svc?.name || serviceId;
    }

    toScaleLabel(scaleId) {
        // Default mapping. Override with window.GHL_CONFIG.optionLabels.scale if needed.
        const map = {
            solopreneur: 'Solopreneur',
            growing: 'Growing Biz',
            scale: 'Scale/Agency',
            enterprise: 'Enterprise'
        };
        return (this.optionLabels.scale?.[scaleId]) || map[scaleId] || scaleId || 'Solopreneur';
    }

    toIndustryLabel(industryId) {
        // If your custom field stores labels, send labels.
        const ind = window.CONFIG?.INDUSTRIES?.find(i => i.id === industryId);
        const fallback = ind?.name || industryId || 'Other';
        return (this.optionLabels.industry?.[industryId]) || fallback;
    }

    toServiceLevelLabel(levelId) {
        // Default mapping. Override with window.GHL_CONFIG.optionLabels.serviceLevel if needed.
        const map = {
            standard: 'Standard',
            premium: 'Premium',
            luxury: 'Luxury'
        };
        return (this.optionLabels.serviceLevel?.[levelId]) || map[levelId] || levelId || 'Standard';
    }

    /**
     * For monetary fields, ensure numbers (no NaN).
     */
    safeNumber(n, fallback = 0) {
        const x = Number(n);
        return Number.isFinite(x) ? x : fallback;
    }

    /**
     * Builds BOTH:
     * - customFieldObject: { keyOrId: value }  (safe for your existing webhook/automation)
     * - customFieldArray: [{ id: keyOrId, value }] (safe for API-style endpoints)
     */
    buildCustomFields(customFieldObject) {
        const customFieldArray = Object.entries(customFieldObject).map(([id, value]) => ({
            id,
            value
        }));
        return { customFieldObject, customFieldArray };
    }

    // ==================== DATA FORMATTING ====================
    formatGHLPayload(contactData, quoteData, state) {
        // Build labels (IMPORTANT for GHL options fields)
        const selectedServiceLabels = (state.selectedServices || []).map(id => this.toServiceLabel(id));
        const serviceLevelLabel = this.toServiceLevelLabel(this.getPrimaryServiceLevel(state));
        const businessScaleLabel = this.toScaleLabel(state.commonConfig?.scale);
        const industryLabel = this.toIndustryLabel(state.commonConfig?.industry);

        // Defensive numbers
        const subtotal = this.safeNumber(quoteData?.subtotal, 0);
        const discount = this.safeNumber(quoteData?.discount, 0);
        const total = this.safeNumber(quoteData?.total, 0);

        // ✅ This object form is what you already use (DO NOT BREAK)
        const customFieldObject = {
            [this.fieldKeys.selected_services]: selectedServiceLabels.join(', '), // MULTIPLE_OPTIONS (label list)
            [this.fieldKeys.business_scale]: businessScaleLabel,                  // SINGLE_OPTIONS (label)
            [this.fieldKeys.service_level]: serviceLevelLabel,                   // SINGLE_OPTIONS (label)
            [this.fieldKeys.industry_type]: industryLabel,                       // SINGLE_OPTIONS (label)
            [this.fieldKeys.estimated_investment]: subtotal,                     // MONETARY
            [this.fieldKeys.bundle_discount]: discount,                          // MONETARY
            [this.fieldKeys.final_quote_total]: total,                           // MONETARY
            [this.fieldKeys.project_description]: contactData.projectDescription || '',
            [this.fieldKeys.video_walkthrough]: state.preferences?.wantsVideo ? 'Yes' : 'No',
            [this.fieldKeys.full_quote_json]: JSON.stringify({
                selectedServices: selectedServiceLabels,
                serviceLevel: serviceLevelLabel,
                businessScale: businessScaleLabel,
                industry: industryLabel,
                quote: quoteData,
                timestamp: new Date().toISOString()
            })
        };

        // ✅ Also include API-style array (extra-safe)
        const { customFieldArray } = this.buildCustomFields(customFieldObject);

        return {
            email: contactData.email,
            firstName: contactData.firstName,
            lastName: contactData.lastName || '',
            phone: contactData.phone || '',
            company: contactData.company || '',

            /**
             * Keep this EXACTLY to avoid breaking your existing automation mapping.
             * Many workflows read from customField.
             */
            customField: customFieldObject,

            /**
             * Extra compatibility (some endpoints prefer this).
             * Won’t break anything if ignored.
             */
            customFields: customFieldArray,

            /**
             * Extra raw payload for debugging/workflow mapping if needed.
             * You can remove later, but it helps see values inside the webhook.
             */
            meta: {
                selectedServicesArray: selectedServiceLabels,
                serviceLevel: serviceLevelLabel,
                businessScale: businessScaleLabel,
                industry: industryLabel
            },

            tags: ['service-estimator', 'quote-request'],
            pipelineStage: this.determinePipeline(state)
        };
    }

    getPrimaryServiceLevel(state) {
        let highestLevel = 'standard';
        const levels = ['standard', 'premium', 'luxury'];

        (state.selectedServices || []).forEach(serviceId => {
            const config = state.serviceConfigs?.[serviceId];
            if (config?.serviceLevel && levels.includes(config.serviceLevel)) {
                if (levels.indexOf(config.serviceLevel) > levels.indexOf(highestLevel)) {
                    highestLevel = config.serviceLevel;
                }
            }
        });

        return highestLevel;
    }

    determinePipeline(state) {
        if ((state.selectedServices || []).includes('monthly_management')) return 'monthly_management';
        if ((state.selectedServices || []).includes('platform_migration')) return 'migration';
        return 'setup';
    }

    async handleSuccessResponse(response) {
        const data = await response.json().catch(() => ({ status: 'ok' }));
        console.log('Submission successful:', data);
        return { success: true, data: data };
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
            console.warn('LocalStorage save failed', e);
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

window.ghlIntegration = new GHLIntegration();
