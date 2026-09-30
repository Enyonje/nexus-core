// src/hooks/useAuth.js (or .ts if using TypeScript)
import { useContext } from "react";
import { AuthContext } from "../context/AuthProvider.jsx";

export default function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }

    return context;
}
