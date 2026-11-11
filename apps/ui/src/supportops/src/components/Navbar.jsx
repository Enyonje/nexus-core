import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, LogOut, User, LayoutDashboard, Sparkles } from 'lucide-react';

// Import dedicated SupportOps auth hook
import { useAuth } from '../context/AuthProvider';

// Safe Auth hook resolver to guarantee zero crashes
function useSafeNavbarAuth() {
  try {
    if (typeof useAuth === 'function') {
      const auth = useAuth();
      if (auth) return auth;
    }
  } catch (e) {
    // Fall through
  }

  // Fail-safe fallback checking local storage
  const token = typeof window !== 'undefined' ? localStorage.getItem('supportops_token') : null;
  return {
    user: token ? { name: 'Super Admin', email: 'admin@company.com', role: 'Super Admin' } : null,
    isAuthenticated: !!token,
    logout: () => {
      localStorage.removeItem('supportops_token');
      window.location.assign('/supportops/login');
    },
  };
}

export default function Navbar() {
  const { user, isAuthenticated, logout } = useSafeNavbarAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    if (typeof logout === 'function') {
      logout();
    } else {
      localStorage.removeItem('supportops_token');
      window.location.assign('/supportops/login');
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">

        {/* Brand Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-500/10">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <Link to="/supportops/admin/executive" className="font-bold text-white tracking-wide flex items-center gap-2">
              SupportOps <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-medium">Autonomous Triage</span>
            </Link>
          </div>
        </div>

        {/* Navigation & User Actions */}
        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl">
                <div className="h-7 w-7 rounded-lg bg-cyan-600/20 flex items-center justify-center text-cyan-400 font-semibold text-xs">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
                </div>
                <div className="text-xs text-left">
                  <div className="font-medium text-white">{user?.name || 'Workspace Admin'}</div>
                  <div className="text-slate-400">{user?.role || 'Super Admin'}</div>
                </div>
              </div>

              <button
                onClick={() => navigate('/supportops/admin/executive')}
                className="hidden md:flex items-center gap-1.5 text-xs font-medium text-slate-300 hover:text-white px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition-colors"
              >
                <LayoutDashboard className="h-4 w-4 text-cyan-400" />
                <span>Dashboard</span>
              </button>

              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 text-xs font-semibold text-red-400 hover:text-red-300 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-xl transition-colors"
                title="Sign Out"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                to="/supportops/pricing"
                className="text-xs font-medium text-slate-300 hover:text-white px-3 py-2"
              >
                Pricing Plans
              </Link>
              <Link
                to="/supportops/login"
                className="text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-xl shadow-lg shadow-cyan-600/20 transition-colors"
              >
                Sign In
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}