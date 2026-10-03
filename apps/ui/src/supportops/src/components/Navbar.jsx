// supportops/src/components/Navbar.jsx
import React from "react";

export default function Navbar() {
  const user = { name: "Agent User", role: "Agent" };

  return (
    <nav className="flex items-center justify-between p-4 bg-gray-900 text-white">
      <div className="font-bold text-lg">SupportOps</div>
      <div className="flex items-center gap-4 text-sm text-gray-300">
        <span>{user.name}</span>
        <span className="px-2 py-0.5 rounded bg-gray-800 text-xs font-mono">
          {user.role}
        </span>
      </div>
    </nav>
  );
}