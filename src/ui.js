/**
 * UI HANDLERS MODULE - FIXED VERSION (RANGE PRICING + CONSISTENT SUMMARY/REVIEW)
 * All DOM manipulation and rendering logic
 */

class UIHandler {
    constructor() {
        this.state = estimatorState;
        this.calculator = calculator;
        this.config = CONFIG;

        // DOM cache
        this.elements = {};
        this.cacheElements();

        // Subscribe to state changes
        this.state.subscribe(() => this.updateUI());

        // Initialize UI
        this.bindEvents();
        this.updateUI();
    }

    // ==================== ELEMENT CACHING ====================
    cacheElements() {
        this.elements = {
            app: document.getElementById('estimator-app'),
            progressLineActive: document.getElementById('progress-line-active'),
            progressSteps: document.getElementById('progress-steps'),
            servicesGrid: document.getElementById('services-grid'),
            summaryContent: document.getElementById('summary-content'),

            // Step containers
            stepServices: document.getElementById('step-services'),
            stepScope: document.getElementById('step-scope'),
            stepDetails: document.getElementById('step-details'),
            stepReview: document.getElementById('step-review'),
            stepContact: document.getElementById('step-contact'),

            // Buttons
            servicesContinue: document.getElementById('services-continue'),
            scopeBack: document.getElementById('scope-back'),
            scopeContinue: document.getElementById('scope-continue'),
            detailsBack: document.getElementById('details-back'),
            detailsContinue: document.getElementById('details-continue'),
            reviewBack: document.getElementById('review-back'),
            reviewContinue: document.getElementById('review-continue'),
            contactBack: document.getElementById('contact-back'),

            // Forms
            quoteForm: document.getElementById('quote-form'),
            videoOption: document.getElementById('video-option'),
            videoCheckbox: document.getElementById('video-checkbox'),

            // Bundles display
            bundlesContainer: document.getElementById('bundles-container'),

            // View more addons toggle
            viewMoreAddons: document.getElementById('view-more-addons')
        };
    }

    // ==================== EVENT BINDING ====================
    bindEvents() {
        // Navigation buttons
        if (this.elements.servicesContinue) {
            this.elements.servicesContinue.onclick = () => this.goToStep('scope');
        }
        if (this.elements.scopeBack) {
            this.elements.scopeBack.onclick = () => this.goToStep('services');
        }
        if (this.elements.scopeContinue) {
            this.elements.scopeContinue.onclick = () => this.goToStep('details');
        }
        if (this.elements.detailsBack) {
            this.elements.detailsBack.onclick = () => this.goToStep('scope');
        }
        if (this.elements.detailsContinue) {
            this.elements.detailsContinue.onclick = () => this.goToStep('review');
        }
        if (this.elements.reviewBack) {
            this.elements.reviewBack.onclick = () => this.goToStep('details');
        }
        if (this.elements.reviewContinue) {
            this.elements.reviewContinue.onclick = () => this.goToStep('contact');
        }
        if (this.elements.contactBack) {
            this.elements.contactBack.onclick = () => this.goToStep('review');
        }

        // Video option toggle
        if (this.elements.videoOption) {
            this.elements.videoOption.onclick = () => this.toggleVideoOption();
        }

        // View more addons toggle
        if (this.elements.viewMoreAddons) {
            this.elements.viewMoreAddons.onclick = () => this.toggleAllAddons();
        }

        // Reset form on page refresh
        window.addEventListener('beforeunload', () => {
            this.state.reset();
        });
    }

    // ==================== MASTER UPDATE FUNCTION ====================
    updateUI() {
        // Update progress steps
        this.renderProgressSteps();

        // Show/hide step containers
        this.showCurrentStep();

        // Update step-specific content
        switch (this.state.currentStep) {
            case 'services':
                this.renderServices();
                break;
            case 'scope':
                this.renderScope();
                break;
            case 'details':
                this.renderDetails();
                break;
            case 'review':
                this.renderReview();
                break;
            case 'contact':
                this.renderContact();
                break;
        }

        // Always update summary panel
        this.renderSummary();

        // Update navigation buttons
        this.updateNavigation();

        // Update bundles display
        this.renderBundles();
    }

    // ==================== RANGE DISPLAY HELPERS ====================
    formatRangeOrNumber(rangeObj, numberFallback = 0) {
        // Prefer calculator.formatCurrencyRange if available (from your updated calculator.js)
        if (this.calculator && typeof this.calculator.formatCurrencyRange === 'function' && rangeObj) {
            return this.calculator.formatCurrencyRange(rangeObj);
        }
        // Fallback: show number
        return `$${this.calculator.formatNumber(typeof numberFallback === 'number' ? numberFallback : 0)}`;
    }

    getServiceBaseDisplay(service) {
        // Show service base price RANGE if present
        if (service && service.basePriceRange && typeof this.calculator.formatCurrencyRange === 'function') {
            return this.calculator.formatCurrencyRange(service.basePriceRange);
        }
        // fallback to basePrice
        return `$${this.calculator.formatNumber(service.basePrice || 0)}`;
    }

