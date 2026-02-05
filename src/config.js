/**
 * CONFIGURATION MODULE
 * All static data, pricing, and service definitions
 * No business logic, just data
 */

const CONFIG = {
    // ==================== SERVICE DEFINITIONS ====================
    SERVICES: {
        new_ghl_setup: {
            id: 'new_ghl_setup',
            name: 'New GHL Setup',
            description: 'Complete GoHighLevel setup from scratch with all automations and workflows',
            icon: '🚀',
            basePrice: 297,
            category: 'ghl',
            // Step 2 capabilities for this service
            capabilities: ['funnels', 'crm', 'inbox', 'calendar']
        },
        platform_migration: {
            id: 'platform_migration',
            name: 'Platform Migration',
            description: 'Seamless migration from your current platform to GoHighLevel',
            icon: '🔄',
            basePrice: 697,
            category: 'ghl',
            capabilities: ['data_migration', 'workflow_transfer', 'training']
        },
        fix_optimize: {
            id: 'fix_optimize',
            name: 'Fix & Optimize',
            description: 'Audit and optimize your existing GHL setup for maximum performance',
            icon: '🔧',
            basePrice: 197,
            category: 'ghl',
            capabilities: ['audit', 'optimization', 'bug_fixes']
        },
        monthly_management: {
            id: 'monthly_management',
            name: 'Monthly Management',
            description: 'Ongoing GHL management, updates, and support',
            icon: '👥',
            basePrice: 997,
            category: 'ghl',
            isMonthly: true,
            capabilities: ['campaign_launches', 'tech_support', 'reporting']
        }
    },

    // ==================== CAPABILITIES (Step 2) ====================
    CAPABILITIES: {
        funnels: { id: 'funnels', name: 'Funnels & Websites', price: 197, icon: '🎯' },
        crm: { id: 'crm', name: 'CRM & Pipelines', price: 0, icon: '📊' },
        inbox: { id: 'inbox', name: 'Unified Inbox', price: 47, icon: '📧' },
        calendar: { id: 'calendar', name: 'Calendar System', price: 97, icon: '📅' },
        data_migration: { id: 'data_migration', name: 'Data Migration', price: 297, icon: '📤' },
        campaign_launches: { id: 'campaign_launches', name: 'Campaign Launches', price: 147, icon: '📢' },
        reporting: { id: 'reporting', name: 'Weekly Reporting', price: 97, icon: '📈' }
    },

    // ==================== INDUSTRIES (Step 3) ====================
    INDUSTRIES: [
        { id: 'real_estate', name: 'Real Estate', icon: '🏠', multiplier: 1.2 },
        { id: 'medical_dental', name: 'Medical/Dental', icon: '🏥', multiplier: 1.3 },
        { id: 'coaching', name: 'Coaching/Course Creator', icon: '💪', multiplier: 1.0 },
        { id: 'agency_saas', name: 'Agency/SaaS', icon: '⚖️', multiplier: 1.1 },
        { id: 'local_service', name: 'Local Service Business', icon: '🔧', multiplier: 1.0 },
        { id: 'other', name: 'Other', icon: '🏢', multiplier: 1.0 }
    ],

    // ==================== BUSINESS SCALES (Step 4) ====================
    BUSINESS_SCALES: [
        { 
            id: 'solopreneur', 
            name: 'Solopreneur', 
            description: 'Under 1,000 contacts', 
            icon: '🚀', 
            multiplier: 1.0, 
            adder: 0 
        },
        { 
            id: 'growing', 
            name: 'Growing Business', 
            description: '1,000 - 10,000 contacts', 
            icon: '🏢', 
            multiplier: 1.1, 
            adder: 197 
        },
        { 
            id: 'scale', 
            name: 'Scale/Agency', 
            description: '10,000 - 50,000 contacts', 
            icon: '🏭', 
            multiplier: 1.2, 
            adder: 497 
        },
        { 
            id: 'enterprise', 
            name: 'Enterprise', 
            description: '50,000+ contacts or Multi-Location', 
            icon: '🌆', 
            multiplier: 1.3, 
            adder: 997 
        }
    ],

    // ==================== SERVICE LEVELS (Step 5) ====================
    SERVICE_LEVELS: [
        {
            id: 'standard',
            name: 'Standard',
            description: 'DIY Hybrid Setup',
            features: ['We install the snapshot', 'You handle copy and DNS', 'Email support', 'Standard timeline'],
            multiplier: 1.0
        },
        {
            id: 'premium',
            name: 'Premium',
            description: 'Done-With-You',
            features: ['Full setup included', '2 revisions included', 'Standard copywriting', 'Priority support', 'Follow-up included'],
            multiplier: 1.4,
            popular: true
        },
        {
            id: 'luxury',
            name: 'Luxury',
            description: 'White Glove Service',
            features: ['Custom CSS design', 'Advanced API integrations', 'Premium copywriting', 'Dedicated support', 'Rush delivery', 'Priority access'],
            multiplier: 2.0
        }
    ],

    // ==================== ADDONS (Step 6) ====================
    ADDONS: [
        { id: 'content_pack', name: 'Content Pack', description: '5 Email + 5 SMS Templates', icon: '📝', price: 97 },
        { id: 'integration', name: '3rd Party Integration', description: 'Zapier/Stripe/Shopify', icon: '🔗', price: 97 },
        { id: 'training', name: 'Training Session', description: '1-hour Zoom training', icon: '🎓', price: 147 },
        { id: 'rush', name: 'Rush Delivery', description: '48-hour turnaround', icon: '⚡', price: 150 }
    ],

    // ==================== PRICING RULES ====================
    PRICING_RULES: {
        bundleDiscount: 0.05, // 5% for multiple services
        currency: 'USD',
        formatOptions: {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0
        }
    },

    // ==================== STEP CONFIGURATION ====================
    STEPS: [
        { id: 'services', label: 'Services', number: 1 },
        { id: 'scope', label: 'Scope', number: 2 },
        { id: 'details', label: 'Details', number: 3 },
        { id: 'review', label: 'Review', number: 4 },
        { id: 'contact', label: 'Contact', number: 5 }
    ]
};



// Make available globally
window.CONFIG = CONFIG;