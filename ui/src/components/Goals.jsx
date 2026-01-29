import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import { useToast } from "./ToastContext.jsx";

export default function Goals() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [goalType, setGoalType] = useState("");

  const { addToast } = useToast();

  async function loadGoals() {
    try {
      const data = await apiFetch("/goals");
      setGoals(data || []);
    } catch (err) {
      addToast("Failed to load goals", "error");
    } finally {
      setLoading(false);
    }
  }

  async function createGoal() {
    if (!goalType) {
      addToast("Select a goal type", "error");
      return;
    }

    try {
      setCreating(true);
      const newGoal = await apiFetch("/goals", {
        method: "POST",
        body: JSON.stringify({ goal_type: goalType }),
      });

      setGoals((prev) => [newGoal, ...prev]);
      setGoalType("");
      addToast("Goal created", "success");
    } catch (err) {
      addToast(err.message || "Goal limit reached", "error");
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return <div className="p-6">Loading goals…</div>;
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h2 className="text-xl font-bold mb-4">Goals</h2>

      {/* Create goal */}
      <div className="flex gap-2 mb-6">
        <input
          className="border px-3 py-2 rounded w-full"
          placeholder="Goal type (e.g. research, scrape, analyze)"
          value={goalType}
          onChange={(e) => setGoalType(e.target.value)}
        />
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
          disabled={creating}
          onClick={createGoal}
        >
          Create
        </button>
      </div>

      {/* Goal list */}
      {goals.length === 0 ? (
        <div className="text-gray-500">No goals yet</div>
      ) : (
        <ul className="space-y-3">
          {goals.map((g) => (
            <li
              key={g.id}
              className="border rounded p-4 flex justify-between"
            >
              <div>
                <div className="font-semibold capitalize">
                  {g.goal_type}
                </div>
                <div className="text-sm text-gray-500">
                  Created {new Date(g.created_at).toLocaleString()}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
