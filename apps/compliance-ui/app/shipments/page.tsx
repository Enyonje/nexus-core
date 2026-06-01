'use client';

import { useEffect, useState } from 'react';
import ShipmentTable from '@/components/ShipmentTable';

type Shipment = {
  id: string;
  origin: string;
  destination: string;
  status: 'success' | 'processing' | 'error';
  time: string;
};

export default function ShipmentsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchShipments() {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/shipments`, {
          cache: 'no-store',
        });
        if (!res.ok) throw new Error('Failed to fetch shipments');
        const data = await res.json();
        setShipments(Array.isArray(data) ? data : []);
      } catch (err: any) {
        setError(err.message || 'Unknown error');
        setShipments([]);
      } finally {
        setLoading(false);
      }
    }
    fetchShipments();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded shadow p-6 text-center">
        <div className="flex items-center justify-center space-x-2 text-slate-500">
          <span className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></span>
          <span className="text-sm">Loading shipments...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded shadow p-6 text-center text-red-500 text-sm">
        {error}
      </div>
    );
  }

  if (!shipments.length) {
    return (
      <div className="bg-white rounded shadow p-6 text-center text-slate-500 text-sm">
        No shipments available.
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Shipments</h1>
      <ShipmentTable shipments={shipments} />
    </div>
  );
}