    isCapabilityIncludedForService(serviceId, capId) {
        const map = this.config.PRICING_RULES?.includedCapabilitiesByService || {};
        const included = map[serviceId] || [];
        return included.includes(capId);
    }

    // ==================== STEP NAVIGATION ====================
    goToStep(stepId) {
        // Determine direction to avoid validating the *target* step on forward navigation
        const currentIndex = this.config.STEPS.findIndex(s => s.id === this.state.currentStep);
        const targetIndex = this.config.STEPS.findIndex(s => s.id === stepId);
        const isForward = targetIndex > currentIndex;

        if (isForward) {
            // Validate the CURRENT step before moving forward
            if (this.state.validateStep(this.state.currentStep)) {
                this.showStep(stepId);
            } else {
                this.showValidationError(this.state.currentStep);
            }
            return;
        }

        // Back navigation (or jumps to completed steps)
        this.showStep(stepId);
    }

    showStep(stepId) {
        // Avoid double-updates if caller already set it
        if (this.state.currentStep !== stepId) {
            this.state.update({ currentStep: stepId });
        } else {
            // Still ensure visibility + scroll behavior
            this.showCurrentStep();
        }

        // Auto-scroll to top on step transitions
        this.scrollToTop();
    }

    scrollToTop() {
        const prefersReduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
        const behavior = prefersReduced ? 'auto' : 'smooth';

        // 1) Scroll the window (works for most GHL embeds)
        try {
            window.scrollTo({ top: 0, behavior });
        } catch (e) {
            window.scrollTo(0, 0);
        }

        // 2) Scroll the main app container (if it’s the scroll parent)
        const app = this.elements.app || document.getElementById('estimator-app');
        if (app && typeof app.scrollTop === 'number') app.scrollTop = 0;

        // 3) Scroll the active step container (belt + suspenders)
        const activeStep = document.querySelector('.step-content.active');
        if (activeStep && typeof activeStep.scrollTop === 'number') activeStep.scrollTop = 0;
    }

    showLoading(isLoading, message = 'Submitting...') {
        // Toggle a global loading state
        const app = this.elements.app || document.getElementById('estimator-app') || document.body;
        document.body.classList.toggle('is-loading', !!isLoading);
        if (app) app.classList.toggle('is-loading', !!isLoading);

        // Create overlay once
        let overlay = document.getElementById('loading-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'loading-overlay';
            overlay.className = 'loading-overlay';
            overlay.setAttribute('aria-hidden', 'true');
            overlay.innerHTML = `
                <div class="loading-panel" role="status" aria-live="polite">
                    <div class="loading-spinner" aria-hidden="true"></div>
                    <div class="loading-text"></div>
                </div>
            `;
            document.body.appendChild(overlay);
        }

        const textEl = overlay.querySelector('.loading-text');
        if (textEl) textEl.textContent = message;

        overlay.classList.toggle('active', !!isLoading);
        overlay.setAttribute('aria-hidden', isLoading ? 'false' : 'true');
        document.body.setAttribute('aria-busy', isLoading ? 'true' : 'false');
    }

    showCurrentStep() {
        // Hide all steps first
        document.querySelectorAll('.step-content').forEach(el => {
            el.classList.remove('active');
        });

        // Show current step
        const currentStepEl = document.getElementById(`step-${this.state.currentStep}`);
        if (currentStepEl) {
            currentStepEl.classList.add('active');
        }
    }

    showValidationError(stepId) {
        let message = '';
        switch (stepId) {
            case 'services':
                message = 'Please select at least one service before continuing.';
                break;
            case 'scope':
                message = 'Please select both your industry and business scale before continuing.';
                break;
            case 'details':
                message = 'Please configure service levels for all selected services before continuing.';
                break;
        }

        if (message) {
            // Create or update validation message
            let errorEl = document.querySelector('.validation-error');
            if (!errorEl) {
                errorEl = document.createElement('div');
                errorEl.className = 'validation-error';
                document.querySelector('.step-content.active').appendChild(errorEl);
            }
            errorEl.textContent = message;
            errorEl.style.display = 'block';

            // Auto-hide after 5 seconds
            setTimeout(() => {
                errorEl.style.display = 'none';
            }, 5000);
        }
    }

    // ==================== PROGRESS STEPS ====================
    renderProgressSteps() {
        const container = this.elements.progressSteps;
        const progressLine = this.elements.progressLineActive;
        if (!container || !progressLine) return;

        // Clear existing steps
        container.querySelectorAll('.progress-step').forEach(el => el.remove());

        // Get current step index
        const currentStepIndex = this.config.STEPS.findIndex(s => s.id === this.state.currentStep);

        // Create step indicators
        this.config.STEPS.forEach((step, index) => {
            const stepElement = document.createElement('div');
            stepElement.className = 'progress-step';

            let circleClass = 'step-circle';
            let labelClass = 'step-label';

            if (index < currentStepIndex) {
                circleClass += ' completed';
            } else if (index === currentStepIndex) {
                circleClass += ' active';
                labelClass += ' active';
            }

            stepElement.innerHTML = `
                <div class="${circleClass}">
                    ${index < currentStepIndex ? '✓' : step.number}
                </div>
                <span class="${labelClass}">${step.label}</span>
            `;

            // Make completed steps clickable
            if (index < currentStepIndex) {
                stepElement.style.cursor = 'pointer';
                stepElement.onclick = () => this.goToStep(step.id);
            }

            container.appendChild(stepElement);
        });

        // Update progress line
        const progressPercent = (currentStepIndex / (this.config.STEPS.length - 1)) * 100;
        progressLine.style.width = `${progressPercent}%`;
    }

