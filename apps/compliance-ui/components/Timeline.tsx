// components/Timeline.tsx
export default function Timeline({ steps }: any) {
  return (
    <div className="bg-white p-4 rounded shadow">
      {steps.map((step: any, i: number) => (
        <div key={i} className="flex items-center gap-4 mb-4">
          <div className={`w-3 h-3 rounded-full ${
            step.status === 'done' ? 'bg-success' :
            step.status === 'processing' ? 'bg-warning' : 'bg-gray-300'
          }`} />
          <p>{step.label}</p>
        </div>
      ))}
    </div>
  );
}