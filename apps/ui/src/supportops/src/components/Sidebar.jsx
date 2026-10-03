// supportops/src/components/Sidebar.jsx (or path where your Sidebar lives)
import React from "react";
import { Link, NavLink } from "react-router-dom";

export default function Sidebar() {
  // Hardcoded fallback values replacing `const { user, role, logout } = useAuth();`
  const user = { name: "Agent User", role: "agent" };
  const role = "agent";
  const logout = () => { };

  return (
    <aside className="w-64 bg-slate-900 text-white min-h-screen p-4 flex flex-col justify-between">
      <div>
        <div className="text-xl font-bold mb-6">SupportOps</div>
        <nav className="space-y-2">
          <NavLink to="/supportops/agent/dashboard" className="block py-2 px-3 rounded hover:bg-slate-800">
            Dashboard
          </NavLink>
          <NavLink to="/supportops/agent/inbox" className="block py-2 px-3 rounded hover:bg-slate-800">
            AI Inbox
          </NavLink>
          <NavLink to="/supportops/agent/analytics" className="block py-2 px-3 rounded hover:bg-slate-800">
            Analytics
          </NavLink>
          <NavLink to="/supportops/agent/brain" className="block py-2 px-3 rounded hover:bg-slate-800">
            Autonomous Brain
          </NavLink>
        </nav>
      </div>

      <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">{user.name}</p>
          <p className="text-xs text-slate-400 capitalize">{role}</p>
        </div>
      </div>
    </aside>
  );
}