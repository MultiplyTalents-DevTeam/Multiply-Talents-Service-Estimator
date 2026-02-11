/**
 * MATH ENGINE MODULE
 * Pure calculation functions - no DOM, no side effects
 * All functions are deterministic and testable
 */

class Calculator {
    constructor() {
        this.config = CONFIG;
    }

    // ==================== RANGE HELPERS ====================
    _toRange(value, fallback = 0) {
        const n = typeof value === 'number' && isFinite(value) ? value : fallback;
        return { min: n, max: n };
    }

    _normalizeRange(rangeOrNumber, fallback = 0) {
        if (typeof rangeOrNumber === 'number' && isFinite(rangeOrNumber)) {
            return { min: rangeOrNumber, max: rangeOrNumber };
        }
        if (rangeOrNumber && typeof rangeOrNumber === 'object') {
            const min = typeof rangeOrNumber.min === 'number' && isFinite(rangeOrNumber.min) ? rangeOrNumber.min : fallback;
            const max = typeof rangeOrNumber.max === 'number' && isFinite(rangeOrNumber.max) ? rangeOrNumber.max : min;
            return { min, max };
        }
        return { min: fallback, max: fallback };
    }

    _addRange(a, b) {
        return { min: a.min + b.min, max: a.max + b.max };
    }

    _subRange(a, b) {
        return { min: a.min - b.max, max: a.max - b.min };
    }

    _clampRangeNonNegative(r) {
        return { min: Math.max(0, r.min), max: Math.max(0, r.max) };
    }

    _roundRange(r) {
        return { min: Math.round(r.min), max: Math.round(r.max) };
    }

    _pickLegacyNumberFromRange(r, mode = 'max') {
        // Keep legacy code stable: use MAX by default so totals are never under-reported.
        if (!r) return 0;
        return mode === 'min' ? Math.round(r.min) : Math.round(r.max);
    }

    _formatRange(range) {
        if (!range) return '$0';
        const min = Math.round(range.min);
        const max = Math.round(range.max);
        if (min === max) return `$${this.formatNumber(min)}`;
        return `$${this.formatNumber(min)} – $${this.formatNumber(max)}`;
    }

    _isCapabilityIncluded(serviceId, capId) {
        const map = this.config.PRICING_RULES?.includedCapabilitiesByService || {};
        const included = map[serviceId] || [];
        return included.includes(capId);
    }

