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
            wantsVideo: false
        };
        this.activeTab = null;
        
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
        
        // BEST PRACTICE: Disabled auto-save to prevent persistent service selection
        // this.saveToStorage(); 
        
        // Notify observers
        this.notifyObservers();
        
        // Log for debugging
        if (window.DEBUG_MODE) {
            console.log('State updated:', this.getSnapshot());
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
            this.serviceConfigs[serviceId] = {
                capabilities: [],
                serviceLevel: null,
                serviceLevel: null,
                addons: []
            };
        }
        
        // Update active tab if needed
        if (this.activeTab && !this.selectedServices.includes(this.activeTab)) {
            this.activeTab = this.selectedServices[0] || null;
        }
        
        this.update({});
    }

    updateServiceConfig(serviceId, configUpdates) {
        if (!this.serviceConfigs[serviceId]) {
            this.serviceConfigs[serviceId] = {};
        }
        
        Object.assign(this.serviceConfigs[serviceId], configUpdates);
        this.update({});
    }

    // ==================== VALIDATION ====================
    validateStep(step) {
        switch(step) {
            case 'services':
                return this.selectedServices.length > 0;
            
            case 'scope':
                return this.commonConfig.industry && this.commonConfig.scale;
            
            case 'details':
                return this.selectedServices.every(serviceId => 
                    this.serviceConfigs[serviceId]?.serviceLevel
                );
            
            default:
                return true;
        }
    }

    // ==================== PERSISTENCE (OPTIONAL/UNUSED) ====================
    saveToStorage() {
        try {
            const saveableState = {
                currentStep: this.currentStep,
                selectedServices: this.selectedServices,
                commonConfig: this.commonConfig,
                serviceConfigs: this.serviceConfigs,
                preferences: this.preferences,
                activeTab: this.activeTab,
                timestamp: Date.now()
            };
            
            localStorage.setItem('ghlEstimatorState', JSON.stringify(saveableState));
        } catch (error) {
            console.warn('Failed to save state to localStorage:', error);
        }
    }

    loadFromStorage() {
        try {
            const saved = JSON.parse(localStorage.getItem('ghlEstimatorState'));
            if (saved) {
                if (Date.now() - (saved.timestamp || 0) < 24 * 60 * 60 * 1000) {
                    this.currentStep = 'services'; 
                    this.selectedServices = saved.selectedServices || [];
                    this.commonConfig = saved.commonConfig || { industry: null, scale: null };
                    this.serviceConfigs = saved.serviceConfigs || {};
                    this.preferences = saved.preferences || { wantsVideo: false };
                    this.activeTab = null;
                }
            }
        } catch (error) {
            console.warn('Failed to load state from localStorage:', error);
        }
    }

    clearStorage() {
        localStorage.removeItem('ghlEstimatorState');
    }

    // ==================== UTILITIES ====================
    reset() {
        this.currentStep = 'services';
        this.selectedServices = [];
        this.commonConfig = { industry: null, scale: null };
        this.serviceConfigs = {};
        this.preferences = { wantsVideo: false };
        this.activeTab = null;
        this._cachedQuote = null;
        this._cachedSummary = null;
        
        this.clearStorage();
        this.update({});
    }

    getSnapshot() {
        return {
            currentStep: this.currentStep,
            selectedServices: [...this.selectedServices],
            commonConfig: { ...this.commonConfig },
            serviceConfigs: { ...this.serviceConfigs },
            preferences: { ...this.preferences },
            activeTab: this.activeTab
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
        return (currentStepIndex / (CONFIG.STEPS.length - 1)) * 100;
    }
}

// Create singleton instance
window.estimatorState = new EstimatorState();