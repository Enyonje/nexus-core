// components/Header.tsx
'use client';

export default function Header() {
  return (
    <header className="bg-white shadow px-6 py-4 flex justify-between">
      <h1 className="font-semibold">Command Center</h1>
      <button className="bg-accent text-white px-4 py-2 rounded">
        + New Shipment
      </button>
    </header>
  );
}