    // ==================== CORE CALCULATIONS ====================
    calculateServiceQuote(serviceId, serviceConfig, commonConfig) {
        const service = this.config.SERVICES[serviceId];
        if (!service) return { subtotal: 0, breakdown: [] };

        // Legacy subtotal (number) for backward compatibility
        let subtotal = service.basePrice;

        // NEW: range subtotal for estimator pricing
        let subtotalRange = this._normalizeRange(service.basePriceRange, service.basePrice || 0);

        const breakdown = [];

        // Add capabilities
        (serviceConfig.capabilities || []).forEach(capId => {
            const capability = this.config.CAPABILITIES[capId];
            if (!capability) return;

            // NEW: Included capability logic (e.g., New GHL Setup includes funnels/crm/workflow)
            const isIncluded = this._isCapabilityIncluded(serviceId, capId);

            if (isIncluded) {
                breakdown.push({
                    type: 'capability',
                    id: capId,
                    name: capability.name,
                    amount: 0,
                    included: true
                });
                return;
            }

            // Normal capability pricing
            if (capability?.price > 0) {
                subtotal += capability.price;

                const capRange = this._normalizeRange(capability.priceRange, capability.price);
                subtotalRange = this._addRange(subtotalRange, capRange);

                breakdown.push({
                    type: 'capability',
                    id: capId,
                    name: capability.name,
                    amount: capability.price
                });
            }
        });

        // Apply industry multiplier (applies to subtotal AND range)
        if (commonConfig.industry) {
            const industry = this.config.INDUSTRIES.find(i => i.id === commonConfig.industry);
            if (industry?.multiplier > 1) {
                const increase = Math.round(subtotal * (industry.multiplier - 1));
                subtotal += increase;

                const incMin = Math.round(subtotalRange.min * (industry.multiplier - 1));
                const incMax = Math.round(subtotalRange.max * (industry.multiplier - 1));
                subtotalRange = this._addRange(subtotalRange, { min: incMin, max: incMax });

                breakdown.push({
                    type: 'industry',
                    id: industry.id,
                    name: `${industry.name} Industry`,
                    amount: increase
                });
            }
        }

        // Apply scale adder (fixed adder applies to subtotal AND range)
        if (commonConfig.scale) {
            const scale = this.config.BUSINESS_SCALES.find(s => s.id === commonConfig.scale);
            if (scale && scale.adder > 0) {
                subtotal += scale.adder;
                subtotalRange = this._addRange(subtotalRange, this._toRange(scale.adder, 0));

                breakdown.push({
                    type: 'scale_adder',
                    id: scale.id,
                    name: `${scale.name} Adjustment`,
                    amount: scale.adder
                });
            }
        }

        // Apply service level adder (fixed adder applies to subtotal AND range)
        if (serviceConfig.serviceLevel) {
            const level = this.config.SERVICE_LEVELS.find(l => l.id === serviceConfig.serviceLevel);
            if (level && level.adder > 0) {
                subtotal += level.adder;
                subtotalRange = this._addRange(subtotalRange, this._toRange(level.adder, 0));

                breakdown.push({
                    type: 'service_level',
                    id: level.id,
                    name: `${level.name} Level`,
                    amount: level.adder
                });
            }
        }

        // Add technical addons (applies to subtotal AND range)
        (serviceConfig.addons || []).forEach(addonId => {
            const addon = this.config.ADDONS.find(a => a.id === addonId);
            if (addon) {
                subtotal += addon.price;

                const addonRange = this._normalizeRange(addon.priceRange, addon.price);
                subtotalRange = this._addRange(subtotalRange, addonRange);

                breakdown.push({
                    type: 'addon',
                    id: addon.id,
                    name: addon.name,
                    amount: addon.price
                });
            }
        });

        // Return both subtotal (legacy) and subtotalRange (new)
        return {
            subtotal: Math.max(0, subtotal),
            subtotalRange: this._clampRangeNonNegative(this._roundRange(subtotalRange)),
            breakdown,
            isMonthly: service.isMonthly || false
        };
    }

