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

        // Apply scale multiplier and adder
        if (commonConfig.scale) {
            const scale = this.config.BUSINESS_SCALES.find(s => s.id === commonConfig.scale);
            if (scale) {
                // Apply multiplier
                if (scale.multiplier > 1) {
                    const multiplierIncrease = Math.round(subtotal * (scale.multiplier - 1));
                    subtotal += multiplierIncrease;
                    breakdown.push({
                        type: 'scale_multiplier',
                        id: scale.id,
                        name: `${scale.name} Multiplier`,
                        amount: multiplierIncrease
                    });
                }
                
                // Add fixed adder
                if (scale.adder > 0) {
                    subtotal += scale.adder;
                    breakdown.push({
                        type: 'scale_adder',
                        id: scale.id,
                        name: `${scale.name} Adder`,
                        amount: scale.adder
                    });
                }
            }
        }

        // Apply service level multiplier
        if (serviceConfig.serviceLevel) {
            const level = this.config.SERVICE_LEVELS.find(l => l.id === serviceConfig.serviceLevel);
            if (level?.multiplier > 1) {
                const increase = Math.round(subtotal * (level.multiplier - 1));
                subtotal += increase;
                breakdown.push({
                    type: 'service_level',
                    id: level.id,
                    name: `${level.name} Level`,
                    amount: increase
                });
            }
        }

        // Add addons
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

        selectedServices.forEach(serviceId => {
            const service = this.config.SERVICES[serviceId];
            const serviceCalc = this.calculateServiceQuote(serviceId, serviceConfigs[serviceId] || {}, commonConfig);
            
            services.push({
                serviceId,
                serviceName: service.name,
                serviceIcon: service.icon,
                ...serviceCalc
            });
            
            subtotal += serviceCalc.subtotal;
        });

        // Apply bundle discount
        let discount = 0;
        if (selectedServices.length > 1) {
            discount = Math.round(subtotal * this.config.PRICING_RULES.bundleDiscount);
        }

        const total = Math.max(0, subtotal - discount);
        const hasMonthly = services.some(s => s.isMonthly);

        return {
            services,
            subtotal,
            discount,
            total,
            hasMonthly,
            timestamp: new Date().toISOString()
        };
    }

    // ==================== FORMATTING UTILITIES ====================
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', this.config.PRICING_RULES.formatOptions)
            .format(amount);
    }

    formatNumber(amount) {
        return amount.toLocaleString('en-US');
    }

    generateInvoiceNumber() {
        const timestamp = Date.now().toString().slice(-6);
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `EST-${timestamp}${random}`;
    }

    // ==================== VALIDATION CALCULATIONS ====================
    getServiceCompletion(serviceId, serviceConfig) {
        let completed = 0;
        let total = 3; // capabilities, service level, addons
        
        if (serviceConfig.capabilities?.length > 0) completed++;
        if (serviceConfig.serviceLevel) completed++;
        if (serviceConfig.addons?.length > 0) completed++;
        
        return {
            completed,
            total,
            percentage: Math.round((completed / total) * 100)
        };
    }

    // ==================== ESTIMATE HELPERS ====================
    estimateTimeline(serviceIds, serviceLevel) {
        const baseDays = 5;
        const serviceCount = serviceIds.length;
        
        let timeline = baseDays;
        
        // Adjust for service level
        if (serviceLevel === 'luxury') timeline -= 2;
        if (serviceLevel === 'premium') timeline -= 1;
        
        // Adjust for multiple services
        if (serviceCount > 1) timeline += Math.floor(serviceCount / 2);
        
        // Minimum timeline
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