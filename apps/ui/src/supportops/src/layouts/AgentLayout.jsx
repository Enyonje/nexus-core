// src/layouts/AgentLayout.jsx
import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import Sidebar from "../components/Sidebar.jsx";
import { RequireRole } from "../components/RoleGuard.jsx";

export default function AgentLayout() {
  return (
    <RequireRole roles={["agent"]}>
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </RequireRole>
  );
}