    calculateTotalQuote(state) {
        const { selectedServices, serviceConfigs, commonConfig } = state;

        const services = [];
        let subtotal = 0;

        // NEW: subtotal range
        let subtotalRange = { min: 0, max: 0 };

        let allSelectedItems = [];

        selectedServices.forEach(serviceId => {
            const service = this.config.SERVICES[serviceId];
            const config = serviceConfigs[serviceId] || {};
            const serviceCalc = this.calculateServiceQuote(serviceId, config, commonConfig);

            services.push({
                serviceId,
                serviceName: service.name,
                serviceIcon: service.icon,
                ...serviceCalc
            });

            subtotal += serviceCalc.subtotal;
            subtotalRange = this._addRange(subtotalRange, serviceCalc.subtotalRange || this._toRange(serviceCalc.subtotal, 0));

            // Collect all individual items for bundle detection
            if (config.capabilities) allSelectedItems.push(...config.capabilities);
            if (config.addons) allSelectedItems.push(...config.addons);
        });

        // NEW: Monthly Management adder (range) when monthly_management selected
        const monthlyAdderRange = this._normalizeRange(this.config.PRICING_RULES?.monthlyManagementAdder, 0);
        const monthlyAdderLegacy = this._pickLegacyNumberFromRange(monthlyAdderRange, 'max');
        const hasMonthlyManagement = selectedServices.includes('monthly_management');
        if (hasMonthlyManagement && (monthlyAdderRange.min > 0 || monthlyAdderRange.max > 0)) {
            subtotal += monthlyAdderLegacy;
            subtotalRange = this._addRange(subtotalRange, monthlyAdderRange);
        }

        // 1. Detect Bundles and calculate savings
        const bundleResults = this.detectBundles(allSelectedItems);
        const bundleDiscountTotal = bundleResults.reduce((acc, b) => acc + b.savings, 0);

        // 2. Standard multi-service discount (if no specific bundles found)
        let multiServiceDiscount = 0;
        if (bundleDiscountTotal === 0 && selectedServices.length > 1) {
            multiServiceDiscount = Math.round(subtotal * (this.config.PRICING_RULES.bundleDiscount || 0.05));
        }

        const totalDiscount = bundleDiscountTotal + multiServiceDiscount;

        // Legacy final total (number)
        const finalTotal = Math.max(0, subtotal - totalDiscount);

        // NEW: range discount handling
        // - For estimator range, discount affects both min and max.
        // - Keep it simple and safe: subtract same numeric discount from both.
        const totalDiscountRange = this._toRange(totalDiscount, 0);
        let finalTotalRange = this._subRange(subtotalRange, totalDiscountRange);
        finalTotalRange = this._clampRangeNonNegative(this._roundRange(finalTotalRange));

        // 3. Western Agency Price Anchor
        // Legacy numeric anchor retained
        const westernAgencyPrice = Math.round(finalTotal * (this.config.PRICING_RULES.westernAgencyMultiplier || 1.6));

        // NEW: range anchor (preferred for UI)
        const mult = this.config.PRICING_RULES.westernAgencyMultiplier || 1.6;
        const adder = this._normalizeRange(this.config.PRICING_RULES.westernAgencyRangeAdder, 0);

        let westernAgencyPriceRange = {
            min: Math.round(finalTotalRange.min * mult + adder.min),
            max: Math.round(finalTotalRange.max * mult + adder.max)
        };
        westernAgencyPriceRange = this._clampRangeNonNegative(westernAgencyPriceRange);

        const hasMonthly = services.some(s => s.isMonthly);

        return {
            services,

            // Legacy fields (do not remove)
            subtotal,
            totalDiscount,
            finalTotal,
            westernAgencyPrice,

            // NEW range fields for estimator UI
            subtotalRange,
            totalDiscountRange,
            finalTotalRange,
            westernAgencyPriceRange,

            appliedBundles: bundleResults,
            hasMonthly,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Logical Bundle Detection
     * Checks if selected items qualify for specific "Growth Packages"
     */
    detectBundles(selectedItemIds) {
        const activeBundles = [];
        if (!this.config.BUNDLES) return activeBundles;

        this.config.BUNDLES.forEach(bundle => {
            // Check if every item in the bundle is present in the user's selection
            const hasAllItems = bundle.included.every(itemId => selectedItemIds.includes(itemId));

            if (hasAllItems) {
                activeBundles.push({
                    id: bundle.id,
                    name: bundle.name,
                    savings: bundle.savings,
                    pitch: bundle.pitch
                });
            }
        });

        return activeBundles;
    }

    // ==================== FORMATTING UTILITIES ====================
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', this.config.PRICING_RULES.formatOptions)
            .format(amount);
    }

    formatNumber(amount) {
        return amount.toLocaleString('en-US');
    }

    // NEW: format range for UI without breaking old UI
    formatCurrencyRange(range) {
        return this._formatRange(range);
    }

    // ==================== ESTIMATE HELPERS ====================
    estimateTimeline(serviceIds, serviceLevel) {
        const baseDays = 7; // Updated to 7 days based on GHL Setup pitch
        const serviceCount = serviceIds.length;

        let timeline = baseDays;

        // Adjust for service level
        if (serviceLevel === 'luxury') timeline -= 2;
        if (serviceLevel === 'premium') timeline -= 1;

        // Adjust for multiple services
        if (serviceCount > 1) timeline += Math.floor(serviceCount * 1.5);

        return Math.max(2, timeline);
    }

    estimateDeliveryDate(timelineDays) {
        const date = new Date();
        date.setDate(date.getDate() + timelineDays);

        // Skip weekends
        while (date.getDay() === 0 || date.getDay() === 6) {
            date.setDate(date.getDate() + 1);
        }

        return date;
    }
}

// Create singleton instance
window.calculator = new Calculator();
