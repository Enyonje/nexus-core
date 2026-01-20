import { submitGoal } from "@/lib/api";

export default function NewGoal() {
  async function action() {
    await submitGoal({
      goal_type: "fintech_onboarding",
      goal_payload: { client: { name: "Demo Co" } }
    });
  }

  return <button onClick={action}>Submit Goal</button>;
}
