/**
 * MATH ENGINE MODULE
 * Pure calculation functions - no DOM, no side effects
 * All functions are deterministic and testable
 */

class Calculator {
    constructor() {
        this.config = CONFIG;
    }

    // ==================== CORE CALCULATIONS ====================
    calculateServiceQuote(serviceId, serviceConfig, commonConfig) {
        const service = this.config.SERVICES[serviceId];
        if (!service) return { subtotal: 0, breakdown: [] };

        let subtotal = service.basePrice;
        const breakdown = [];

        // Add capabilities
        (serviceConfig.capabilities || []).forEach(capId => {
            const capability = this.config.CAPABILITIES[capId];
            if (capability?.price > 0) {
                subtotal += capability.price;
                breakdown.push({
                    type: 'capability',
                    id: capId,
                    name: capability.name,
                    amount: capability.price
                });
            }
        });

        // Apply industry multiplier
        if (commonConfig.industry) {
            const industry = this.config.INDUSTRIES.find(i => i.id === commonConfig.industry);
            if (industry?.multiplier > 1) {
                const increase = Math.round(subtotal * (industry.multiplier - 1));
                subtotal += increase;
                breakdown.push({
                    type: 'industry',
                    id: industry.id,
                    name: `${industry.name} Industry`,
                    amount: increase
                });
            }
        }

        // Apply scale adder (Updated from Multiplier to Fixed Adder based on Page 2)
        if (commonConfig.scale) {
            const scale = this.config.BUSINESS_SCALES.find(s => s.id === commonConfig.scale);
            if (scale && scale.adder > 0) {
                subtotal += scale.adder;
                breakdown.push({
                    type: 'scale_adder',
                    id: scale.id,
                    name: `${scale.name} Adjustment`,
                    amount: scale.adder
                });
            }
        }

        // Apply service level adder (Updated from Multiplier to Fixed Adder based on Page 3)
        if (serviceConfig.serviceLevel) {
            const level = this.config.SERVICE_LEVELS.find(l => l.id === serviceConfig.serviceLevel);
            if (level && level.adder > 0) {
                subtotal += level.adder;
                breakdown.push({
                    type: 'service_level',
                    id: level.id,
                    name: `${level.name} Level`,
                    amount: level.adder
                });
            }
        }

        // Add technical addons
        (serviceConfig.addons || []).forEach(addonId => {
            const addon = this.config.ADDONS.find(a => a.id === addonId);
            if (addon) {
                subtotal += addon.price;
                breakdown.push({
                    type: 'addon',
                    id: addon.id,
                    name: addon.name,
                    amount: addon.price
                });
            }
        });

        return {
            subtotal: Math.max(0, subtotal),
            breakdown,
            isMonthly: service.isMonthly || false
        };
    }

    calculateTotalQuote(state) {
        const { selectedServices, serviceConfigs, commonConfig } = state;
        
        const services = [];
        let subtotal = 0;
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

            // Collect all individual items for bundle detection
            if (config.capabilities) allSelectedItems.push(...config.capabilities);
            if (config.addons) allSelectedItems.push(...config.addons);
        });

        // 1. Detect Bundles and calculate savings
        const bundleResults = this.detectBundles(allSelectedItems);
        const bundleDiscountTotal = bundleResults.reduce((acc, b) => acc + b.savings, 0);

        // 2. Standard multi-service discount (if no specific bundles found)
        let multiServiceDiscount = 0;
        if (bundleDiscountTotal === 0 && selectedServices.length > 1) {
            multiServiceDiscount = Math.round(subtotal * (this.config.PRICING_RULES.bundleDiscount || 0.05));
        }

        const totalDiscount = bundleDiscountTotal + multiServiceDiscount;
        const finalTotal = Math.max(0, subtotal - totalDiscount);
        
        // 3. Western Agency Price Anchor Calculation
        const westernAgencyPrice = Math.round(finalTotal * this.config.PRICING_RULES.westernAgencyMultiplier);

        const hasMonthly = services.some(s => s.isMonthly);

        return {
            services,
            subtotal,
            appliedBundles: bundleResults,
            totalDiscount,
            finalTotal,
            westernAgencyPrice,
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