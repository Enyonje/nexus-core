import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { homeForRole } from "../config/paths";

export default function SuccessPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleContinue = () => {
    navigate(homeForRole(user?.role));
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
      <h1 className="text-3xl font-bold mb-6">🎉 Welcome back!</h1>
      <p className="mb-8">Your SupportOps journey continues here.</p>
      <button
        onClick={handleContinue}
        className="px-6 py-3 rounded-lg bg-white text-blue-600 font-semibold hover:bg-slate-100 transition"
      >
        Continue
      </button>
    </div>
  );
}
