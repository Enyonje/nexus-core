import React from "react";
import { NAV_ITEMS, canAccess, groupForRole } from "../config/navigation"; // adjust path if needed
import { useAuth } from "../context/AuthProvider"; // assuming you have an AuthProvider

export default function Navbar() {
  const { user } = useAuth(); // get logged-in user
  const role = (user?.role || "").toLowerCase();
  const group = groupForRole(role);

  // Filter items: only show those allowed for this role and marked for navbar
  const visibleItems = NAV_ITEMS.filter(
    (item) => item.group === group && item.navbar && canAccess(item, role)
  );

  return (
    <nav className="navbar">
      <ul>
        {visibleItems.map((item) => (
          <li key={item.to}>
            <a href={item.to}>
              <item.icon className="nav-icon" />
              <span>{item.label}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
