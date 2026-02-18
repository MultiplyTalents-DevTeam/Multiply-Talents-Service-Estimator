/**
 * STATE MANAGEMENT MODULE
 * Single source of truth for all application state
 * Pure data, no DOM manipulation
 */

class EstimatorState {
    constructor() {
        this.currentStep = 'services';
        this.selectedServices = [];
        this.commonConfig = {
            industry: null,
            scale: null
        };
        this.serviceConfigs = {};
        this.preferences = {
            wantsVideo: false,
            showAllAddons: false // New: Tracks "View More Add-ons" toggle state
        };
        this.activeTab = null;
        
        // Tracking for Applied Bundles & Savings
        this.appliedBundles = []; // New: Stores detected bundles from calculator
        this.lastCalculation = null; // New: Stores the full result of the last calculation
        
        // Cached calculations
        this._cachedQuote = null;
        this._cachedSummary = null;
        
        // Observers for reactive updates
        this.observers = [];
        
        // BEST PRACTICE: Disabled loading from storage to ensure a fresh start on reload
        // this.loadFromStorage(); 
    }

    // ==================== OBSERVER PATTERN ====================
    subscribe(observer) {
        this.observers.push(observer);
    }

    unsubscribe(observer) {
        this.observers = this.observers.filter(obs => obs !== observer);
    }

    notifyObservers() {
        this.observers.forEach(observer => observer(this));
    }

    // ==================== STATE UPDATERS ====================
    update(updates) {
        // Merge updates into state
        Object.assign(this, updates);
        
        // Invalidate caches
        this._cachedQuote = null;
        this._cachedSummary = null;
        
        // Re-run calculation whenever state changes to keep bundles in sync
        if (window.calculator && this.selectedServices.length > 0) {
            this.lastCalculation = window.calculator.calculateTotalQuote(this);
            this.appliedBundles = this.lastCalculation.appliedBundles || [];
        } else {
            this.appliedBundles = [];
        }
        
        // Notify observers
        this.notifyObservers();
        
        // Log for debugging
        if (window.DEBUG_MODE) {
            console.log('State updated:', this.getSnapshot());
            if (this.appliedBundles.length > 0) {
                console.log('Active Bundles Detected:', this.appliedBundles);
            }
        }
    }

    // ==================== SERVICE MANAGEMENT ====================
    toggleService(serviceId) {
        const index = this.selectedServices.indexOf(serviceId);
        
        if (index > -1) {
            // Remove service
            this.selectedServices.splice(index, 1);
            delete this.serviceConfigs[serviceId];
        } else {
            // Add service with default configuration
            this.selectedServices.push(serviceId);
            
            // Get default capabilities from CONFIG for this service
            const defaultCaps = CONFIG.SERVICES[serviceId]?.capabilities || [];
            
            this.serviceConfigs[serviceId] = {
                capabilities: [...defaultCaps],
                serviceLevel: 'standard', // Default to Standard
                addons: []
            };
        }
        
        // Update active tab if needed
        if (this.activeTab && !this.selectedServices.includes(this.activeTab)) {
            this.activeTab = this.selectedServices[0] || null;
        } else if (!this.activeTab && this.selectedServices.length > 0) {
            this.activeTab = this.selectedServices[0];
        }
        
        this.update({});
    }

    updateServiceConfig(serviceId, configUpdates) {
        if (!this.serviceConfigs[serviceId]) {
            this.serviceConfigs[serviceId] = {
                capabilities: [],
                serviceLevel: 'standard',
                addons: []
            };
        }
        
        // Handle array merges (capabilities/addons) or value overwrites
        Object.assign(this.serviceConfigs[serviceId], configUpdates);
        this.update({});
    }

    // ==================== VALIDATION ====================
    validateStep(step) {
        switch(step) {
            case 'services':
                return this.selectedServices.length > 0;
            
            case 'scope':
                // Check if Industry and Business Scale are selected
                return !!(this.commonConfig.industry && this.commonConfig.scale);
            
            case 'details':
                // Ensure all selected services have a service level chosen
                return this.selectedServices.every(serviceId => 
                    this.serviceConfigs[serviceId]?.serviceLevel
                );
            
            case 'review':
                // Step 4 (Summary) is always valid if they reached it
                return true;
                
            case 'contact':
                // Contact form validation is handled by GHL Integration / DOM
                return true;
            
            default:
                return true;
        }
    }

    // ==================== UTILITIES ====================
    reset() {
        this.currentStep = 'services';
        this.selectedServices = [];
        this.commonConfig = { industry: null, scale: null };
        this.serviceConfigs = {};
        this.preferences = { 
            wantsVideo: false,
            showAllAddons: false 
        };
        this.activeTab = null;
        this.appliedBundles = [];
        this.lastCalculation = null;
        this._cachedQuote = null;
        this._cachedSummary = null;
        
        if (typeof this.clearStorage === 'function') this.clearStorage();
        this.update({});
    }

    getSnapshot() {
        return {
            currentStep: this.currentStep,
            selectedServices: [...this.selectedServices],
            commonConfig: { ...this.commonConfig },
            serviceConfigs: JSON.parse(JSON.stringify(this.serviceConfigs)),
            preferences: { ...this.preferences },
            activeTab: this.activeTab,
            appliedBundles: [...this.appliedBundles]
        };
    }

    // ==================== COMPUTED PROPERTIES ====================
    get hasMultipleServices() {
        return this.selectedServices.length > 1;
    }

    get hasMonthlyService() {
        return this.selectedServices.some(serviceId => 
            CONFIG.SERVICES[serviceId]?.isMonthly
        );
    }

    get progressPercentage() {
        const currentStepIndex = CONFIG.STEPS.findIndex(s => s.id === this.currentStep);
        if (currentStepIndex === -1) return 0;
        return (currentStepIndex / (CONFIG.STEPS.length - 1)) * 100;
    }

    // ==================== PERSISTENCE (OPTIONAL) ====================
    clearStorage() {
        try {
            localStorage.removeItem('ghlEstimatorState');
        } catch (e) {}
    }
}

// Create singleton instance
window.estimatorState = new EstimatorState();
