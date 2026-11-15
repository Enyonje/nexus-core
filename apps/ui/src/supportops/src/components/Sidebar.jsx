import React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const LINKS = {
  admin: [
    ["Executive dashboard", "/supportops/admin/executive"],
    ["Analytics", "/supportops/admin/analytics"],
    ["Incidents", "/supportops/admin/incidents"],
    ["Channels", "/supportops/admin/channels"],
    ["Team", "/supportops/agent/team"],
    ["Ticket inbox", "/supportops/agent/inbox"],
    ["Live chat", "/supportops/agent/chats"],
  ],
  management: [
    ["Executive dashboard", "/supportops/admin/executive"],
    ["Analytics", "/supportops/admin/analytics"],
    ["Incidents", "/supportops/admin/incidents"],
    ["Ticket inbox", "/supportops/agent/inbox"],
    ["Live chat", "/supportops/agent/chats"],
  ],
  agent: [
    ["Dashboard", "/supportops/agent/dashboard"],
    ["Ticket inbox", "/supportops/agent/inbox"],
    ["Live chat", "/supportops/agent/chats"],
  ],
  investor: [["Investor overview", "/supportops/investor"]],
};

export default function Sidebar() {
  const { user } = useAuth();
  const role = user?.role || "guest";
  const links = LINKS[role] || [];

  return (
    <aside className="w-64 bg-slate-900 text-white min-h-screen p-4 flex flex-col">
      <div className="text-xl font-bold mb-6">SupportOps</div>
      <nav className="space-y-2" aria-label="SupportOps navigation">
        {links.map(([label, to]) => (
          <NavLink key={to} to={to} className={({ isActive }) => `block py-2 px-3 rounded ${isActive ? "bg-cyan-600/20 text-cyan-300" : "hover:bg-slate-800"}`}>
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto pt-4 border-t border-slate-800">
        <p className="text-sm font-medium">{user?.name || user?.email || "Signed-in user"}</p>
        <p className="text-xs text-slate-400 capitalize">{role}</p>
      </div>
    </aside>
  );
}
