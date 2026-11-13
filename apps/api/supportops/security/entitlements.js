// Canonical SupportOps authorization adapter.
// All tenant membership, app-role and subscription checks live in one place.
export {
    AccessError,
    invalidateSubscription,
    guard,
    getAccess,
    subscriptionUsable,
} from "../../src/routes/entitlements.js";
