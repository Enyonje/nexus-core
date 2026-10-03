import { useEffect, useState } from "react";
import api from "../lib/api";
import { Wand2, PlusCircle } from "lucide-react";

export default function Playbooks() {
  const [playbooks, setPlaybooks] = useState([]);

  useEffect(() => {
    api
      .get("/playbooks")
      .then((res) => setPlaybooks(res.data))
      .catch((err) => console.error("Failed to load playbooks", err));
  }, []);

  return (
    <div className="space-y-10 p-8 text-white">
      {/* Header */}
      <header className="flex justify-between items-center border-b border-white/10 pb-4">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
          AI Playbooks
        </h1>
        <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-5 py-3 rounded-xl font-semibold transition">
          <PlusCircle size={18} /> New Playbook
        </button>
      </header>

      {/* Playbook grid */}
      {playbooks.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center text-gray-400">
          No playbooks available. Create one to get started.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-8">
          {playbooks.map((p) => (
            <div
              key={p.id}
              className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4 hover:bg-white/10 transition"
            >
              <div className="flex items-center gap-2">
                <Wand2 className="text-blue-500" />
                <h2 className="font-semibold text-lg text-white">{p.name}</h2>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">
                {p.description}
              </p>
              <span
                className={`text-xs uppercase tracking-widest font-bold ${
                  p.enabled ? "text-green-400" : "text-slate-500"
                }`}
              >
                {p.enabled ? "Active" : "Disabled"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}