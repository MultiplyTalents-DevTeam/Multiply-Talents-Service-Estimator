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
            icon: 'fa-solid fa-rocket',

            // BACKWARD COMPAT (do not remove): keep a single number for legacy UIs
            // Using the "max" of the range is safest for any existing code that expects a number.
            basePrice: 297,

            // NEW: Range pricing for estimation (min/max)
            basePriceRange: { min: 97, max: 297 },

            category: 'ghl',
            recommendedBadge: true,

            // Keep as-is (capabilities still appear selectable; calculator/ui will mark some as Included)
            capabilities: ['funnels', 'crm', 'workflow_automation']
        },
        platform_migration: {
            id: 'platform_migration',
            name: 'Platform Migration',
            description: 'Stop overpaying for 5 different tools. We’ll move your entire business to GHL seamlessly.',
            icon: 'fa-solid fa-right-left',

            // BACKWARD COMPAT
            basePrice: 997,

            // NEW: Range pricing for estimation (min/max)
            basePriceRange: { min: 697, max: 997 },

            category: 'ghl',
            capabilities: ['data_migration', 'workflow_transfer']
        },
        fix_optimize: {
            id: 'fix_optimize',
            name: 'Fix & Optimize',
            description: 'Is your GHL messy? We’ll audit your tech stack and plug the leaks in your automation.',
            icon: 'fa-solid fa-screwdriver-wrench',

            // BACKWARD COMPAT
            basePrice: 497,

            // NEW: Range pricing for estimation (min/max)
            basePriceRange: { min: 297, max: 497 },

            category: 'ghl',
            capabilities: ['audit', 'optimization', 'bug_fixes']
        },
        monthly_management: {
            id: 'monthly_management',
            name: 'Monthly Management',
            description: 'Your own dedicated GHL expert for less than a part-time VA’s salary.',
            icon: 'fa-solid fa-calendar-check',

            // BACKWARD COMPAT
            basePrice: 997,

            // NEW: Optional range (kept same min/max by default, can be adjusted later)
            basePriceRange: { min: 127, max: 997 },

            category: 'ghl',
            isMonthly: true,
            capabilities: ['campaign_launches', 'tech_support', 'reporting']
        }
    },

    // ==================== FEATURES (Step 2) ====================
    // Updated pricing and pitches based on [cite: 14]
    CAPABILITIES: {
        funnels: { 
            id: 'funnels', 
            name: 'Funnels & Websites', 
            // BACKWARD COMPAT: keep numeric price
            price: 297, 
            // NEW: Optional range (kept same min/max)
            priceRange: { min: 297, max: 297 },
            icon: 'fa-solid fa-layer-group',
            pitch: 'Your 24/7 digital salesperson. We build high-converting, mobile-optimized funnels designed to turn cold traffic into loyal customers.',
            isPopularBundlePart: true // [cite: 15]
        },
        crm: { 
            id: 'crm', 
            name: 'CRM & Pipelines', 
            price: 197, 
            priceRange: { min: 197, max: 197 },
            icon: 'fa-solid fa-users',
            pitch: 'Stop losing leads in the cracks. We’ll map out your entire sales journey so you always know exactly who to call and when to close.',
            isPopularBundlePart: true 
        },
        workflow_automation: { 
            id: 'workflow_automation', 
            name: 'Workflow Automation', 
            price: 247, 
            priceRange: { min: 247, max: 247 },
            icon: 'fa-solid fa-gears',
            pitch: 'Put your business on autopilot. We’ll automate your follow-ups, lead nurturing, and tasks, saving you 10+ hours of manual work every week.',
            isPopularBundlePart: true 
        },
        reputation_management: { 
            id: 'reputation_management', 
            name: 'Reputation Management', 
            price: 147, 
            priceRange: { min: 147, max: 147 },
            icon: 'fa-solid fa-star',
            pitch: 'Dominate local search. We’ll automate your review requests to turn every happy customer into a 5-star Google rating that attracts new business.'
        },
        social_media_planner: { 
            id: 'social_media_planner', 
            name: 'Social Media Planner', 
            price: 147, 
            priceRange: { min: 147, max: 147 },
            icon: 'fa-solid fa-calendar-days',
            pitch: 'One dashboard, all your socials. Schedule a month’s worth of content in minutes and keep your brand active without the daily hassle.'
        },
        calendar: { 
            id: 'calendar', 
            name: 'Calendar System', 
            price: 97, 
            priceRange: { min: 97, max: 97 },
            icon: 'fa-solid fa-calendar-days',
            pitch: "Say goodbye to 'When are you free?' emails. A professional, automated booking system that syncs with your phone and fills your schedule."
        }
    },

    // ==================== INDUSTRIES (Step 3) ====================
    // Updated list based on [cite: 5, 6, 7, 8]
    INDUSTRIES: [
        { id: 'medical_aesthetics', name: 'Medical Aesthetics', subtitle: 'Cosmetic Clinics', icon: 'fa-solid fa-spa', multiplier: 1.3 },
        { id: 'private_healthcare', name: 'Private Healthcare', subtitle: 'Dental • Specialty Healthcare', icon: 'fa-solid fa-stethoscope', multiplier: 1.3 },
        { id: 'home_services', name: 'Home Services', subtitle: 'Roofing • HVAC • Plumbing • Electrical • Pest Control', icon: 'fa-solid fa-toolbox', multiplier: 1.0 },
        { id: 'education_training', name: 'Education & Training', subtitle: 'Private Colleges • Skills Training • Coaching Institutes', icon: 'fa-solid fa-graduation-cap', multiplier: 1.0 },
        { id: 'real_estate', name: 'Real Estate', subtitle: 'Agencies & Teams', icon: 'fa-solid fa-house', multiplier: 1.0 },
        { id: 'automotive_services', name: 'Automotive Services', subtitle: 'Detailing • Repairs • Dealerships', icon: 'fa-solid fa-car-side', multiplier: 1.0 },
        { id: 'professional_services', name: 'Professional Services', subtitle: 'Consultants • Accountants • Agencies', icon: 'fa-solid fa-briefcase', multiplier: 1.1 },
        { id: 'legal_firms', name: 'Legal Firms', subtitle: 'Personal Injury • Immigration • Family Law', icon: 'fa-solid fa-scale-balanced', multiplier: 1.2 },
        { id: 'fitness_training', name: 'Fitness Studios', subtitle: 'Personal Training', icon: 'fa-solid fa-dumbbell', multiplier: 1.0 },
        { id: 'food_catering', name: 'Food & Catering', subtitle: 'Restaurants • Catering Services', icon: 'fa-solid fa-utensils', multiplier: 1.0 },
        { id: 'other', name: 'Others', subtitle: '', icon: 'fa-solid fa-shapes', multiplier: 1.0 }
    ],

    // ==================== BUSINESS SCALES (Step 4) ====================
    // Updated to use fixed price adders based on [cite: 10, 11]
    BUSINESS_SCALES: [
        { 
            id: 'solopreneur', 
            name: 'Solopreneur', 
            description: 'Perfect for those starting or staying lean.', 
            icon: 'fa-solid fa-user', 
            adder: 0 
        },
        { 
            id: 'growing', 
            name: 'Growing Biz', 
            description: 'Built to scale with your increasing lead flow.', 
            icon: 'fa-solid fa-seedling', 
            adder: 300 
        },
        { 
            id: 'scale', 
            name: 'Scale/Agency', 
            description: 'Infrastructure designed for high-volume stability.', 
            icon: 'fa-solid fa-chart-line', 
            adder: 700 
        },
        { 
            id: 'enterprise', 
            name: 'Enterprise', 
            description: 'White-glove architecture for massive operations.', 
            icon: 'fa-solid fa-building-columns', 
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
        // BEST PRACTICE: Put high-urgency upsells first so they show above any "View More" cutoff.
        // BOSS REQUEST: Move Rush Delivery to upper side + change label to 48–72 hours.
        { id: 'rush_delivery', name: 'Rush Delivery (48–72h)', description: 'We clear our schedule to launch your project yesterday.', icon: 'fa-solid fa-bolt', price: 300, priceRange: { min: 300, max: 300 } },

        { id: 'snapshot_creation', name: 'Snapshot Creation', description: 'Package your setup into a deployable asset you can sell.', icon: 'fa-solid fa-box-archive', price: 297, priceRange: { min: 297, max: 297 } },
        { id: 'api_integration', name: 'Custom API/Webhook', description: 'We make the impossible possible. Custom bridges for your data.', icon: 'fa-solid fa-code', price: 497, priceRange: { min: 497, max: 497 } },

        { id: 'zoom_handoff', name: 'Live Zoom Handoff', description: '1-on-1 walkthrough to ensure you are 100% confident.', icon: 'fa-solid fa-video', price: 147, priceRange: { min: 147, max: 147 } },
        { id: 'hipaa', name: 'Advanced HIPAA Compliance', description: 'Configure GHL for strict medical security standards.', icon: 'fa-solid fa-shield-halved', price: 497, priceRange: { min: 497, max: 497 } },
        { id: 'ab_testing', name: 'A/B Split Testing Setup', description: 'Find the winning design that brings in the most leads.', icon: 'fa-solid fa-flask', price: 197, priceRange: { min: 197, max: 197 } },
        { id: 'custom_css', name: 'Custom CSS/Branding', description: 'High-end, bespoke brand aesthetic that builds instant trust.', icon: 'fa-solid fa-paintbrush', price: 247, priceRange: { min: 247, max: 247 } },
        { id: 'email_audit', name: 'Email Deliverability Audit', description: 'Ensure your emails land in the inbox, not the spam folder.', icon: 'fa-solid fa-envelope-open-text', price: 197, priceRange: { min: 197, max: 197 } }
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

        // BACKWARD COMPAT: keep multiplier (older calculator may use this)
        // Adjusted from 2.78 to a lower anchor (you want ~+1000 vs your estimate).
        westernAgencyMultiplier: 1.6,

        // NEW: Range-based western anchor rule (calculator can prefer this)
        // Example: if your estimate is 1000–2000, western becomes ~3000–4000.
        westernAgencyRangeAdder: { min: 340, max: 525 },

        // BEST PRACTICE: Keep marketing anchor as a fixed "comparison range" so UI can display it consistently.
        // BOSS REQUEST (prep for UI step): typical US-based/on-shore agency comparison range.
        typicalUSBasedAgencyRange: null,

        // NEW: Monthly management adder (+127) when monthly_management is selected
        monthlyManagementAdder: 0,

        // NEW: Capabilities included (no extra price) when specific service selected
        includedCapabilitiesByService: {
            new_ghl_setup: ['funnels', 'crm', 'workflow_automation']
        },

        formatOptions: {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0
        }
    },

    // ==================== STEP CONFIGURATION ====================
    STEPS: [
        { 
            id: 'services', 
            label: 'Services', 
            number: 1,
            microcopy: [
                '<strong>Bundle & Save:</strong> Multi-service selections automatically trigger our agency partnership discounts.',
                '<strong>Tip:</strong> Start with the services that unlock revenue fastest. You can fine-tune details next.',
                '<strong>Live estimate:</strong> Your range updates as you select scope, levels, and add-ons.'
            ]
        },
        { 
            id: 'scope', 
            label: 'Scope', 
            number: 2,
            microcopy: [
                '<strong>Applies to all services:</strong> Your industry and scale shape pricing, timeline, and workflow templates.',
                '<strong>Choose the closest fit:</strong> We tailor automations and reporting to match your market.',
                '<strong>Not sure?</strong> Pick the nearest option for now. You can change it before submitting.'
            ]
        },
        { 
            id: 'details', 
            label: 'Details', 
            number: 3,
            microcopy: [
                '<strong>Configure each service:</strong> Capabilities → Service level → Optional add-ons.',
                '<strong>Keep it lean:</strong> Start with launch essentials, then expand after go-live.',
                '<strong>Progress saved:</strong> Your selections are stored as you switch tabs.'
            ]
        },
        { 
            id: 'review', 
            label: 'Review', 
            number: 4,
            microcopy: [
                '<strong>Almost there!</strong> Review your selections below. You can go back to make changes anytime.',
                '<strong>Estimate range:</strong> Pricing reflects your scope, service levels, and add-ons.',
                '<strong>Benchmark:</strong> Compare your investment against typical on-shore agency pricing.'
            ]
        },
        { 
            id: 'contact', 
            label: 'Contact', 
            number: 5,
            microcopy: [
                '<strong>Last step:</strong> Share your details so we can send your roadmap and next steps.',
                '<strong>Want a Loom?</strong> Toggle the video option and we’ll record a walkthrough of your plan.',
                '<strong>Privacy:</strong> Your info is protected and only used to prepare your strategy.'
            ]
        }
    ]
};

// Make available globally
window.CONFIG = CONFIG;