    // ==================== STEP 1: SERVICES ====================
    renderServices() {
        const container = this.elements.servicesGrid;
        if (!container) return;

        container.innerHTML = '';

        Object.values(this.config.SERVICES).forEach(service => {
            const isSelected = this.state.selectedServices.includes(service.id);
            const hasRecommendedBadge = service.recommendedBadge;
            const serviceCard = document.createElement('div');
            serviceCard.className = `service-card ${isSelected ? 'selected' : ''} ${hasRecommendedBadge ? 'recommended' : ''}`;
            serviceCard.onclick = () => this.state.toggleService(service.id);

            // Keep structure stable, but hide price on Step 1 cards
            const baseRangeText = this.getServiceBaseDisplay(service);

            serviceCard.innerHTML = `
                <div class="service-icon">${service.icon}</div>
                <div class="service-content">
                    ${hasRecommendedBadge ? '<div class="recommended-badge">🔥 Most Popular</div>' : ''}
                    <h3>${service.name}</h3>
                    <p>${service.description}</p>
                    <div class="service-range-hint" style="display:none;">${baseRangeText}${service.isMonthly ? '<span class="price-period">/month</span>' : ''}</div>
                </div>
                <div class="selection-indicator">
                    <div class="selection-dot"></div>
                </div>
            `;

            container.appendChild(serviceCard);
        });

        if (this.elements.servicesContinue) {
            this.elements.servicesContinue.disabled = this.state.selectedServices.length === 0;
        }
    }

    // ==================== STEP 2: SCOPE ====================
    renderScope() {
        const body = document.getElementById('step-scope-body');
        if (!body) return;

        // Render the body content
        body.innerHTML = `
            <div class="help-banner">
                <span class="help-banner-icon">ℹ️</span>
                <div class="help-banner-content">
                    <p>These settings apply to <strong>all selected services</strong> and help us tailor the setup to your needs.</p>
                </div>
            </div>

            <div class="tab-section">
                <h3>🏢 What industry are you in?</h3>
                <p>This helps us customize templates and workflows for your business</p>
                <div class="config-grid three-col" id="industry-grid"></div>
            </div>

            <div class="tab-section">
                <h3>📊 What's your business scale?</h3>
                <p>Understanding your size helps us scope the project correctly</p>
                <div class="config-grid" id="scale-grid"></div>
            </div>
        `;

        // Now render the grids
        this.renderIndustryGrid();
        this.renderScaleGrid();
        this.updateScopeContinueButton();
    }

    renderIndustryGrid() {
        const container = document.getElementById('industry-grid');
        if (!container) return;

        container.innerHTML = '';

        this.config.INDUSTRIES.forEach(industry => {
            const isSelected = this.state.commonConfig.industry === industry.id;
            const option = document.createElement('div');
            option.className = `config-option ${isSelected ? 'selected' : ''}`;
            option.onclick = () => {
                this.state.update({
                    commonConfig: {
                        ...this.state.commonConfig,
                        industry: industry.id
                    }
                });
            };

            option.innerHTML = `
                <span class="option-icon">${industry.icon}</span>
                <div class="option-title">${industry.name}</div>
            `;

            container.appendChild(option);
        });
    }

    renderScaleGrid() {
        const container = document.getElementById('scale-grid');
        if (!container) return;

        container.innerHTML = '';

        this.config.BUSINESS_SCALES.forEach(scale => {
            const isSelected = this.state.commonConfig.scale === scale.id;
            const option = document.createElement('div');
            option.className = `config-option ${isSelected ? 'selected' : ''}`;
            option.onclick = () => {
                this.state.update({
                    commonConfig: {
                        ...this.state.commonConfig,
                        scale: scale.id
                    }
                });
            };

            option.innerHTML = `
                <span class="option-icon">${scale.icon}</span>
                <div class="option-title">${scale.name}</div>
                <div class="option-description">${scale.description}</div>
                ${scale.adder > 0 ? `<div class="option-price">+$${scale.adder}</div>` : ''}
            `;

            container.appendChild(option);
        });
    }

    updateScopeContinueButton() {
        const btn = this.elements.scopeContinue;
        if (btn) {
            btn.disabled = !this.state.commonConfig.industry || !this.state.commonConfig.scale;
        }
    }

