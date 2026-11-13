// Product registry for authentication and billing.
//
// Every product gets its OWN:
//   - signing key   (<ENV_PREFIX>_JWT_SECRET, or a key derived from JWT_SECRET with HKDF + the product slug)
//   - token audience (aud = slug), so a Nexus Core token is rejected by Compliance and vice versa
//   - refresh cookie name, so signing out of one product never signs you out of another
//   - access grant (app_access row), so an account only reaches the products it was granted
//
// To add a product: add an entry here, add its plans in ../billing/catalog.js, and mount nothing else —
// src/app.js registers /api/<slug>/auth and /api/<slug>/billing for every entry automatically.

export const PRODUCTS = Object.freeze({
  "nexus-core": {
    slug: "nexus-core",
    name: "Nexus Core",
    envPrefix: "NEXUS_CORE",
    cookieName: "nc_rt",
    roles: ["owner", "admin", "member", "billing"],
    defaultRole: "owner",
    // Accounts created before per-product grants existed only ever used Nexus Core.
    // Let them in and record the grant on first sign-in instead of locking them out.
    grantOnFirstLogin: true,
    homePath: "/dashboard",
    resetPath: "/reset-password",
    legacyMounts: ["/api/auth", "/api/v1/auth", "/auth"],
  },
  supportops: {
    slug: "supportops",
    name: "SupportOps",
    envPrefix: "SUPPORTOPS",
    cookieName: "so_rt",
    roles: ["admin", "management", "agent", "investor"],
    defaultRole: "admin",
    grantOnFirstLogin: false,
    homePath: "/supportops",
    resetPath: "/supportops/reset-password",
    legacyMounts: [],
  },
  compliance: {
    slug: "compliance",
    name: "Cross-Border Compliance",
    envPrefix: "COMPLIANCE",
    cookieName: "cb_rt",
    roles: ["owner", "broker", "viewer"],
    defaultRole: "owner",
    grantOnFirstLogin: false,
    homePath: "/compliance",
    resetPath: "/compliance/reset-password",
    legacyMounts: [],
  },
});

export const PRODUCT_SLUGS = Object.keys(PRODUCTS);

export function getProduct(slug) {
  const product = PRODUCTS[slug];
  if (!product) throw new Error(`Unknown product "${slug}"`);
  return product;
}
