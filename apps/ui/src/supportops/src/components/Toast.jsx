import { useState, useEffect } from "react";
export function useToast() {
  const [msg, setMsg] = useState(null);
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 3000);
    return () => clearTimeout(t);
  }, [msg]);
  const Toast = msg ? (
    <div className="fixed bottom-4 right-4 card px-4 py-2 text-sm">{msg}</div>
  ) : null;
  return { Toast, setMsg };
}