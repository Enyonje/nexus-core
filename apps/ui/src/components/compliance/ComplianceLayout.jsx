import { Link, NavLink, Outlet } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { useComplianceAuth } from "../../context/ComplianceAuth.jsx";

/** Shell for every /compliance page: its own header and its own sign-in state. */
export default function ComplianceLayout() {
  const auth = useComplianceAuth();
  const link = ({ isActive }) => `rounded-lg px-3 py-1.5 text-xs font-semibold ${isActive ? "bg-emerald-300/15 text-emerald-200" : "text-slate-400 hover:text-white"}`;
  return (
    <div className="min-h-screen bg-[#04110f]">
      <header className="flex items-center justify-between border-b border-white/10 px-6 py-3">
        <Link to="/compliance" className="flex items-center gap-2 text-sm font-black text-white"><ShieldCheck className="h-5 w-5 text-emerald-300" /> Compliance <span className="hidden text-[10px] font-semibold text-slate-500 sm:inline">by Nexus Core</span></Link>
        <nav className="flex items-center gap-1" aria-label="Compliance">
          <NavLink end to="/compliance" className={link}>Workspace</NavLink>
          <NavLink to="/compliance/pricing" className={link}>Pricing</NavLink>
          {auth.isAuthenticated ? (
            <>
              <NavLink to="/compliance/billing" className={link}>Billing</NavLink>
              <button type="button" onClick={() => auth.logout({ redirectTo: "/compliance/login" })} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white">Sign out</button>
            </>
          ) : (
            <>
              <NavLink to="/compliance/login" className={link}>Sign in</NavLink>
              <NavLink to="/compliance/register" className="rounded-lg bg-emerald-300 px-3 py-1.5 text-xs font-bold text-slate-950">Get started</NavLink>
            </>
          )}
          <Link to="/agents" className="ml-2 hidden text-[11px] text-slate-500 hover:text-slate-300 md:inline">All agents ↗</Link>
        </nav>
      </header>
      <Outlet />
    </div>
  );
}