    // ==================== STEP 3: DETAILS ====================
    renderDetails() {
        const body = document.getElementById('step-details-body');
        if (!body) return;

        body.innerHTML = `
            <div class="help-banner" style="margin: 0; border-radius: 0;">
                <span class="help-banner-icon">🎯</span>
                <div class="help-banner-content">
                    <p>Use the tabs below to configure each service. Your progress is saved automatically as you go.</p>
                </div>
            </div>

            <div class="service-tabs" id="service-tabs"></div>
            <div id="tab-contents"></div>
        `;

        this.renderServiceTabs();
        this.renderTabContents();

        // Activate first tab if none active
        if (!this.state.activeTab || !this.state.selectedServices.includes(this.state.activeTab)) {
            this.state.activeTab = this.state.selectedServices[0];
        }
        this.activateTab(this.state.activeTab);
    }

    renderServiceTabs() {
        const container = document.getElementById('service-tabs');
        if (!container) return;

        container.innerHTML = '';

        this.state.selectedServices.forEach(serviceId => {
            const service = this.config.SERVICES[serviceId];
            const completionCount = this.getServiceCompletionCount(serviceId);
            const totalSteps = 3;

            const tab = document.createElement('button');
            tab.className = 'service-tab';
            tab.dataset.serviceId = serviceId;
            tab.onclick = () => this.activateTab(serviceId);

            tab.innerHTML = `
                <span class="tab-icon">${service.icon}</span>
                <span>${service.name}</span>
                ${completionCount > 0 ? `<span class="tab-badge">${completionCount}/${totalSteps}</span>` : ''}
            `;

            container.appendChild(tab);
        });
    }

    getServiceCompletionCount(serviceId) {
        const config = this.state.serviceConfigs[serviceId] || {};
        let count = 0;
        if (config.capabilities && config.capabilities.length > 0) count++;
        if (config.serviceLevel) count++;
        if (config.addons && config.addons.length > 0) count++;
        return count;
    }

    renderTabContents() {
        const container = document.getElementById('tab-contents');
        if (!container) return;

        container.innerHTML = '';

        this.state.selectedServices.forEach(serviceId => {
            const service = this.config.SERVICES[serviceId];
            const completionCount = this.getServiceCompletionCount(serviceId);
            const totalSteps = 3;
            const progressPercent = (completionCount / totalSteps) * 100;

            const tabContent = document.createElement('div');
            tabContent.className = 'tab-content';
            tabContent.dataset.serviceId = serviceId;

            tabContent.innerHTML = `
                <div class="details-progress">
                    <div class="details-progress-text">
                        <strong>Configuration Progress:</strong> ${completionCount} of ${totalSteps} sections completed
                    </div>
                    <div class="details-progress-bar">
                        <div class="details-progress-fill" style="width: ${progressPercent}%"></div>
                    </div>
                </div>

                <div class="tab-section">
                    <h3>🎯 Select Capabilities</h3>
                    <p>Choose what you need for ${service.name}</p>
                    <div class="config-grid" id="capabilities-${serviceId}"></div>
                </div>

                <div class="tab-section">
                    <h3>⭐ Choose Service Level</h3>
                    <p>Select your preferred level of support</p>
                    <div class="config-grid three-col" id="levels-${serviceId}"></div>
                </div>

                <div class="tab-section">
                    <h3>➕ Add-ons (Optional)</h3>
                    <p>Enhance your service with optional add-ons</p>
                    <div class="config-grid" id="addons-${serviceId}"></div>
                </div>
            `;

            container.appendChild(tabContent);

            this.renderCapabilities(serviceId);
            this.renderServiceLevels(serviceId);
            this.renderAddons(serviceId);
        });
    }

    renderCapabilities(serviceId) {
        const container = document.getElementById(`capabilities-${serviceId}`);
        if (!container) return;

        const config = this.state.serviceConfigs[serviceId] || {};
        const service = this.config.SERVICES[serviceId];

        // Get capabilities for this specific service
        const serviceCapabilities = service.capabilities || [];

        container.innerHTML = '';

        serviceCapabilities.forEach(capId => {
            const capability = this.config.CAPABILITIES[capId];
            if (!capability) return;

            const isSelected = (config.capabilities || []).includes(capId);

            // NEW: included logic for New GHL Setup bundle items
            const isIncluded = this.isCapabilityIncludedForService(serviceId, capId);

            const option = document.createElement('div');
            option.className = `config-option ${isSelected ? 'selected' : ''} ${capability.isPopularBundlePart ? 'popular-bundle-part' : ''} ${isIncluded ? 'included-option' : ''}`;
            option.dataset.capabilityId = capId;

            option.onclick = () => {
                const newConfig = { ...config };
                newConfig.capabilities = newConfig.capabilities || [];

                const idx = newConfig.capabilities.indexOf(capId);
                if (idx > -1) {
                    newConfig.capabilities.splice(idx, 1);
                } else {
                    newConfig.capabilities.push(capId);
                }

                this.state.updateServiceConfig(serviceId, newConfig);
            };

            option.innerHTML = `
                <span class="option-icon">${capability.icon}</span>
                <div class="option-title">
                    ${capability.name}
                    ${isIncluded ? '<span class="included-badge">Included</span>' : ''}
                </div>
                <div class="option-description">${capability.pitch || ''}</div>
                ${
                    isIncluded
                        ? `<div class="option-price included-price">Included</div>`
                        : (capability.price > 0 ? `<div class="option-price">+$${capability.price}</div>` : '')
                }
                ${capability.isPopularBundlePart ? `<div class="bundle-indicator">Popular Bundle Item</div>` : ''}
            `;

            container.appendChild(option);
        });
    }

