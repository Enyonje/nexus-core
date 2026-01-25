import { useState } from "react";
import { apiFetch } from "../lib/api";
import { useToast } from "./ToastContext.jsx";
import { useAuth } from "../context/AuthProvider";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();
  const { login } = useAuth(); // use AuthProvider login

  async function handleRegister(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiFetch("/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      if (!res.token || !res.user) {
        throw new Error("Invalid registration response");
      }

      addToast("Registration successful!", "success");

      // Trigger full login flow with subscription fetch + redirect
      login({ ...res.user, token: res.token });
    } catch (err) {
      addToast(err.message || "Registration failed", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleRegister}
      className="max-w-sm mx-auto mt-16 p-6 bg-white dark:bg-gray-900 rounded shadow space-y-4"
    >
      <h2 className="text-xl font-bold mb-2">Sign Up</h2>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full p-2 border rounded"
        required
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full p-2 border rounded"
        required
      />
      <button
        type="submit"
        className="w-full bg-blue-600 text-white py-2 rounded"
        disabled={loading}
      >
        {loading ? "Signing up..." : "Sign Up"}
      </button>
    </form>
  );
}