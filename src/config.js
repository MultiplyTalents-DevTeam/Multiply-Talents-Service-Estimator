/**
 * CONFIGURATION MODULE
 * All static data, pricing, and service definitions
 * No business logic, just data
 */

const CONFIG = {
    // ==================== SERVICE DEFINITIONS ====================
    // Updated based on [cite: 3]
    SERVICES: {
        new_ghl_setup: {
            id: 'new_ghl_setup',
            name: 'New GHL Setup',
            description: 'Get a professional, turnkey foundation in 7 days without the DIY headache.',
            icon: '🚀',
            basePrice: 497,
            category: 'ghl',
            capabilities: ['funnels', 'crm', 'workflow_automation']
        },
        platform_migration: {
            id: 'platform_migration',
            name: 'Platform Migration',
            description: 'Stop overpaying for 5 different tools. We’ll move your entire business to GHL seamlessly.',
            icon: '🔄',
            basePrice: 697,
            category: 'ghl',
            capabilities: ['data_migration', 'workflow_transfer']
        },
        fix_optimize: {
            id: 'fix_optimize',
            name: 'Fix & Optimize',
            description: 'Is your GHL messy? We’ll audit your tech stack and plug the leaks in your automation.',
            icon: '🔧',
            basePrice: 297,
            category: 'ghl',
            capabilities: ['audit', 'optimization', 'bug_fixes']
        },
        monthly_management: {
            id: 'monthly_management',
            name: 'Monthly Management',
            description: 'Your own dedicated GHL expert for less than a part-time VA’s salary.',
            icon: '👥',
            basePrice: 997,
            category: 'ghl',
            isMonthly: true,
            recommendedBadge: true, // [cite: 46]
            capabilities: ['campaign_launches', 'tech_support', 'reporting']
        }
    },

    // ==================== FEATURES (Step 2) ====================
    // Updated pricing and pitches based on [cite: 14]
    CAPABILITIES: {
        funnels: { 
            id: 'funnels', 
            name: 'Funnels & Websites', 
            price: 297, 
            icon: '🎯',
            pitch: 'Your 24/7 digital salesperson. We build high-converting, mobile-optimized funnels designed to turn cold traffic into loyal customers.',
            isPopularBundlePart: true // [cite: 15]
        },
        crm: { 
            id: 'crm', 
            name: 'CRM & Pipelines', 
            price: 197, 
            icon: '📊',
            pitch: 'Stop losing leads in the cracks. We’ll map out your entire sales journey so you always know exactly who to call and when to close.',
            isPopularBundlePart: true 
        },
        workflow_automation: { 
            id: 'workflow_automation', 
            name: 'Workflow Automation', 
            price: 247, 
            icon: '🤖',
            pitch: 'Put your business on autopilot. We’ll automate your follow-ups, lead nurturing, and tasks, saving you 10+ hours of manual work every week.',
            isPopularBundlePart: true 
        },
        reputation_management: { 
            id: 'reputation_management', 
            name: 'Reputation Management', 
            price: 147, 
            icon: '⭐',
            pitch: 'Dominate local search. We’ll automate your review requests to turn every happy customer into a 5-star Google rating that attracts new business.'
        },
        social_media_planner: { 
            id: 'social_media_planner', 
            name: 'Social Media Planner', 
            price: 147, 
            icon: '📅',
            pitch: 'One dashboard, all your socials. Schedule a month’s worth of content in minutes and keep your brand active without the daily hassle.'
        },
        calendar: { 
            id: 'calendar', 
            name: 'Calendar System', 
            price: 97, 
            icon: '🗓️',
            pitch: "Say goodbye to 'When are you free?' emails. A professional, automated booking system that syncs with your phone and fills your schedule."
        }
    },

    // ==================== INDUSTRIES (Step 3) ====================
    // Updated list based on [cite: 5, 6, 7, 8]
    INDUSTRIES: [
        { id: 'home_services', name: 'Home Services/Contractors', icon: '🏠', multiplier: 1.0 },
        { id: 'ecommerce', name: 'E-commerce', icon: '🛒', multiplier: 1.0 },
        { id: 'elearning_coaches', name: 'E-learning/Coaches', icon: '🎓', multiplier: 1.0 },
        { id: 'medical_dental', name: 'Medical/Dental', icon: '🏥', multiplier: 1.3 },
        { id: 'agency_saas', name: 'Agency/SaaS', icon: '⚖️', multiplier: 1.1 },
        { id: 'other', name: 'Other', icon: '🏢', multiplier: 1.0 }
    ],

    // ==================== BUSINESS SCALES (Step 4) ====================
    // Updated to use fixed price adders based on [cite: 10, 11]
    BUSINESS_SCALES: [
        { 
            id: 'solopreneur', 
            name: 'Solopreneur', 
            description: 'Perfect for those starting or staying lean.', 
            icon: '🚀', 
            adder: 0 
        },
        { 
            id: 'growing', 
            name: 'Growing Biz', 
            description: 'Built to scale with your increasing lead flow.', 
            icon: '📈', 
            adder: 300 
        },
        { 
            id: 'scale', 
            name: 'Scale/Agency', 
            description: 'Infrastructure designed for high-volume stability.', 
            icon: '🏢', 
            adder: 700 
        },
        { 
            id: 'enterprise', 
            name: 'Enterprise', 
            description: 'White-glove architecture for massive operations.', 
            icon: '🌆', 
            adder: 1500 
        }
    ],

    // ==================== SERVICE LEVELS (Step 5) ====================
    // Updated based on [cite: 17, 18, 19, 20]
    SERVICE_LEVELS: [
        {
            id: 'standard',
            name: 'Standard (DIY Hybrid)',
            description: 'We build it, you run it.',
            features: ['Basic snapshot install', 'Standard timeline'],
            adder: 0
        },
        {
            id: 'premium',
            name: 'Premium (Done-With-You)',
            description: 'We build it and train your team to be pros.',
            features: ['Full setup', 'Priority support', 'Training included'],
            adder: 497,
            popular: true
        },
        {
            id: 'luxury',
            name: 'Luxury (White Glove)',
            description: 'Total peace of mind. We handle every single click.',
            features: ['Custom design', 'Advanced automation', 'Priority 48h support'],
            adder: 997
        }
    ],

    // ==================== ADDONS (Step 6) ====================
    // Fully updated technical add-ons based on [cite: 22]
    ADDONS: [
        { id: 'api_integration', name: 'Custom API/Webhook', description: 'We make the impossible possible. Custom bridges for your data.', icon: '🔗', price: 497 },
        { id: 'snapshot_creation', name: 'Snapshot Creation', description: 'Package your setup into a deployable asset you can sell.', icon: '📸', price: 297 },
        { id: 'rush_delivery', name: 'Rush Delivery (48h)', description: 'We clear our schedule to launch your project yesterday.', icon: '⚡', price: 150 },
        { id: 'zoom_handoff', name: 'Live Zoom Handoff', description: '1-on-1 walkthrough to ensure you are 100% confident.', icon: '🎓', price: 147 },
        { id: 'hipaa', name: 'Advanced HIPAA Compliance', description: 'Configure GHL for strict medical security standards.', icon: '🛡️', price: 497 },
        { id: 'ab_testing', name: 'A/B Split Testing Setup', description: 'Find the winning design that brings in the most leads.', icon: '🧪', price: 197 },
        { id: 'custom_css', name: 'Custom CSS/Branding', description: 'High-end, bespoke brand aesthetic that builds instant trust.', icon: '🎨', price: 247 },
        { id: 'email_audit', name: 'Email Deliverability Audit', description: 'Ensure your emails land in the inbox, not the spam folder.', icon: '📧', price: 197 }
    ],

    // ==================== GROWTH PACKAGES (BUNDLES) ====================
    // New logic for Page 4 [cite: 32]
    BUNDLES: [
        {
            id: 'authority_bundle',
            name: 'The Authority Bundle',
            included: ['reputation_management', 'social_media_planner', 'custom_css'],
            bundlePrice: 447,
            savings: 94,
            pitch: 'Everything you need to look like the market leader and dominate local search.'
        },
        {
            id: 'scale_safety_bundle',
            name: 'The Scale & Safety Bundle',
            included: ['api_integration', 'snapshot_creation', 'hipaa'],
            bundlePrice: 997,
            savings: 294,
            pitch: 'Built for high-volume agencies and healthcare providers needing enterprise-grade security.'
        },
        {
            id: 'performance_pro',
            name: 'The Performance Pro',
            included: ['ab_testing', 'email_audit', 'zoom_handoff'],
            bundlePrice: 447,
            savings: 94,
            pitch: 'Optimize your ROI. We ensure emails hit the inbox and funnels convert.'
        }
    ],

    // ==================== PRICING RULES & ANCHORING ====================
    PRICING_RULES: {
        currency: 'USD',
        westernAgencyMultiplier: 2.78, // Used to calculate Estimated US Agency Price [cite: 37]
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