    renderServiceLevels(serviceId) {
        const container = document.getElementById(`levels-${serviceId}`);
        if (!container) return;

        const config = this.state.serviceConfigs[serviceId] || {};

        this.config.SERVICE_LEVELS.forEach(level => {
            const isSelected = config.serviceLevel === level.id;
            const option = document.createElement('div');
            option.className = `config-option ${level.popular ? 'popular' : ''} ${isSelected ? 'selected' : ''}`;
            option.dataset.levelId = level.id;
            option.onclick = () => {
                const newConfig = { ...config, serviceLevel: level.id };
                this.state.updateServiceConfig(serviceId, newConfig);
            };

            option.innerHTML = `
                ${level.popular ? '<div class="popular-badge">Most Popular</div>' : ''}
                <div class="option-title">${level.name}</div>
                <div class="option-description">${level.description}</div>
                <div style="margin-top: 0.75rem;">
                    ${level.features.slice(0, 3).map(feature => `
                        <div style="display: flex; align-items: center; gap: 0.375rem; font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 0.25rem;">
                            <span style="color: var(--accent-gold);">✓</span>
                            <span>${feature}</span>
                        </div>
                    `).join('')}
                </div>
                ${level.adder > 0 ? `<div class="option-price" style="margin-top: 1rem;">+$${level.adder}</div>` : ''}
            `;

            container.appendChild(option);
        });
    }

    renderAddons(serviceId) {
        const container = document.getElementById(`addons-${serviceId}`);
        if (!container) return;

        const config = this.state.serviceConfigs[serviceId] || {};

        // Determine which addons to show (all if toggled, otherwise first 4)
        const showAll = this.state.preferences.showAllAddons;
        const addonsToShow = showAll ? this.config.ADDONS : this.config.ADDONS.slice(0, 4);

        container.innerHTML = '';

        addonsToShow.forEach(addon => {
            const isSelected = (config.addons || []).includes(addon.id);
            const option = document.createElement('div');
            option.className = `config-option ${isSelected ? 'selected' : ''}`;
            option.dataset.addonId = addon.id;
            option.onclick = () => {
                const newConfig = { ...config };
                newConfig.addons = newConfig.addons || [];

                const idx = newConfig.addons.indexOf(addon.id);
                if (idx > -1) {
                    newConfig.addons.splice(idx, 1);
                } else {
                    newConfig.addons.push(addon.id);
                }

                this.state.updateServiceConfig(serviceId, newConfig);
            };

            // NEW: show addon range if provided, otherwise addon.price
            const addonDisplay = (addon.priceRange && typeof this.calculator.formatCurrencyRange === 'function')
                ? this.calculator.formatCurrencyRange(addon.priceRange)
                : `+$${this.calculator.formatNumber(addon.price)}`;

            option.innerHTML = `
                <span class="option-icon">${addon.icon}</span>
                <div class="option-title">${addon.name}</div>
                <div class="option-description">${addon.description}</div>
                <div class="option-price">${addonDisplay}</div>
            `;

            container.appendChild(option);
        });

        // Add view more toggle if not showing all
        if (!showAll && this.config.ADDONS.length > 4) {
            const viewMoreOption = document.createElement('div');
            viewMoreOption.className = 'config-option view-more-option';
            viewMoreOption.onclick = () => {
                this.state.update({
                    preferences: {
                        ...this.state.preferences,
                        showAllAddons: true
                    }
                });
            };

            viewMoreOption.innerHTML = `
                <span class="option-icon">➕</span>
                <div class="option-title">View More Add-ons</div>
                <div class="option-description">See ${this.config.ADDONS.length - 4} more technical enhancements</div>
            `;

            container.appendChild(viewMoreOption);
        }
    }

    activateTab(serviceId) {
        this.state.activeTab = serviceId;

        // Update tab UI
        document.querySelectorAll('.service-tab').forEach(tab => {
            if (tab.dataset.serviceId === serviceId) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });

        // Update content UI
        document.querySelectorAll('.tab-content').forEach(content => {
            if (content.dataset.serviceId === serviceId) {
                content.classList.add('active');
            } else {
                content.classList.remove('active');
            }
        });
    }

