// supportops/src/pages/JoinPage.jsx  Where an invitation link lands: /supportops/join?token=...
// Replaces the old AuthPage role picker. Nobody chooses their own role: it comes from the invitation.
import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Users } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { rememberReturn } from "../components/Access";
import { ROUTES, SUPPORTOPS_API, homeForRole } from "../config/paths";

const LABEL = { agent: "Agent", management: "Management", investor: "Investor" };

export default function JoinPage() {
    const [params] = useSearchParams();
    const token = params.get("token") ?? "";
    const navigate = useNavigate();
    const { user, isAuth, logout } = useAuth();
    const [invite, setInvite] = useState(null);
    const [problem, setProblem] = useState(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!token) { setProblem("This invitation link is incomplete."); return; }
        fetch(SUPPORTOPS_API.invites(`/preview/${encodeURIComponent(token)}`))
            .then(async (r) => { const d = await r.json().catch(() => null); if (!r.ok) throw new Error(d?.message || "This invitation is not valid."); setInvite(d); })
            .catch((e) => setProblem(e.message));
    }, [token]);

    const here = `/supportops/join?token=${encodeURIComponent(token)}`;
    const go = (to) => { rememberReturn(here); navigate(to); };
    const mismatch = isAuth && invite && user?.email?.toLowerCase() !== invite.email.toLowerCase();

    async function accept() {
        setBusy(true);
        try {
            const authToken = localStorage.getItem("authToken");
            const res = await fetch(SUPPORTOPS_API.invites("/accept"), { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` }, body: JSON.stringify({ token }) });
            const d = await res.json().catch(() => null);
            if (!res.ok) throw new Error(d?.message || "Could not accept the invitation");
            localStorage.setItem("activeOrgId", d.orgId);          // work inside the inviting workspace
            window.location.assign(homeForRole(d.role));            // full reload so the new workspace loads cleanly
        } catch (e) { toast.error(e.message); setBusy(false); }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#020617] px-6">
            <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur-xl">
                <Users className="h-10 w-10 mx-auto mb-3 text-cyan-400" />
                {problem ? (
                    <><h1 className="text-xl font-bold text-white">Invitation problem</h1><p className="mt-2 text-sm text-slate-400">{problem}</p></>
                ) : !invite ? <p className="text-sm text-slate-400">Checking your invitation…</p> : (
                    <>
                        <h1 className="text-xl font-bold text-white">Join {invite.orgName}</h1>
                        <p className="mt-2 text-sm text-slate-400">You've been invited as <strong className="text-slate-200">{LABEL[invite.role] ?? invite.role}</strong> ({invite.email}).</p>
                        {!isAuth ? (
                            <div className="mt-6 space-y-3">
                                <button type="button" onClick={() => go(ROUTES.signup)} className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-sm font-semibold text-white">Create an account with {invite.email}</button>
                                <button type="button" onClick={() => go(ROUTES.login)} className="w-full py-3 rounded-lg border border-slate-700 text-sm text-slate-200 hover:bg-white/5">I already have an account</button>
                            </div>
                        ) : mismatch ? (
                            <div className="mt-6 space-y-3">
                                <p className="text-sm text-amber-300">You're signed in as {user.email}, but this invitation is for {invite.email}.</p>
                                <button type="button" onClick={() => { rememberReturn(here); logout(false); navigate(ROUTES.login); }} className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-sm font-semibold text-white">Log out and use {invite.email}</button>
                            </div>
                        ) : (
                            <button type="button" onClick={accept} disabled={busy} className="mt-6 w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Joining…" : "Accept invitation"}</button>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}