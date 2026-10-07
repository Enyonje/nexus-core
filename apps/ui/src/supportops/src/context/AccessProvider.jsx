// src/context/AccessProvider.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from "../lib/api";

export const AccessContext = createContext(null);

export function AccessProvider({ children }) {
    const [activeOrgId, setActiveOrgId] = useState(null);
    const [orgs, setOrgs] = useState([]);
    const [apps, setApps] = useState({});
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(async (signal) => {
        const token = localStorage.getItem("access_token") || localStorage.getItem("authToken");

        if (!token || token === "undefined" || token === "null") {
            setOrgs([]);
            setActiveOrgId(null);
            setApps({});
            setLoading(false);
            return;
        }

        try {
            // Corrected endpoint route: /auth/me instead of /v1/auth/me
            const res = await api.get("/auth/me", { signal });
            const data = res.data;

            if (data) {
                setOrgs(data.orgs || []);
                setActiveOrgId(data.activeOrgId || data.orgs?.[0]?.id || null);
                setApps(data.apps || {});
            }
        } catch (err) {
            if (err.name === "CanceledError" || err.code === "ERR_CANCELED") {
                return;
            }
            console.warn("Could not load workspace context:", err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        refresh(controller.signal);

        return () => {
            controller.abort();
        };
    }, [refresh]);

    const switchOrg = (orgId) => {
        setActiveOrgId(orgId);
    };

    return (
        <AccessContext.Provider
            value={{
                activeOrgId,
                setActiveOrgId,
                orgs,
                apps,
                loading,
                refresh,
                switchOrg,
            }}
        >
            {children}
        </AccessContext.Provider>
    );
}

export function useApp(appName) {
    const context = useContext(AccessContext);
    if (!context) {
        return { plan: "free", status: "inactive", subscribed: false };
    }
    return context.apps?.[appName] || { plan: "free", status: "inactive", subscribed: false };
}