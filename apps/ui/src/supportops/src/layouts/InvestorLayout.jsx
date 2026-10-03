import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import Sidebar from "../components/Sidebar.jsx";

/**
 * Role protection is handled once, at the route level:
 *   <Route element={<ProtectedRoute allowRoles={["investor", "admin"]} />}>
 * so the layout only has to lay things out.
 */
export default function InvestorLayout() {
  return (
    <>
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </>
  );
}
