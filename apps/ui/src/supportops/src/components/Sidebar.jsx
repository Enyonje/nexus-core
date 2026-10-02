// src/components/Sidebar.jsx
import { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  Zap,
  Ticket,
  BarChart3,
  Bot,
  Brain,
  ShieldAlert,
  CreditCard,
  LineChart,
  Users,
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext"; // ✅ bring in user role

const links = [
  { to: "/dashboard", icon: BarChart3, label: "Dashboard" },
  { to: "/analytics", icon: LineChart, label: "Analytics" },
  { to: "/brain", icon: Brain, label: "Autonomous Brain" },
  { to: "/admin/analytics", icon: CreditCard, label: "Admin Analytics", role: "admin" },
  { to: "/executive", icon: ShieldAlert, label: "Executive", role: "admin" },
  { to: "/investor", icon: Users, label: "Investor Mode", role: "investor" },
  { to: "/ai-review", icon: Bot, label: "AI Review" },
  { to: "/tickets", icon: Ticket, label: "Ticket Inbox" },
];

export default function Sidebar() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth() || {};

  return (
    <>
      {/* Mobile Toggle */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white/10 backdrop-blur"
        onClick={() => setOpen(true)}
      >
        <Menu />
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:static z-50 top-0 left-0 h-full w-72 bg-[#020617] border-r border-white/10 p-6 transform transition-transform duration-300
        ${open ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
      >
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <Zap className="text-blue-500" />
            <span className="font-black text-xl">SupportOps</span>
          </div>
          <button className="md:hidden" onClick={() => setOpen(false)}>
            <X />
          </button>
        </div>

        <nav className="space-y-1">
          {links
            .filter(
              ({ role }) =>
                !role || (user?.role && user.role.toLowerCase() === role.toLowerCase())
            )
            .map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg transition text-sm ${isActive
                    ? "bg-blue-600 text-white shadow-md"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                  }`
                }
                onClick={() => setOpen(false)}
              >
                <Icon size={18} />
                {label}
              </NavLink>
            ))}
        </nav>
      </aside>
    </>
  );
}