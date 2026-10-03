// lib/api.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export interface PipelineEvent {
  pipelineId: string;
  stepId: string;
  agent: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  data?: any;
  timestamp: string;
}

// 1. Trigger compliance execution
export async function startCompliancePipeline(invoiceText: string) {
  const response = await fetch(`${API_URL}/compliance/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ invoiceText }),
  });

  if (!response.ok) {
    throw new Error(`Execution failed: ${response.statusText}`);
  }

  return (await response.json()) as { pipelineId: string; streamUrl: string };
}

// 2. Connect to real-time Server-Sent Events (SSE) stream
export function subscribeToPipelineStream(
  pipelineId: string,
  onEvent: (event: PipelineEvent) => void,
  onError?: (err: Event) => void
): () => void {
  const eventSource = new EventSource(`${API_URL}/compliance/stream/${pipelineId}`);

  eventSource.onmessage = (e) => {
    try {
      const data: PipelineEvent = JSON.parse(e.data);
      onEvent(data);
    } catch (err) {
      console.error("Failed to parse SSE payload", err);
    }
  };

  eventSource.onerror = (err) => {
    if (onError) onError(err);
    eventSource.close();
  };

  // Return unsubscribe cleanup function
  return () => {
    eventSource.close();
  };
}