    // ==================== STEP 4: REVIEW ====================
    renderReview() {
        const body = document.getElementById('step-review-body');
        if (!body) return;

        const quote = this.calculator.calculateTotalQuote(this.state);
        const timeline = this.calculator.estimateTimeline(
            this.state.selectedServices,
            this.getHighestServiceLevel()
        );
        const deliveryDate = this.calculator.estimateDeliveryDate(timeline);

        body.innerHTML = `
            <div class="help-banner">
                <span class="help-banner-icon">✨</span>
                <div class="help-banner-content">
                    <p><strong>Almost there!</strong> Review your selections below. You can go back to make changes anytime.</p>
                </div>
            </div>

            <div class="invoice-card">
                ${this.renderInvoiceHeader()}
                ${this.renderInvoiceScope()}
                ${this.renderInvoiceServices(quote)}
                ${this.renderInvoiceTotals(quote)}
                ${this.renderTimelineInfo(timeline, deliveryDate)}
            </div>
        `;
    }

    getHighestServiceLevel() {
        let highestLevel = 'standard';
        Object.values(this.state.serviceConfigs).forEach(config => {
            if (config.serviceLevel === 'luxury') highestLevel = 'luxury';
            else if (config.serviceLevel === 'premium' && highestLevel !== 'luxury') highestLevel = 'premium';
        });
        return highestLevel;
    }

    renderInvoiceHeader() {
        return `
            <div class="invoice-header">
                <div class="invoice-brand">
                    <h1>MultiplyTalents</h1>
                    <p>Professional Service Estimate</p>
                </div>
                <div class="invoice-number">
                    <h2>Estimate #</h2>
                    <p>${Date.now().toString().slice(-8)}</p>
                </div>
            </div>
        `;
    }

