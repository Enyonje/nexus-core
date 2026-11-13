// One auth instance per product. Import the hook for the product a page belongs to.
import { createProductAuth } from "./createProductAuth.jsx";

export const nexusCoreAuth = createProductAuth("nexus-core");
export const complianceAuth = createProductAuth("compliance");
