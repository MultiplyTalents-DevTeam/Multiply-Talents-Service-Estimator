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

        // Step transition state (for fade-out animations)
        this._isStepTransitioning = false;
        this._lastRenderedStep = null;

        // ==================== SEE MORE STATE (UI-ONLY) ====================
        // Best practice: keep expansion state inside UI (not business state) to avoid polluting quote payloads.
        this._seeMoreState = {};
        this._expandedIndustries = false;
        this._expandedAddonsByService = {};

        // Step banner microcopy rotation (3 messages per step)
        this.stepMicrocopy = {
            services: [
                `<strong>Tip:</strong> Start with the services that create the biggest impact first. You can always add more later.`,
                `<strong>Heads up:</strong> Bundling multiple services can unlock better overall value compared to picking them one by one.`,
                `<strong>Quick win:</strong> If you're unsure, pick what you need now and we’ll refine the scope during the discovery call.`
            ],
            scope: [
                `<strong>Pro tip:</strong> Your scope selections apply to all chosen services, so pick what matches your real workload.`,
                `<strong>Clarity check:</strong> If you expect frequent updates, choose the option that covers ongoing support.`,
                `<strong>Reminder:</strong> Bigger scope usually means longer delivery. Keep it lean if speed matters.`
            ],
            details: [
                `<strong>Almost there:</strong> Add only the details that affect effort. Extra nice-to-haves can be discussed later.`,
                `<strong>Best practice:</strong> If you don’t have assets yet, select the option that includes guidance or setup help.`,
                `<strong>Tip:</strong> Prioritize essentials. We’ll make sure the build is clean before adding complexity.`
            ],
            review: [
                `<strong>Review time:</strong> Double-check services and scope so the quote matches what you actually want delivered.`,
                `<strong>Note:</strong> Pricing reflects effort. If something feels off, we can adjust scope to fit your target.`,
                `<strong>FYI:</strong> Once you submit, we’ll use this as the baseline for discovery and proposal.`
            ],
            contact: [
                `<strong>Last step:</strong> Make sure your contact info is correct so we can send the proposal fast.`,
                `<strong>Tip:</strong> Add any deadlines or constraints in the notes. It helps us plan delivery accurately.`,
                `<strong>Optional:</strong> If you have examples you like, mention them. It speeds up alignment.`
            ]
        };

        this.stepMicrocopyCursor = Object.keys(this.stepMicrocopy).reduce((acc, key) => {
            acc[key] = 0;
            return acc;
        }, {});

        this.stepMicrocopyCurrent = {};

        this._microcopyIntervalMs = 6500;
        this._microcopyTimer = window.setInterval(() => {
            this.rotateStepMicrocopy(this.state.currentStep);
        }, this._microcopyIntervalMs);

        // Subscribe to state changes
        this.state.subscribe(() => this.updateUI());

        // Initialize UI
        this.bindEvents();
        this.updateUI();
    }

    // ==================== ICON HELPERS (FONT AWESOME) ====================
    // Best practice: accept config-provided FA classes (if you later store them in CONFIG),
    // but otherwise always use UI fallbacks (no emoji rendering).
    fa(iconClass, extraClass = '') {
        const cls = `${iconClass} ${extraClass}`.trim();
        return `<i class="${cls}" aria-hidden="true"></i>`;
    }

    // If config provides an SVG or FA class string, render it; otherwise fallback to our mapped FA icon
    renderIconFromConfigOrFallback(configIconValue, fallbackFaClass) {
        const raw = (typeof configIconValue === 'string') ? configIconValue.trim() : '';

        // Allow inline SVG markup if you ever switch to that style
        if (raw.startsWith('<svg') || raw.startsWith('<span') || raw.startsWith('<i')) return raw;

        // Allow FA classes if you decide to store them in CONFIG later
        if (raw.includes('fa-')) return this.fa(raw);

        // No emoji rendering: always fallback to FA
        return this.fa(fallbackFaClass);
    }

    getServiceIcon(serviceIdOrObj) {
        const id = typeof serviceIdOrObj === 'string' ? serviceIdOrObj : serviceIdOrObj?.id;

        const map = {
            new_ghl_setup: 'fa-solid fa-rocket',
            platform_migration: 'fa-solid fa-right-left',
            fix_optimize: 'fa-solid fa-screwdriver-wrench',
            monthly_management: 'fa-solid fa-calendar-check'
        };

        const fallback = map[id] || 'fa-solid fa-briefcase';
        const cfgIcon = (typeof serviceIdOrObj === 'object') ? serviceIdOrObj?.icon : (this.config.SERVICES?.[id]?.icon);
        return this.renderIconFromConfigOrFallback(cfgIcon, fallback);
    }

    getCapabilityIcon(capIdOrObj) {
        const id = typeof capIdOrObj === 'string' ? capIdOrObj : capIdOrObj?.id;

        const map = {
            funnels: 'fa-solid fa-layer-group',
            crm: 'fa-solid fa-users',
            workflow_automation: 'fa-solid fa-gears',

            data_migration: 'fa-solid fa-database',
            workflow_transfer: 'fa-solid fa-arrows-rotate',

            audit: 'fa-solid fa-magnifying-glass',
            optimization: 'fa-solid fa-chart-line',
            bug_fixes: 'fa-solid fa-bug',

            campaign_launches: 'fa-solid fa-rocket',
            tech_support: 'fa-solid fa-headset',
            reporting: 'fa-solid fa-chart-pie',

            reputation_management: 'fa-solid fa-star',
            social_media_planner: 'fa-solid fa-calendar-days',
            calendar: 'fa-solid fa-calendar-days'
        };

        const fallback = map[id] || 'fa-solid fa-circle-nodes';
        const cfgIcon = (typeof capIdOrObj === 'object') ? capIdOrObj?.icon : (this.config.CAPABILITIES?.[id]?.icon);
        return this.renderIconFromConfigOrFallback(cfgIcon, fallback);
    }

    getIndustryIcon(industryIdOrObj) {
        const id = typeof industryIdOrObj === 'string' ? industryIdOrObj : industryIdOrObj?.id;

        const map = {
            medical_aesthetics: 'fa-solid fa-spa',
            private_healthcare: 'fa-solid fa-stethoscope',
            home_services: 'fa-solid fa-toolbox',
            education_training: 'fa-solid fa-graduation-cap',
            real_estate: 'fa-solid fa-house',
            automotive_services: 'fa-solid fa-car-side',
            professional_services: 'fa-solid fa-briefcase',
            legal_firms: 'fa-solid fa-scale-balanced',
            fitness_training: 'fa-solid fa-dumbbell',
            food_catering: 'fa-solid fa-utensils',
            other: 'fa-solid fa-shapes'
        };

        const fallback = map[id] || 'fa-solid fa-building';
        const cfgIcon = (typeof industryIdOrObj === 'object') ? industryIdOrObj?.icon : (this.config.INDUSTRIES?.find(i => i.id === id)?.icon);
        return this.renderIconFromConfigOrFallback(cfgIcon, fallback);
    }

    getScaleIcon(scaleIdOrObj) {
        const id = typeof scaleIdOrObj === 'string' ? scaleIdOrObj : scaleIdOrObj?.id;

        const map = {
            solopreneur: 'fa-solid fa-user',
            growing: 'fa-solid fa-seedling',
            scale: 'fa-solid fa-chart-line',
            enterprise: 'fa-solid fa-building-columns'
        };

        const fallback = map[id] || 'fa-solid fa-chart-simple';
        const cfgIcon = (typeof scaleIdOrObj === 'object') ? scaleIdOrObj?.icon : (this.config.BUSINESS_SCALES?.find(s => s.id === id)?.icon);
        return this.renderIconFromConfigOrFallback(cfgIcon, fallback);
    }

    getAddonIcon(addonIdOrObj) {
        const id = typeof addonIdOrObj === 'string' ? addonIdOrObj : addonIdOrObj?.id;

        const map = {
            rush_delivery: 'fa-solid fa-bolt',
            snapshot_creation: 'fa-solid fa-box-archive',
            api_integration: 'fa-solid fa-code',
            zoom_handoff: 'fa-solid fa-video',
            hipaa: 'fa-solid fa-shield-halved',
            ab_testing: 'fa-solid fa-flask',
            custom_css: 'fa-solid fa-paintbrush',
            email_audit: 'fa-solid fa-envelope-open-text'
        };

        const fallback = map[id] || 'fa-solid fa-plus';
        const cfgIcon = (typeof addonIdOrObj === 'object') ? addonIdOrObj?.icon : (this.config.ADDONS?.find(a => a.id === id)?.icon);
        return this.renderIconFromConfigOrFallback(cfgIcon, fallback);
    }

    // ==================== SEE MORE HELPERS ====================
    // Best practice: UI-only expansion; stopPropagation so it doesn't toggle selection.
    shouldShowSeeMore(text, threshold = 120) {
        const t = (typeof text === 'string') ? text.trim() : '';
        return t.length > threshold;
    }

    truncateText(text, limit = 110) {
        const t = (typeof text === 'string') ? text.trim() : '';
        if (t.length <= limit) return t;
        return `${t.slice(0, Math.max(0, limit)).trim()}…`;
    }

    isMobileViewport() {
        return !!(window.matchMedia && window.matchMedia('(max-width: 768px)').matches);
    }

    getCollapsedCopyForViewport(text, mobileFallbackLimit = 96) {
        const t = (typeof text === 'string') ? text.trim() : '';
        if (!t) return '';
        if (!this.isMobileViewport()) return this.truncateText(t);

        const firstSentenceMatch = t.match(/^.*?[.!?](?=\s|$)/);
        if (firstSentenceMatch && firstSentenceMatch[0]) {
            const firstSentence = firstSentenceMatch[0].trim();
            if (firstSentence.length <= mobileFallbackLimit) return firstSentence;
            return this.truncateText(firstSentence, mobileFallbackLimit);
        }

        return this.truncateText(t, mobileFallbackLimit);
    }

    getSeeMoreKey(prefix, a, b) {
        // Stable key for this UI session (persists across re-renders)
        return `${prefix}:${String(a)}:${String(b)}`;
    }

    isSeeMoreExpanded(key) {
        return !!this._seeMoreState[key];
    }

    setSeeMoreExpanded(key, expanded) {
        this._seeMoreState[key] = !!expanded;
    }

    renderSeeMoreToggleHtml(key, expanded) {
        const label = expanded ? 'See less' : 'See more';
        const icon = expanded ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down';

        // Inline styles keep it consistent without requiring CSS changes right now.
        return `
            <div class="see-more-toggle"
                 data-see-more-key="${key}"
                 role="button"
                 tabindex="0"
                 aria-label="${label}"
                 style="
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    gap:6px;
                    margin-top:10px;
                    padding:6px 8px;
                    font-size:0.75rem;
                    color:var(--text-secondary);
                    cursor:pointer;
                    user-select:none;
                 ">
                <span>${label}</span>
                <span>${this.fa(icon)}</span>
            </div>
        `;
    }

    bindSeeMoreToggle(rootEl, key, getFullText, getTextEl, getCollapsedText) {
        if (!rootEl) return;
        const toggle = rootEl.querySelector(`[data-see-more-key="${key}"]`);
        if (!toggle) return;

        const activate = (e) => {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }

            const full = (typeof getFullText === 'function') ? (getFullText() || '') : '';
            const expanded = this.isSeeMoreExpanded(key);
            const nextExpanded = !expanded;

            this.setSeeMoreExpanded(key, nextExpanded);

            const textEl = (typeof getTextEl === 'function') ? getTextEl() : null;
            if (textEl) {
                const collapsed = (typeof getCollapsedText === 'function')
                    ? getCollapsedText(full)
                    : this.truncateText(full);
                textEl.textContent = nextExpanded ? full : collapsed;
            }

            // Update toggle label + icon
            toggle.setAttribute('aria-label', nextExpanded ? 'See less' : 'See more');
            toggle.innerHTML = `
                <span>${nextExpanded ? 'See less' : 'See more'}</span>
                <span>${this.fa(nextExpanded ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down')}</span>
            `;
        };

        toggle.onclick = activate;
        toggle.addEventListener('keydown', (e) => {
            const k = e.key;
            if (k === 'Enter' || k === ' ') activate(e);
        });
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

    // ==================== STEP MICROCOPY ====================

    getStepMicrocopy(stepId) {
        return this.stepMicrocopy && this.stepMicrocopy[stepId] ? this.stepMicrocopy[stepId] : null;
    }

    getStepBannerMessageEl(stepId) {
        // Prefer the banner inside the step container (avoids clobbering banners on other steps)
        const stepContainer = document.getElementById(`step-${stepId}`);
        const scoped = stepContainer ? stepContainer.querySelector('.help-banner .help-banner-content p') : null;
        if (scoped) return scoped;

        // Fallback: any help-banner on the page (useful if your HTML is structured differently)
        return document.querySelector('.help-banner .help-banner-content p');
    }

    applyStepMicrocopyHtml(stepId, html) {
        const p = this.getStepBannerMessageEl(stepId);
        if (!p) return;

        const prefersReduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

        // No animation requested/available
        if (prefersReduced) {
            p.innerHTML = html;
            return;
        }

        // Ensure base class is present for transitions
        p.classList.add('microcopy-fade');

        // Fade out, swap, then fade back in
        p.classList.add('microcopy-hidden');

        window.setTimeout(() => {
            p.innerHTML = html;

            // Next frame so the browser registers the content swap before fading in
            requestAnimationFrame(() => {
                p.classList.remove('microcopy-hidden');
            });
        }, 160);
    }

    rotateStepMicrocopy(stepId) {
        const messages = this.getStepMicrocopy(stepId);
        if (!messages || messages.length === 0) return;

        const cursor = this.stepMicrocopyCursor[stepId] || 0;
        const messageHtml = messages[cursor];

        this.stepMicrocopyCurrent[stepId] = messageHtml;
        this.applyStepMicrocopyHtml(stepId, messageHtml);

        this.stepMicrocopyCursor[stepId] = (cursor + 1) % messages.length;
    }

    restoreStepMicrocopy(stepId) {
        const current = this.stepMicrocopyCurrent[stepId];
        if (!current) {
            // First-time render for this step
            this.rotateStepMicrocopy(stepId);
            return;
        }

        // If the banner got re-rendered by other UI updates, put the current text back
        this.applyStepMicrocopyHtml(stepId, current);
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

    getIndustryDisplayName(industryId) {
        const industry = this.config.INDUSTRIES.find(i => i.id === industryId);
        if (!industry) return '';
        return industry.summaryName || industry.name || '';
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
        const currentStep = this.state.currentStep;

        // If already on the step, just ensure visibility + scroll
        if (currentStep === stepId) {
            this.showCurrentStep(true);
            this.scrollToTop();
            return;
        }

        const prefersReduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

        // Reduced motion: switch instantly
        if (prefersReduced) {
            this.state.update({ currentStep: stepId });
            this.scrollToTop();
            return;
        }

        // Prevent double transitions (rapid clicking)
        if (this._isStepTransitioning) return;
        this._isStepTransitioning = true;

        const currentEl = document.getElementById(`step-${currentStep}`);
        const exitDurationMs = 260;

        const switchStep = () => {
            // Clear any exiting state before switching
            if (currentEl) currentEl.classList.remove('exiting');

            this.state.update({ currentStep: stepId });

            // Scroll after step becomes active
            this.scrollToTop();

            this._isStepTransitioning = false;
        };

        // If we can't find the current container, just switch
        if (!currentEl) {
            switchStep();
            return;
        }

        // Trigger exit animation on the current step
        currentEl.classList.add('active');   // ensure it's visible
        currentEl.classList.add('exiting');

        let done = false;
        const onExitDone = (e) => {
            // Ignore bubbled animationend from children
            if (e && e.target !== currentEl) return;
            if (done) return;
            done = true;

            currentEl.removeEventListener('animationend', onExitDone);
            switchStep();
        };

        currentEl.addEventListener('animationend', onExitDone);

        // Fallback in case animationend doesn't fire (edge cases / browser quirks)
        setTimeout(() => onExitDone(), exitDurationMs + 80);
    }

    scrollToTop() {
        const prefersReduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
        const behavior = prefersReduced ? 'auto' : 'smooth';
        const duration = prefersReduced ? 0 : 550;
        const delay = prefersReduced ? 0 : 120;

        const doLocalScroll = () => {
            // 1) Scroll the window (works for normal page + some embeds)
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
        };

        const notifyParentToScroll = () => {
            // When embedded in GHL (iframe), the *parent page* is the scroll container.
            if (window.parent && window.parent !== window) {
                try {
                    window.parent.postMessage({
                        type: 'MT_ESTIMATOR_SCROLL_TOP',
                        behavior,
                        duration
                    }, '*');
                } catch (e) {
                    // ignore
                }
            }
        };

        // Tiny delay makes the transition feel less like a jump-cut
        requestAnimationFrame(() => {
            setTimeout(() => {
                doLocalScroll();
                notifyParentToScroll();
            }, delay);
        });
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

    showCurrentStep(force = false) {
        // Avoid re-triggering enter animations on every state update
        if (!force && this._lastRenderedStep === this.state.currentStep) return;
        this._lastRenderedStep = this.state.currentStep;

        // Hide all steps first
        document.querySelectorAll('.step-content').forEach(el => {
            el.classList.remove('active');
            el.classList.remove('exiting');
        });

        // Show current step
        const currentStepEl = document.getElementById(`step-${this.state.currentStep}`);
        if (currentStepEl) {
            currentStepEl.classList.add('active');
            this.restoreStepMicrocopy(this.state.currentStep);
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
                    ${index < currentStepIndex ? this.fa('fa-solid fa-check') : step.number}
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
            const serviceIcon = this.getServiceIcon(service);

            // See more logic (service description)
            const fullDesc = service.description || '';
            const needsSeeMore = this.shouldShowSeeMore(fullDesc);
            const seeKey = this.getSeeMoreKey('service', service.id, 'desc');
            const expanded = this.isSeeMoreExpanded(seeKey);
            const collapsedDesc = this.getCollapsedCopyForViewport(fullDesc, 92);
            const descDisplay = needsSeeMore ? (expanded ? fullDesc : collapsedDesc) : fullDesc;

            serviceCard.innerHTML = `
                <div class="service-icon">${serviceIcon}</div>
                <div class="service-content">
                    ${hasRecommendedBadge ? '<div class="recommended-badge"><i class="fa-solid fa-fire" aria-hidden="true"></i> Most Popular</div>' : ''}
                    <h3>${service.name}</h3>
                    <p class="service-description">${descDisplay}</p>
                    <div class="service-range-hint" style="display:none;">${baseRangeText}${service.isMonthly ? '<span class="price-period">/month</span>' : ''}</div>
                    ${needsSeeMore ? this.renderSeeMoreToggleHtml(seeKey, expanded) : ''}
                </div>
                <div class="selection-indicator">
                    <div class="selection-dot"></div>
                </div>
            `;

            container.appendChild(serviceCard);

            // Bind see more toggle without toggling service selection
            if (needsSeeMore) {
                this.bindSeeMoreToggle(
                    serviceCard,
                    seeKey,
                    () => fullDesc,
                    () => serviceCard.querySelector('.service-description'),
                    () => this.getCollapsedCopyForViewport(fullDesc, 92)
                );
            }
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
                <span class="help-banner-icon">${this.fa('fa-solid fa-circle-info')}</span>
                <div class="help-banner-content">
                    <p>These settings apply to <strong>all selected services</strong> and help us tailor the setup to your needs.</p>
                </div>
            </div>

            <div class="tab-section">
                <h3>${this.fa('fa-solid fa-building')} What industry are you in?</h3>
                <p>This helps us customize templates and workflows for your business</p>
                <div class="config-grid three-col" id="industry-grid"></div>
                <div class="list-expand-control" id="industry-view-more"></div>
            </div>

            <div class="tab-section">
                <h3>${this.fa('fa-solid fa-chart-line')} What's your business scale?</h3>
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
        const viewMoreContainer = document.getElementById('industry-view-more');
        if (!container) return;

        container.innerHTML = '';
        if (viewMoreContainer) viewMoreContainer.innerHTML = '';

        const visibleCount = 6;
        const industriesToShow = this._expandedIndustries
            ? this.config.INDUSTRIES
            : this.config.INDUSTRIES.slice(0, visibleCount);

        industriesToShow.forEach(industry => {
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

            const industryIcon = this.getIndustryIcon(industry);

            option.innerHTML = `
                <span class="option-icon">${industryIcon}</span>
                <div class="option-title">${industry.name}</div>
                ${industry.subtitle ? `<div class="option-subtitle">${industry.subtitle}</div>` : ''}
            `;

            container.appendChild(option);
        });

        if (!viewMoreContainer || this.config.INDUSTRIES.length <= visibleCount) return;

        const hiddenCount = Math.max(0, this.config.INDUSTRIES.length - visibleCount);
        const toggleBtn = document.createElement('button');
        toggleBtn.type = 'button';
        toggleBtn.className = 'list-expand-btn';
        toggleBtn.innerHTML = this._expandedIndustries
            ? `<span>Show Less Industries</span><span>${this.fa('fa-solid fa-chevron-up')}</span>`
            : `<span>View More Industries (${hiddenCount})</span><span>${this.fa('fa-solid fa-chevron-down')}</span>`;
        toggleBtn.onclick = () => {
            this._expandedIndustries = !this._expandedIndustries;
            this.renderIndustryGrid();
        };
        viewMoreContainer.appendChild(toggleBtn);
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

            const scaleIcon = this.getScaleIcon(scale);

            option.innerHTML = `
                <span class="option-icon">${scaleIcon}</span>
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
                <span class="help-banner-icon">${this.fa('fa-solid fa-bullseye')}</span>
                <div class="help-banner-content">
                    <p>Click each service button below to configure it. Complete all selected services before continuing.</p>
                </div>
            </div>

            <div class="details-tabs-hint">
                <span>${this.fa('fa-solid fa-hand-pointer')}</span>
                <span>Configure each selected service (required)</span>
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

        container.classList.toggle('two-col-layout', this.state.selectedServices.length >= 4);
        container.innerHTML = '';

        this.state.selectedServices.forEach(serviceId => {
            const service = this.config.SERVICES[serviceId];
            const completionCount = this.getServiceCompletionCount(serviceId);
            const totalSteps = 3;

            const tab = document.createElement('button');
            tab.className = 'service-tab';
            tab.dataset.serviceId = serviceId;
            tab.onclick = () => this.activateTab(serviceId);

            const serviceIcon = this.getServiceIcon(service);

            tab.innerHTML = `
                <span class="tab-icon">${serviceIcon}</span>
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
                    <h3>${this.fa('fa-solid fa-bullseye')} Select Capabilities</h3>
                    <p>Choose what you need for ${service.name}</p>
                    <div class="config-grid" id="capabilities-${serviceId}"></div>
                </div>

                <div class="tab-section">
                    <h3>${this.fa('fa-solid fa-star')} Choose Service Level</h3>
                    <p>Select your preferred level of support</p>
                    <div class="config-grid three-col" id="levels-${serviceId}"></div>
                </div>

                <div class="tab-section">
                    <h3>${this.fa('fa-solid fa-plus')} Add-ons (Optional)</h3>
                    <p>Enhance your service with optional add-ons</p>
                    <div class="config-grid" id="addons-${serviceId}"></div>
                    <div class="list-expand-control" id="addons-view-more-${serviceId}"></div>
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

            const capIcon = this.getCapabilityIcon(capability);

            // See more logic (capability pitch)
            const fullPitch = capability.pitch || '';
            const needsSeeMore = this.shouldShowSeeMore(fullPitch);
            const seeKey = this.getSeeMoreKey('cap', serviceId, capId);
            const expanded = this.isSeeMoreExpanded(seeKey);
            const collapsedPitch = this.getCollapsedCopyForViewport(fullPitch, 92);
            const pitchDisplay = needsSeeMore ? (expanded ? fullPitch : collapsedPitch) : fullPitch;

            option.innerHTML = `
                <span class="option-icon">${capIcon}</span>
                <div class="option-title">
                    ${capability.name}
                    ${isIncluded ? '<span class="included-badge">Included</span>' : ''}
                </div>
                <div class="option-description">${pitchDisplay}</div>
                ${
                    isIncluded
                        ? `<div class="option-price included-price">Included</div>`
                        : (capability.price > 0 ? `<div class="option-price">+$${capability.price}</div>` : '')
                }
                ${capability.isPopularBundlePart ? `<div class="bundle-indicator">Popular Bundle Item</div>` : ''}
                ${needsSeeMore ? this.renderSeeMoreToggleHtml(seeKey, expanded) : ''}
            `;

            container.appendChild(option);

            if (needsSeeMore) {
                this.bindSeeMoreToggle(
                    option,
                    seeKey,
                    () => fullPitch,
                    () => option.querySelector('.option-description'),
                    () => this.getCollapsedCopyForViewport(fullPitch, 92)
                );
            }
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
                ${level.popular ? '<div class="popular-badge"><i class="fa-solid fa-fire" aria-hidden="true"></i> Most Popular</div>' : ''}
                <div class="option-title">${level.name}</div>
                <div class="option-description">${level.description}</div>
                <div style="margin-top: 0.75rem;">
                    ${level.features.slice(0, 3).map(feature => `
                        <div style="display: flex; align-items: center; gap: 0.375rem; font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 0.25rem;">
                            <span style="color: var(--accent-gold);"><i class="fa-solid fa-check" aria-hidden="true"></i></span>
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
        const viewMoreContainer = document.getElementById(`addons-view-more-${serviceId}`);
        if (!container) return;

        const config = this.state.serviceConfigs[serviceId] || {};

        // UI-only expansion state per selected service tab
        const visibleCount = 4;
        const showAll = !!this._expandedAddonsByService[serviceId];
        const addonsToShow = showAll ? this.config.ADDONS : this.config.ADDONS.slice(0, visibleCount);

        container.innerHTML = '';
        if (viewMoreContainer) viewMoreContainer.innerHTML = '';

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

            const addonIcon = this.getAddonIcon(addon);

            // See more logic (addon description)
            const fullDesc = addon.description || '';
            const needsSeeMore = this.shouldShowSeeMore(fullDesc);
            const seeKey = this.getSeeMoreKey('addon', serviceId, addon.id);
            const expanded = this.isSeeMoreExpanded(seeKey);
            const collapsedDesc = this.getCollapsedCopyForViewport(fullDesc, 92);
            const descDisplay = needsSeeMore ? (expanded ? fullDesc : collapsedDesc) : fullDesc;

            option.innerHTML = `
                <span class="option-icon">${addonIcon}</span>
                <div class="option-title">${addon.name}</div>
                <div class="option-description">${descDisplay}</div>
                <div class="option-price">${addonDisplay}</div>
                ${needsSeeMore ? this.renderSeeMoreToggleHtml(seeKey, expanded) : ''}
            `;

            container.appendChild(option);

            if (needsSeeMore) {
                this.bindSeeMoreToggle(
                    option,
                    seeKey,
                    () => fullDesc,
                    () => option.querySelector('.option-description'),
                    () => this.getCollapsedCopyForViewport(fullDesc, 92)
                );
            }
        });

        if (!viewMoreContainer || this.config.ADDONS.length <= visibleCount) return;

        const hiddenCount = Math.max(0, this.config.ADDONS.length - visibleCount);
        const toggleBtn = document.createElement('button');
        toggleBtn.type = 'button';
        toggleBtn.className = 'list-expand-btn';
        toggleBtn.innerHTML = showAll
            ? `<span>Show Less Add-ons</span><span>${this.fa('fa-solid fa-chevron-up')}</span>`
            : `<span>View More Add-ons (${hiddenCount})</span><span>${this.fa('fa-solid fa-chevron-down')}</span>`;
        toggleBtn.onclick = () => {
            this._expandedAddonsByService[serviceId] = !showAll;
            this.renderAddons(serviceId);
        };
        viewMoreContainer.appendChild(toggleBtn);
        if (!showAll && this.config.ADDONS.length > visibleCount) {
            const note = document.createElement('p');
            note.className = 'list-expand-note';
            note.textContent = `See ${hiddenCount} more technical enhancements`;
            viewMoreContainer.appendChild(note);
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
                <span class="help-banner-icon">${this.fa('fa-solid fa-circle-check')}</span>
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
                            <div class="scope-label">${this.fa('fa-solid fa-building')} Industry</div>
                            <div class="scope-value">${this.getIndustryDisplayName(industry.id)}</div>
                            ${industry.multiplier > 1 ? `<div class="scope-note">${Math.round((industry.multiplier - 1) * 100)}% complexity adjustment</div>` : ''}
                        </div>
                    ` : ''}
                    ${scale ? `
                        <div class="scope-item">
                            <div class="scope-label">${this.fa('fa-solid fa-chart-line')} Business Scale</div>
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

        const serviceIcon = this.getServiceIcon(serviceConfig);

        return `
            <div class="invoice-service">
                <div class="service-header">
                    <div class="service-title">
                        <span class="service-icon">${serviceIcon}</span>
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
                            <div class="bundle-savings-title"><i class="fa-solid fa-boxes-stacked" aria-hidden="true"></i> Applied Growth Packages:</div>
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
                    <div class="anchor-label"><i class="fa-solid fa-gem" aria-hidden="true"></i> On Shore Agency Value</div>
                    <div class="anchor-value">${westernDisplay}</div>
                    <div class="anchor-note">Estimated range from a typical US-based agency in your country</div>
                </div>
            </div>
        `;
    }

    renderTimelineInfo(timeline, deliveryDate) {
        return `
            <div class="timeline-section">
                <h3><i class="fa-solid fa-calendar-days" aria-hidden="true"></i> Estimated Timeline</h3>
                <div class="timeline-content">
                    <div class="timeline-item">
                        <div class="timeline-icon"><i class="fa-solid fa-clock" aria-hidden="true"></i></div>
                        <div>
                            <div class="timeline-label">Project Duration</div>
                            <div class="timeline-value">${timeline} business days</div>
                        </div>
                    </div>
                    <div class="timeline-item">
                        <div class="timeline-icon"><i class="fa-solid fa-calendar-days" aria-hidden="true"></i></div>
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
                        <span><i class="fa-solid fa-puzzle-piece" aria-hidden="true"></i></span>
                        <span>Services (${this.state.selectedServices.length})</span>
                    </div>
                    ${this.state.selectedServices.map(id => {
                        const s = this.config.SERVICES[id];
                        const baseDisplay = this.getServiceBaseDisplay(s);
                        const serviceIcon = this.getServiceIcon(s);
                        return `
                            <div class="service-item">
                                <span class="service-name">
                                    <span>${serviceIcon}</span>
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
                        <span class="detail-label"><i class="fa-solid fa-building" aria-hidden="true"></i> Industry</span>
                        <span class="detail-value">${this.getIndustryDisplayName(this.state.commonConfig.industry)}</span>
                    </div>
                ` : ''}
                ${this.state.commonConfig.scale ? `
                    <div class="detail-item">
                        <span class="detail-label"><i class="fa-solid fa-chart-line" aria-hidden="true"></i> Scale</span>
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
                    <span><i class="fa-solid fa-boxes-stacked" aria-hidden="true"></i></span>
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

