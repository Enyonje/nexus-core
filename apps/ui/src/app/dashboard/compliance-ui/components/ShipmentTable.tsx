'use client';

import { useEffect, useState } from 'react';

type Shipment = {
  id: string;
  origin: string;
  destination: string;
  status: 'success' | 'processing' | 'error';
  time: string;
};

type ShipmentTableProps = {
  shipments?: Shipment[]; // optional initial data
};

const PAGE_SIZE = 10;

function ShipmentSkeleton() {
  return (
    <div className="border border-gray-200 bg-gray-100 rounded-lg p-4 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 bg-gray-300 rounded" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-32 bg-gray-300 rounded" />
          <div className="h-4 w-48 bg-gray-300 rounded" />
        </div>
      </div>
    </div>
  );
}

export default function ShipmentTable({ shipments = [] }: ShipmentTableProps) {
  const [liveShipments, setLiveShipments] = useState<Shipment[]>(shipments);
  const [loading, setLoading] = useState(shipments.length === 0);
  const [currentPage, setCurrentPage] = useState(1);

  // Debounced search state
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | Shipment['status']>('all');

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    const eventSource = new EventSource(`${process.env.NEXT_PUBLIC_API_URL}/shipments/stream`);

    eventSource.onmessage = (e) => {
      try {
        const event: Shipment = JSON.parse(e.data);

        setLiveShipments((prev) => {
          const idx = prev.findIndex((s) => s.id === event.id);
          let updated;
          if (idx !== -1) {
            updated = [...prev];
            updated[idx] = event;
          } else {
            updated = [...prev, event];
          }
          return updated.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
        });

        setLoading(false);
      } catch (err) {
        console.error('Failed to parse SSE event', err);
      }
    };

    eventSource.onerror = (err) => {
      console.error('SSE connection error:', err);
      eventSource.close();
    };

    return () => eventSource.close();
  }, []);

  const statusClass = (status: Shipment['status']) => {
    switch (status) {
      case 'success': return 'bg-emerald-500';
      case 'processing': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const filteredShipments = liveShipments.filter((s) => {
    const term = debouncedSearch.toLowerCase();
    const matchesSearch =
      s.id.toLowerCase().includes(term) ||
      s.origin.toLowerCase().includes(term) ||
      s.destination.toLowerCase().includes(term) ||
      s.status.toLowerCase().includes(term);
    const matchesStatus = statusFilter === 'all' ? true : s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredShipments.length / PAGE_SIZE);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const currentShipments = filteredShipments.slice(startIndex, startIndex + PAGE_SIZE);

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => <ShipmentSkeleton key={i} />)}
      </div>
    );
  }

  if (!liveShipments.length) {
    return (
      <div className="bg-white rounded shadow p-6 text-center text-slate-500 text-sm">
        No shipments available.
      </div>
    );
  }

  return (
    <div className="bg-white rounded shadow overflow-x-auto">
      {/* Search + Filter */}
      <div className="p-4 border-b bg-gray-50 flex flex-col md:flex-row gap-3 md:gap-6 items-center justify-between">
        <input
          type="text"
          placeholder="Search by ID, route, or status..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full md:w-1/2 px-3 py-2 border border-gray-300 rounded text-sm"
        />
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as any); setCurrentPage(1); }}
          className="px-3 py-2 border border-gray-300 rounded text-sm"
        >
          <option value="all">All Statuses</option>
          <option value="success">Success</option>
          <option value="processing">Processing</option>
          <option value="error">Error</option>
        </select>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left bg-gray-50">
            <th className="p-3">ID</th>
            <th className="p-3">Route</th>
            <th className="p-3">Status</th>
            <th className="p-3">Time</th>
          </tr>
        </thead>
        <tbody>
          {currentShipments.map((s) => (
            <tr key={s.id} className="border-t">
              <td className="p-3">{s.id}</td>
              <td className="p-3">{s.origin} → {s.destination}</td>
              <td className="p-3">
                <span className={`px-2 py-1 rounded text-white text-xs font-bold uppercase ${statusClass(s.status)}`}>
                  {s.status}
                </span>
              </td>
              <td className="p-3">{s.time}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination */}
      <div className="flex justify-between items-center px-4 py-3 border-t bg-gray-50">
        <button disabled={currentPage === 1} onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
          className={`px-3 py-1 rounded text-xs font-bold uppercase ${
            currentPage === 1 ? 'bg-gray-200 text-gray-500' : 'bg-blue-600 text-white'
          }`}>
          Previous
        </button>
        <span className="text-sm text-slate-600">Page {currentPage} of {totalPages}</span>
        <button disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
          className={`px-3 py-1 rounded text-xs font-bold uppercase ${
            currentPage === totalPages ? 'bg-gray-200 text-gray-500' : 'bg-blue-600 text-white'
          }`}>
          Next
        </button>
      </div>
    </div>
  );
}
