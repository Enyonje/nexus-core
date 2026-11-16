# Nexus Core Business Ecosystem – Implementation Notes

## Updated files
- `apps/ui/src/components/LandingPage.jsx` – repositions the public homepage around Grow, Sell, Serve and Operate.
- `apps/ui/src/components/Layout.jsx` – replaces generic technical navigation with business-department navigation and a workspace identity panel.
- `apps/ui/src/components/Dashboard.jsx` – introduces the business overview, business profile onboarding, department cards, AI workforce entry points and setup checklist. Existing goals/executions/health data are fetched from the existing API; no fake business metrics are generated.
- `apps/ui/index.html` – updates homepage title, description, Open Graph, Twitter and SoftwareApplication messaging.

## Business profile storage
The initial profile (business name, industry, team size, website and goals) is saved in browser localStorage under `nexus_business_profile`. This avoids changing the existing API/database schema or disturbing the separate product authentication boundaries. A later backend phase should persist this profile against the authenticated Nexus organization so it follows the user across devices and team members.

## Preserved boundaries
- Existing Nexus Core authentication and protected routes remain in place.
- SupportOps remains on its existing `/supportops` route and retains its own application/authentication boundary.
- Sales Assistant AI remains an independent application; this change does not embed its backend or authentication into Nexus Core.
- Existing goals, execution, billing, compliance and marketplace routes remain in place.

## Validation
- JSX/TSX syntax transpilation passed for all three updated React components using the installed TypeScript compiler.
- A full Vite production build could not be run in this environment because `npm ci` timed out while attempting dependency installation. Run `npm ci` in `apps/ui`, then `npm run build` to complete production validation.
