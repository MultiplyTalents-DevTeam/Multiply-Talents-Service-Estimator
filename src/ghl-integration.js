/**
 * GHL INTEGRATION MODULE
 * Handles all GHL-specific operations
 */

class GHLIntegration {
    constructor() {
        // Points to your local Vercel API route to keep the GHL URL hidden
        this.webhookUrl = '/api/submit-quote'; 
        
        this.customFields = window.GHL_CONFIG?.customFields || {};
        
        // Retry configuration
        this.maxRetries = 3;
        this.retryDelay = 1000;
    }

    // ==================== WEBHOOK INTEGRATION ====================
    async submitQuote(contactData, quoteData, state) {
        const payload = this.formatGHLPayload(contactData, quoteData, state);
        
        // Removed the explicit URL from the log so it stays hidden in the console
        console.log('Submitting to GHL Proxy...', {
            payload: payload
        });
        
        try {
            const response = await this.sendWithRetry(payload);
            
            if (response.ok) {
                return await this.handleSuccessResponse(response);
            } else {
                throw new Error(`GHL API Error: ${response.status} ${response.statusText}`);
            }
        } catch (error) {
            console.error('GHL submission failed:', error);
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
                console.log(`Retry ${retryCount + 1}/${this.maxRetries} after error:`, error.message);
                await this.delay(this.retryDelay * Math.pow(2, retryCount));
                return this.sendWithRetry(payload, retryCount + 1);
            }
            throw error;
        }
    }

    // ==================== DATA FORMATTING ====================
    formatGHLPayload(contactData, quoteData, state) {
        // Map to your exact GHL custom field structure
        return {
            // Contact fields
            email: contactData.email,
            firstName: contactData.firstName,
            lastName: contactData.lastName || '',
            phone: contactData.phone || '',
            company: contactData.company || '',
            
            // Custom fields (exact match to your GHL setup)
            customField: {
                // Selected Services - MULTIPLE_OPTIONS field
                [this.customFields.selected_services]: state.selectedServices.join(', '),
                
                // Business Scale - SINGLE_OPTIONS field
                [this.customFields.business_scale]: state.commonConfig.scale || 'solopreneur',
                
                // Service Level - SINGLE_OPTIONS field
                [this.customFields.service_level]: this.getPrimaryServiceLevel(state),
                
                // Industry Type - SINGLE_OPTIONS field
                [this.customFields.industry_type]: state.commonConfig.industry || 'other',
                
                // Estimated Investment - MONETARY field
                [this.customFields.estimated_investment]: quoteData.subtotal,
                
                // Bundle Discount - MONETARY field
                [this.customFields.bundle_discount]: quoteData.discount,
                
                // Final Quote Total - MONETARY field
                [this.customFields.final_quote_total]: quoteData.total,
                
                // Project Description - LARGE_TEXT field
                [this.customFields.project_description]: contactData.projectDescription || '',
                
                // Video Walkthrough - SINGLE_OPTIONS field
                [this.customFields.video_walkthrough]: state.preferences.wantsVideo ? 'Yes' : 'No',
                
                // Full Quote JSON - LARGE_TEXT field
                [this.customFields.full_quote_json]: JSON.stringify({
                    contact: contactData,
                    selectedServices: state.selectedServices,
                    configurations: state.serviceConfigs,
                    quote: quoteData,
                    state: state.getSnapshot(),
                    timestamp: new Date().toISOString()
                }, null, 2)
            },
            
            // Tags for automation
            tags: ['service-estimator', 'quote-request'],
            
            // Pipeline assignment (optional)
            pipelineId: this.determinePipeline(state),
            pipelineStageId: 'new_lead'
        };
    }

    // ==================== HELPER METHODS ====================
    getPrimaryServiceLevel(state) {
        // Find the highest service level among selected services
        let highestLevel = 'standard';
        
        state.selectedServices.forEach(serviceId => {
            const config = state.serviceConfigs[serviceId];
            if (config?.serviceLevel) {
                const levels = ['standard', 'premium', 'luxury'];
                const currentIndex = levels.indexOf(config.serviceLevel);
                const highestIndex = levels.indexOf(highestLevel);
                
                if (currentIndex > highestIndex) {
                    highestLevel = config.serviceLevel;
                }
            }
        });
        
        return highestLevel;
    }

    determinePipeline(state) {
        // Determine which pipeline to assign based on services
        if (state.selectedServices.includes('monthly_management')) {
            return 'monthly_management_pipeline';
        } else if (state.selectedServices.includes('platform_migration')) {
            return 'migration_pipeline';
        } else {
            return 'setup_pipeline';
        }
    }

    // ==================== RESPONSE HANDLING ====================
    async handleSuccessResponse(response) {
        const data = await response.json().catch(() => ({}));
        
        console.log('GHL submission successful:', data);
        
        // Return success data
        return {
            success: true,
            data: data,
            message: 'Quote successfully submitted to GHL'
        };
    }

    async handleFailure(error, payload) {
        // Save failed submission for retry later
        this.saveFailedSubmission(payload);
        
        // Log to error tracking service
        this.logError(error, payload);
        
        return {
            success: false,
            error: error.message,
            savedForRetry: true
        };
    }

    // ==================== OFFLINE SUPPORT ====================
    saveFailedSubmission(payload) {
        try {
            const failedSubmissions = JSON.parse(localStorage.getItem('ghl_failed_submissions') || '[]');
            failedSubmissions.push({
                payload,
                timestamp: Date.now(),
                retryCount: 0
            });
            
            localStorage.setItem('ghl_failed_submissions', JSON.stringify(failedSubmissions.slice(-10))); // Keep last 10
        } catch (error) {
            console.warn('Failed to save submission for retry:', error);
        }
    }

    async retryFailedSubmissions() {
        try {
            const failedSubmissions = JSON.parse(localStorage.getItem('ghl_failed_submissions') || '[]');
            const successful = [];
            
            for (const submission of failedSubmissions) {
                try {
                    const response = await this.sendWithRetry(submission.payload);
                    if (response.ok) {
                        successful.push(submission);
                    }
                } catch (error) {
                    console.warn('Retry failed:', error);
                }
            }
            
            // Remove successful retries
            const remaining = failedSubmissions.filter(sub => 
                !successful.some(s => s.timestamp === sub.timestamp)
            );
            
            localStorage.setItem('ghl_failed_submissions', JSON.stringify(remaining));
            
            return successful.length;
        } catch (error) {
            console.error('Failed to retry submissions:', error);
            return 0;
        }
    }

    // ==================== UTILITIES ====================
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    logError(error, context) {
        // Send to error tracking service (Sentry, etc.)
        console.error('GHL Integration Error:', {
            error: error.message,
            stack: error.stack,
            context: context,
            timestamp: new Date().toISOString()
        });
        
        // You can add Sentry/Raygun/etc. integration here
        if (typeof Sentry !== 'undefined') {
            Sentry.captureException(error, { extra: context });
        }
    }

    validateContactData(contactData) {
        const errors = [];
        
        if (!contactData.email || !this.isValidEmail(contactData.email)) {
            errors.push('Valid email is required');
        }
        
        if (!contactData.firstName?.trim()) {
            errors.push('First name is required');
        }
        
        return errors;
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
}

// Create singleton instance
window.ghlIntegration = new GHLIntegration();