    renderInvoiceScope() {
        const industry = this.config.INDUSTRIES.find(i => i.id === this.state.commonConfig.industry);
        const scale = this.config.BUSINESS_SCALES.find(s => s.id === this.state.commonConfig.scale);

        return `
            <div class="invoice-section">
                <h3>Project Scope</h3>
                <div class="scope-grid">
                    ${industry ? `
                        <div class="scope-item">
                            <div class="scope-label">🏢 Industry</div>
                            <div class="scope-value">${industry.name}</div>
                            ${industry.multiplier > 1 ? `<div class="scope-note">${Math.round((industry.multiplier - 1) * 100)}% complexity adjustment</div>` : ''}
                        </div>
                    ` : ''}
                    ${scale ? `
                        <div class="scope-item">
                            <div class="scope-label">📊 Business Scale</div>
                            <div class="scope-value">${scale.name}</div>
                            ${scale.adder > 0 ? `<div class="scope-note">+$${scale.adder} scale adjustment</div>` : ''}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    renderInvoiceServices(quote) {
        return `
            <div class="invoice-section">
                <h3>Selected Services</h3>
                ${quote.services.map(service => this.renderInvoiceService(service)).join('')}
            </div>
        `;
    }

    renderInvoiceService(service) {
        const serviceConfig = this.config.SERVICES[service.serviceId];
        const serviceLevel = this.config.SERVICE_LEVELS.find(l => l.id === this.state.serviceConfigs[service.serviceId]?.serviceLevel);

        // NEW: show service subtotal range in review
        const serviceTotalDisplay = service.subtotalRange
            ? this.formatRangeOrNumber(service.subtotalRange, service.subtotal)
            : `$${this.calculator.formatNumber(service.subtotal)}`;

        return `
            <div class="invoice-service">
                <div class="service-header">
                    <div class="service-title">
                        <span class="service-icon">${serviceConfig.icon}</span>
                        <h4>${service.serviceName}</h4>
                        ${service.isMonthly ? '<span class="monthly-badge">Monthly</span>' : ''}
                    </div>
                    <div class="service-price">
                        ${serviceTotalDisplay}
                        ${service.isMonthly ? '<span class="price-period">/month</span>' : ''}
                    </div>
                </div>

                ${service.breakdown.length > 0 ? `
                    <div class="service-breakdown">
                        ${service.breakdown.map(item => {
                            const isIncluded = item.included === true || item.amount === 0;
                            return `
                                <div class="breakdown-item">
                                    <span class="breakdown-name">• ${item.name}${isIncluded ? ' <span class="included-pill">Included</span>' : ''}</span>
                                    <span class="breakdown-price">${isIncluded ? 'Included' : `+$${this.calculator.formatNumber(item.amount)}`}</span>
                                </div>
                            `;
                        }).join('')}
                    </div>
                ` : ''}

                ${serviceLevel ? `
                    <div class="service-level">
                        <div class="level-name">${serviceLevel.name} Service Level</div>
                        ${serviceLevel.adder > 0 ? `<div class="level-price">+$${serviceLevel.adder}</div>` : ''}
                    </div>
                ` : ''}
            </div>
        `;
    }

    renderInvoiceTotals(quote) {
        const hasMonthly = quote.hasMonthly;
        const hasDiscount = quote.totalDiscount > 0;

        const subtotalDisplay = quote.subtotalRange
            ? this.formatRangeOrNumber(quote.subtotalRange, quote.subtotal)
            : `$${this.calculator.formatNumber(quote.subtotal)}`;

        const finalDisplay = quote.finalTotalRange
            ? this.formatRangeOrNumber(quote.finalTotalRange, quote.finalTotal)
            : `$${this.calculator.formatNumber(quote.finalTotal)}`;

        const westernDisplay = (this.config.PRICING_RULES && this.config.PRICING_RULES.typicalUSBasedAgencyRange)
            ? this.formatRangeOrNumber(this.config.PRICING_RULES.typicalUSBasedAgencyRange, quote.westernAgencyPrice)
            : (quote.westernAgencyPriceRange
                ? this.formatRangeOrNumber(quote.westernAgencyPriceRange, quote.westernAgencyPrice)
                : `$${this.calculator.formatNumber(quote.westernAgencyPrice)}`);

        return `
            <div class="invoice-totals">
                <div class="total-row">
                    <span class="total-label">Subtotal</span>
                    <span class="total-value">${subtotalDisplay}</span>
                </div>

                ${hasDiscount ? `
                    <div class="total-row discount-row">
                        <span class="total-label">
                            ${quote.appliedBundles.length > 0 ? 'Bundle Savings' : 'Multi-Service Discount'}
                        </span>
                        <span class="total-value discount">-$${this.calculator.formatNumber(quote.totalDiscount)}</span>
                    </div>

                    ${quote.appliedBundles.length > 0 ? `
                        <div class="bundle-savings">
                            <div class="bundle-savings-title">✨ Applied Growth Packages:</div>
                            ${quote.appliedBundles.map(bundle => `
                                <div class="bundle-item">
                                    <span>${bundle.name}</span>
                                    <span class="bundle-savings-amount">Saved $${bundle.savings}</span>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                ` : ''}

                <div class="total-row grand-total">
                    <div class="grand-total-left">
                        <div class="total-label grand">Estimated Total</div>
                        <div class="total-period">${hasMonthly ? 'Monthly investment' : 'One-time investment'}</div>
                        <div class="estimate-note">Final price may vary based on scope and technical complexity.</div>
                    </div>
                    <div class="grand-total-right">
                        <div class="total-value grand count-animation">${finalDisplay}</div>
                        ${hasMonthly ? '<div class="total-period">/month</div>' : ''}
                    </div>
                </div>

                <div class="price-anchor">
                    <div class="anchor-label">💎 On Shore Agency Value</div>
                    <div class="anchor-value">${westernDisplay}</div>
                    <div class="anchor-note">Estimated range from a typical US-based agency in your country</div>
                </div>
            </div>
        `;
    }

    renderTimelineInfo(timeline, deliveryDate) {
        return `
            <div class="timeline-section">
                <h3>📅 Estimated Timeline</h3>
                <div class="timeline-content">
                    <div class="timeline-item">
                        <div class="timeline-icon">⏱️</div>
                        <div>
                            <div class="timeline-label">Project Duration</div>
                            <div class="timeline-value">${timeline} business days</div>
                        </div>
                    </div>
                    <div class="timeline-item">
                        <div class="timeline-icon">📅</div>
                        <div>
                            <div class="timeline-label">Estimated Delivery</div>
                            <div class="timeline-value">${deliveryDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // ==================== STEP 5: CONTACT ====================
    renderContact() {
        // Update video option UI
        if (this.elements.videoOption && this.elements.videoCheckbox) {
            this.elements.videoOption.classList.toggle('selected', this.state.preferences.wantsVideo);
            this.elements.videoCheckbox.classList.toggle('checked', this.state.preferences.wantsVideo);
        }

        // Update the form summary
        this.renderContactSummary();
    }

    renderContactSummary() {
        const summaryEl = document.getElementById('contact-summary');
        if (!summaryEl) return;

        const quote = this.calculator.calculateTotalQuote(this.state);

        const finalDisplay = quote.finalTotalRange
            ? this.formatRangeOrNumber(quote.finalTotalRange, quote.finalTotal)
            : `$${this.calculator.formatNumber(quote.finalTotal)}`;

        summaryEl.innerHTML = `
            <div class="contact-summary-card">
                <h3>Your Estimate Summary</h3>
                <div class="summary-item">
                    <span class="summary-label">Total Services:</span>
                    <span class="summary-value">${this.state.selectedServices.length}</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">Investment:</span>
                    <span class="summary-value">${finalDisplay}</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">Billing:</span>
                    <span class="summary-value">${quote.hasMonthly ? 'Monthly' : 'One-time'}</span>
                </div>
                ${this.state.appliedBundles.length > 0 ? `
                    <div class="summary-item">
                        <span class="summary-label">Bundle Savings:</span>
                        <span class="summary-value discount">$${this.calculator.formatNumber(quote.totalDiscount)}</span>
                    </div>
                ` : ''}
            </div>
        `;
    }

    // ==================== SUMMARY PANEL ====================
    renderSummary() {
        const container = this.elements.summaryContent;
        if (!container) return;

        const quote = this.calculator.calculateTotalQuote(this.state);
        const hasRecurring = this.state.hasMonthlyService;

        const servicesHtml = this.state.selectedServices.length === 0
            ? `<p class="empty-summary">No services selected</p>`
            : `
                <div class="services-list">
                    <div class="services-header">
                        <span>🧩</span>
                        <span>Services (${this.state.selectedServices.length})</span>
                    </div>
                    ${this.state.selectedServices.map(id => {
                        const s = this.config.SERVICES[id];
                        const baseDisplay = this.getServiceBaseDisplay(s);
                        return `
                            <div class="service-item">
                                <span class="service-name">
                                    <span>${s.icon}</span>
                                    <span>${s.name}</span>
                                </span>
                                <span class="service-price">${baseDisplay}${s.isMonthly ? '<span class="price-period">/mo</span>' : ''}</span>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;

        const scopeHtml = (this.state.commonConfig.industry || this.state.commonConfig.scale) ? `
            <div class="summary-details">
                ${this.state.commonConfig.industry ? `
                    <div class="detail-item">
                        <span class="detail-label">🏢 Industry</span>
                        <span class="detail-value">${this.config.INDUSTRIES.find(i => i.id === this.state.commonConfig.industry)?.name}</span>
                    </div>
                ` : ''}
                ${this.state.commonConfig.scale ? `
                    <div class="detail-item">
                        <span class="detail-label">📊 Scale</span>
                        <span class="detail-value">${this.config.BUSINESS_SCALES.find(s => s.id === this.state.commonConfig.scale)?.name}</span>
                    </div>
                ` : ''}
            </div>
        ` : '';

        const subtotalDisplay = quote.subtotalRange
            ? this.formatRangeOrNumber(quote.subtotalRange, quote.subtotal)
            : `$${this.calculator.formatNumber(quote.subtotal)}`;

        const finalDisplay = quote.finalTotalRange
            ? this.formatRangeOrNumber(quote.finalTotalRange, quote.finalTotal)
            : `$${this.calculator.formatNumber(quote.finalTotal)}`;

        container.innerHTML = `
            ${servicesHtml}
            ${scopeHtml}
            <div class="pricing-section">
                <div class="pricing-item">
                    <span class="pricing-label">${hasRecurring ? 'Starting Monthly' : 'Starting From'}</span>
                    <span class="pricing-value">${subtotalDisplay}</span>
                </div>
                ${quote.totalDiscount > 0 ? `
                    <div class="pricing-item discount">
                        <span class="pricing-label">Bundle Savings</span>
                        <span class="pricing-value">-$${this.calculator.formatNumber(quote.totalDiscount)}</span>
                    </div>
                ` : ''}
            </div>
            <div class="total-section">
                <div class="total-display">
                    <div class="total-left">
                        <div class="total-label">Estimate Range</div>
                        <div class="total-subtitle">Final pricing depends on scope</div>
                    </div>
                    <div class="total-right">
                        <div class="total-amount count-animation">${finalDisplay}</div>
                        ${hasRecurring ? `<div class="total-period">/month</div>` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    // ==================== BUNDLES DISPLAY ====================
    renderBundles() {
        const container = this.elements.bundlesContainer;
        if (!container) return;

        // Only show bundles container if there are applied bundles
        if (this.state.appliedBundles.length > 0) {
            container.style.display = 'block';

            container.innerHTML = `
                <div class="bundles-header">
                    <span>✨</span>
                    <span>Applied Growth Packages</span>
                </div>
                ${this.state.appliedBundles.map(bundle => `
                    <div class="bundle-card">
                        <div class="bundle-name">${bundle.name}</div>
                        <div class="bundle-pitch">${bundle.pitch}</div>
                        <div class="bundle-savings">
                            <span>You Saved:</span>
                            <span class="savings-amount">$${bundle.savings}</span>
                        </div>
                    </div>
                `).join('')}
            `;
        } else {
            container.style.display = 'none';
        }
    }

    // ==================== PREFERENCE HANDLERS ====================
    toggleVideoOption() {
        this.state.update({
            preferences: {
                ...this.state.preferences,
                wantsVideo: !this.state.preferences.wantsVideo
            }
        });
    }

    toggleAllAddons() {
        this.state.update({
            preferences: {
                ...this.state.preferences,
                showAllAddons: !this.state.preferences.showAllAddons
            }
        });
    }

    // ==================== NAVIGATION ====================
    updateNavigation() {
        // Update all navigation button states
        if (this.elements.servicesContinue) {
            this.elements.servicesContinue.disabled = this.state.selectedServices.length === 0;
        }

        if (this.elements.scopeContinue) {
            this.elements.scopeContinue.disabled =
                !this.state.commonConfig.industry || !this.state.commonConfig.scale;
        }

        if (this.elements.detailsContinue) {
            const allServicesConfigured = this.state.selectedServices.every(serviceId =>
                this.state.serviceConfigs[serviceId]?.serviceLevel
            );
            this.elements.detailsContinue.disabled = !allServicesConfigured;
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.uiHandler = new UIHandler();
});
