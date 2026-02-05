/**
 * UI HANDLERS MODULE - FIXED VERSION
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
    }

    // ==================== ELEMENT CACHING ====================
    cacheElements() {
        this.elements = {
            app: document.getElementById('estimator-app'),
            progressLineActive: document.getElementById('progress-line-active'),
            progressSteps: document.getElementById('progress-steps'),
            servicesGrid: document.getElementById('services-grid'),
            summaryContent: document.getElementById('summary-content'),
            
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
            videoCheckbox: document.getElementById('video-checkbox')
        };
    }

    // ==================== MASTER UPDATE FUNCTION ====================
    updateUI() {
        // Update progress steps
        this.renderProgressSteps();
        
        // Update step-specific content
        switch(this.state.currentStep) {
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
    }

    // ==================== PROGRESS STEPS ====================
    renderProgressSteps() {
        const container = this.elements.progressSteps;
        const progressLine = document.getElementById('progress-line-active');
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
            const serviceCard = document.createElement('div');
            serviceCard.className = `service-card ${isSelected ? 'selected' : ''}`;
            serviceCard.onclick = () => this.state.toggleService(service.id);

            serviceCard.innerHTML = `
                <div class="service-icon">${service.icon}</div>
                <div class="service-content">
                    <h3>${service.name}</h3>
                    <p>${service.description}</p>
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
            const config = this.state.serviceConfigs[serviceId] || {};
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
            const config = this.state.serviceConfigs[serviceId] || {};
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
        
        serviceCapabilities.forEach(capId => {
            const capability = this.config.CAPABILITIES[capId];
            if (!capability) return;
            
            const isSelected = (config.capabilities || []).includes(capId);
            const option = document.createElement('div');
            option.className = `config-option ${isSelected ? 'selected' : ''}`;
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
                <div class="option-title">${capability.name}</div>
                <div class="option-description">${capability.description || ''}</div>
                ${capability.price > 0 ? `<div class="option-price">+$${capability.price}</div>` : ''}
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
                ${level.popular ? '<div class="popular-badge">Popular</div>' : ''}
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
            `;

            container.appendChild(option);
        });
    }

    renderAddons(serviceId) {
        const container = document.getElementById(`addons-${serviceId}`);
        if (!container) return;
        
        const config = this.state.serviceConfigs[serviceId] || {};
        
        this.config.ADDONS.forEach(addon => {
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

            option.innerHTML = `
                <span class="option-icon">${addon.icon}</span>
                <div class="option-title">${addon.name}</div>
                <div class="option-description">${addon.description}</div>
                <div class="option-price">+$${addon.price}</div>
            `;

            container.appendChild(option);
        });
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
        const invoiceNumber = this.calculator.generateInvoiceNumber();
        
        body.innerHTML = `
            <div class="help-banner">
                <span class="help-banner-icon">✨</span>
                <div class="help-banner-content">
                    <p><strong>Almost there!</strong> Review your selections below. You can go back to make changes anytime.</p>
                </div>
            </div>
            <div id="review-content"></div>
        `;
        
        this.renderInvoice(quote, invoiceNumber);
    }

    renderInvoice(quote, invoiceNumber) {
        const container = document.getElementById('review-content');
        if (!container) return;
        
        const hasMonthly = quote.services.some(s => s.isMonthly);
        const hasDiscount = quote.services.length > 1;
        const discountAmount = quote.discount;
        const finalTotal = quote.total;
        
        container.innerHTML = `
            <div class="invoice-card">
                <div class="invoice-header">
                    <div class="invoice-brand">
                        <h1>MultiplyTalents</h1>
                        <p>Professional Service Estimate</p>
                    </div>
                    <div class="invoice-number">
                        <h2>Estimate #</h2>
                        <p>${invoiceNumber}</p>
                    </div>
                </div>

                <div class="invoice-section">
                    <h3>Project Scope</h3>
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-bottom: 1.5rem;">
                        <div style="padding: 1rem; background: var(--bg-secondary); border-radius: var(--radius-md);">
                            <div style="font-size: 0.8125rem; color: var(--text-muted); margin-bottom: 0.25rem;">Industry</div>
                            <div style="font-weight: 600; color: var(--text-primary);">
                                ${this.config.INDUSTRIES.find(i => i.id === this.state.commonConfig.industry)?.name || 'Not selected'}
                            </div>
                        </div>
                        <div style="padding: 1rem; background: var(--bg-secondary); border-radius: var(--radius-md);">
                            <div style="font-size: 0.8125rem; color: var(--text-muted); margin-bottom: 0.25rem;">Business Scale</div>
                            <div style="font-weight: 600; color: var(--text-primary);">
                                ${this.config.BUSINESS_SCALES.find(s => s.id === this.state.commonConfig.scale)?.name || 'Not selected'}
                            </div>
                        </div>
                    </div>
                </div>

                <div class="invoice-section">
                    <h3>Selected Services</h3>
                    ${quote.services.map(s => `
                        <div class="invoice-line-item">
                            <div class="line-item-details">
                                <h4>${s.serviceName}</h4>
                                <p>${this.config.SERVICES[s.serviceId].description}</p>
                                ${s.breakdown && s.breakdown.length ? `
                                    <div class="invoice-breakdown">
                                        ${s.breakdown.map(item => `
                                            <div class="breakdown-item">
                                                <span>• ${item.name}</span>
                                                <span>$${item.amount.toLocaleString()}</span>
                                            </div>
                                        `).join('')}
                                    </div>
                                ` : ''}
                            </div>
                            <div class="line-item-price">
                                $${s.subtotal.toLocaleString()}${s.isMonthly ? '<span style="font-size:0.75rem; font-weight:500; color:var(--text-muted);">/mo</span>' : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>

                <div class="invoice-totals">
                    <div class="total-row">
                        <span class="total-label">Subtotal</span>
                        <span class="total-value">$${quote.subtotal.toLocaleString()}</span>
                    </div>
                    ${hasDiscount ? `
                        <div class="total-row">
                            <span class="total-label" style="color: var(--accent-success);">Bundle Discount (5%)</span>
                            <span class="total-value" style="color: var(--accent-success);">-$${discountAmount.toLocaleString()}</span>
                        </div>
                    ` : ''}
                    <div class="total-row">
                        <div>
                            <div class="total-label grand">Estimated Total</div>
                            <div style="font-size:.8125rem; color:var(--text-muted); margin-top:.25rem;">${hasMonthly ? 'Monthly investment' : 'One-time investment'}</div>
                        </div>
                        <div style="text-align:right;">
                            <div class="total-value grand count-animation">$${finalTotal.toLocaleString()}</div>
                            ${hasMonthly ? `<div style="font-size:.875rem; color:var(--text-muted);">/month</div>` : ''}
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
    }

    // ==================== SUMMARY PANEL ====================
    renderSummary() {
        const container = this.elements.summaryContent;
        if (!container) return;
        
        const quote = this.calculator.calculateTotalQuote(this.state);
        const hasRecurring = this.state.hasMonthlyService;
        const hasDiscount = this.state.hasMultipleServices;
        const discountAmount = hasDiscount ? Math.round(quote.subtotal * this.config.PRICING_RULES.bundleDiscount) : 0;
        const finalTotal = quote.total;

        const servicesHtml = this.state.selectedServices.length === 0
            ? `<p style="font-size:0.9375rem; font-style:italic; color: var(--text-muted);">No services selected</p>`
            : `
                <div class="services-list">
                    <div style="display:flex; align-items:center; gap:.75rem; font-size:.875rem; margin-bottom:1rem; color: var(--text-secondary);">
                        <span>🧩</span>
                        <span>Services (${this.state.selectedServices.length})</span>
                    </div>
                    ${this.state.selectedServices.map(id => {
                        const s = this.config.SERVICES[id];
                        return `
                            <div class="service-item">
                                <span class="service-name">
                                    <span>${s.icon}</span>
                                    <span>${s.name}</span>
                                </span>
                                <span style="font-weight:700;">$${(s.basePrice || 0).toLocaleString()}${s.isMonthly ? '<span style="font-size:0.75rem;font-weight:400;color:var(--text-muted);">/mo</span>' : ''}</span>
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
                        <span style="color: var(--text-primary);">${this.config.INDUSTRIES.find(i => i.id === this.state.commonConfig.industry)?.name}</span>
                    </div>
                ` : ''}
                ${this.state.commonConfig.scale ? `
                    <div class="detail-item">
                        <span class="detail-label">📊 Scale</span>
                        <span style="color: var(--text-primary);">${this.config.BUSINESS_SCALES.find(s => s.id === this.state.commonConfig.scale)?.name}</span>
                    </div>
                ` : ''}
            </div>
        ` : '';

        container.innerHTML = `
            ${servicesHtml}
            ${scopeHtml}
            <div class="pricing-section">
                <div class="detail-item" style="margin-bottom:0.75rem;">
                    <span style="color: var(--text-secondary);">${hasRecurring ? 'Starting Monthly Rate' : 'Starting From'}</span>
                    <span style="color: var(--text-primary); font-weight: 600;">$${quote.subtotal.toLocaleString()}</span>
                </div>
                ${hasDiscount ? `
                    <div class="detail-item" style="color: var(--accent-success); margin-bottom:0.75rem;">
                        <span>Bundle Discount (5%)</span>
                        <span style="font-weight: 600;">-$${discountAmount.toLocaleString()}</span>
                    </div>
                ` : ''}
            </div>
            <div class="total-section">
                <div class="total-display">
                    <div>
                        <div style="font-weight:700; color: var(--text-primary);">Base Estimate</div>
                        <div style="font-size:.8125rem; color: var(--text-muted); margin-top:.25rem;">Configure for final pricing</div>
                    </div>
                    <div style="text-align:right;">
                        <div class="total-amount count-animation">$${finalTotal.toLocaleString()}</div>
                        ${hasRecurring ? `<div class="total-period">/month</div>` : ``}
                    </div>
                </div>
            </div>
        `;
    }

    // ==================== NAVIGATION ====================
    updateNavigation() {
        // Update all navigation button states
        if (this.elements.scopeContinue) {
            this.elements.scopeContinue.disabled = 
                !this.state.commonConfig.industry || !this.state.commonConfig.scale;
        }
    }

    showStep(stepId) {
        // Hide all steps
        document.querySelectorAll('.step-content').forEach(el => {
            el.classList.remove('active');
        });
        
        // Show requested step
        const stepElement = document.getElementById(`step-${stepId}`);
        if (stepElement) {
            stepElement.classList.add('active');
        }
    }
}

// Create singleton instance
window.uiHandler = new UIHandler();