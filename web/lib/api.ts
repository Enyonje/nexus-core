export async function submitGoal(payload: any) {
  await fetch("/api/goals", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}
