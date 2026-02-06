/**
 * GHL INTEGRATION MODULE
 * Handles all GHL-specific operations
 */

class GHLIntegration {
    constructor() {
        // Use relative path for Vercel deployment best practices
        this.webhookUrl = '/api/submit-quote'; 
        
        // Safety check for GHL Custom Field IDs
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
        
        this.maxRetries = 3;
        this.retryDelay = 1000;
    }

    // ==================== WEBHOOK INTEGRATION ====================
    async submitQuote(contactData, quoteData, state) {
        const payload = this.formatGHLPayload(contactData, quoteData, state);
        
        console.log('Submitting to Vercel Proxy...', {
            payload: payload
        });
        
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

    // ==================== DATA FORMATTING ====================
    formatGHLPayload(contactData, quoteData, state) {
        return {
            email: contactData.email,
            firstName: contactData.firstName,
            lastName: contactData.lastName || '',
            phone: contactData.phone || '',
            company: contactData.company || '',
            
            // Map to GHL custom fields
            customField: {
                [this.fieldKeys.selected_services]: state.selectedServices.join(', '),
                [this.fieldKeys.business_scale]: state.commonConfig.scale || 'solopreneur',
                [this.fieldKeys.service_level]: this.getPrimaryServiceLevel(state),
                [this.fieldKeys.industry_type]: state.commonConfig.industry || 'other',
                [this.fieldKeys.estimated_investment]: quoteData.subtotal,
                [this.fieldKeys.bundle_discount]: quoteData.discount,
                [this.fieldKeys.final_quote_total]: quoteData.total,
                [this.fieldKeys.project_description]: contactData.projectDescription || '',
                [this.fieldKeys.video_walkthrough]: state.preferences.wantsVideo ? 'Yes' : 'No',
                [this.fieldKeys.full_quote_json]: JSON.stringify({
                    selectedServices: state.selectedServices,
                    quote: quoteData,
                    timestamp: new Date().toISOString()
                })
            },
            
            tags: ['service-estimator', 'quote-request'],
            pipelineStage: this.determinePipeline(state)
        };
    }

    // ==================== HELPER METHODS ====================
    getPrimaryServiceLevel(state) {
        let highestLevel = 'standard';
        state.selectedServices.forEach(serviceId => {
            const config = state.serviceConfigs[serviceId];
            if (config?.serviceLevel) {
                const levels = ['standard', 'premium', 'luxury'];
                if (levels.indexOf(config.serviceLevel) > levels.indexOf(highestLevel)) {
                    highestLevel = config.serviceLevel;
                }
            }
        });
        return highestLevel;
    }

    determinePipeline(state) {
        if (state.selectedServices.includes('monthly_management')) return 'monthly_management';
        if (state.selectedServices.includes('platform_migration')) return 'migration';
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

// Create singleton instance
window.ghlIntegration = new GHLIntegration();