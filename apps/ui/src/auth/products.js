// Website-side product registry. Mirrors apps/api/src/auth/products.js.
// Each product has its own sign-in pages, its own session and its own pricing/billing pages.
export const PRODUCTS = {
  "nexus-core": {
    slug: "nexus-core",
    name: "Nexus Core",
    tagline: "AI agents you can trust with real work",
    basePath: "",
    homePath: "/dashboard",
    paths: { login: "/login", register: "/register", forgot: "/forgot-password", reset: "/reset-password", pricing: "/pricing", billing: "/billing" },
  },
  compliance: {
    slug: "compliance",
    name: "Cross-Border Compliance",
    tagline: "Customs audit, duty calculation and M-Pesa payment for clearing agents",
    basePath: "/compliance",
    homePath: "/compliance",
    paths: { login: "/compliance/login", register: "/compliance/register", forgot: "/compliance/forgot-password", reset: "/compliance/reset-password", pricing: "/compliance/pricing", billing: "/compliance/billing" },
  },
  supportops: {
    slug: "supportops",
    name: "SupportOps",
    tagline: "AI-assisted customer support",
    external: "https://supportops.nexusthecore.com/supportops",
    basePath: "/supportops",
    homePath: "/supportops",
    paths: {},
  },
};
