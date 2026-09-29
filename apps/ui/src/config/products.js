export const PRODUCTS = [
    {
        id: "starter",
        name: "Starter Plan",
        description: "Ideal for individual developers and small workflows.",
        popular: false,
        prices: {
            monthly: {
                priceId: import.meta.env.VITE_STRIPE_STARTER_MONTHLY_ID || "price_starter_monthly",
                amount: 29,
                display: "$29",
            },
            annual: {
                priceId: import.meta.env.VITE_STRIPE_STARTER_ANNUAL_ID || "price_starter_annual",
                amount: 23,
                display: "$23",
            },
        },
        features: [
            "Up to 5 active agents",
            "10,000 execution credits/mo",
            "Standard support",
            "Basic analytics",
        ],
    },
    {
        id: "pro",
        name: "Pro Plan",
        description: "For teams requiring multi-agent swarm orchestrations.",
        popular: true,
        prices: {
            monthly: {
                priceId: import.meta.env.VITE_STRIPE_PRO_MONTHLY_ID || "price_pro_monthly",
                amount: 79,
                display: "$79",
            },
            annual: {
                priceId: import.meta.env.VITE_STRIPE_PRO_ANNUAL_ID || "price_pro_annual",
                amount: 63,
                display: "$63",
            },
        },
        features: [
            "Unlimited active agents",
            "100,000 execution credits/mo",
            "Priority webhooks & SSE stream",
            "Advanced audit logs",
            "24/7 dedicated support",
        ],
    },
    {
        id: "enterprise",
        name: "Enterprise Plan",
        description: "Custom infrastructure, self-hosting options, and SLA.",
        popular: false,
        prices: {
            monthly: {
                priceId: import.meta.env.VITE_STRIPE_ENTERPRISE_MONTHLY_ID || "price_enterprise_monthly",
                amount: 249,
                display: "$249",
            },
            annual: {
                priceId: import.meta.env.VITE_STRIPE_ENTERPRISE_ANNUAL_ID || "price_enterprise_annual",
                amount: 199,
                display: "$199",
            },
        },
        features: [
            "Custom execution credits",
            "Dedicated database connection",
            "Custom agent integrations",
            "SLA & priority support",
            "Role-based access management",
        ],
    },
];