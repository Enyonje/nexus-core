'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Search,
  Filter,
  Plus,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  Clock,
  FileText,
  ChevronRight,
  X,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';

export type Shipment = {
  id: string;
  origin: string;
  destination: string;
  status: 'success' | 'processing' | 'error' | string;
  time?: string;
  trackingNumber?: string;
  exporter?: string;
  importer?: string;
  hsCode?: string;
  declaredValue?: number;
  currency?: string;
};

export default function ShipmentsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);

  const fetchShipments = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
      const res = await fetch(`${baseUrl}/api/shipments`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });

      if (!res.ok) {
        throw new Error(`Gateway returned status HTTP ${res.status}`);
      }

      const data = await res.json();
      const rawList = Array.isArray(data) ? data : [];

      // Normalize real database payloads into uniform UI structure
      const normalizedList: Shipment[] = rawList.map((item: any) => ({
        id: item.id || item._id || 'N/A',
        origin: item.origin || item.originCountry || 'Unspecified Origin',
        destination: item.destination || item.destinationCountry || 'Unspecified Destination',
        status: (item.status || 'processing').toLowerCase(),
        time: item.time || item.updatedAt || item.createdAt || new Date().toISOString(),
        trackingNumber: item.trackingNumber || item.trackingId || item.id,
        exporter: item.exporter || item.exporterName || 'Unspecified Exporter',
        importer: item.importer || item.importerName || 'Unspecified Importer',
        hsCode: item.hsCode || item.hscode || 'N/A',
        declaredValue: typeof item.declaredValue === 'number' ? item.declaredValue : 0,
        currency: item.currency || 'USD',
      }));

      setShipments(normalizedList);
    } catch (err: any) {
      setError(err.message || 'Unable to connect to the compliance gateway API.');
      setShipments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchShipments();
  }, [fetchShipments]);

  const filteredShipments = shipments.filter((item) => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      item.id.toLowerCase().includes(query) ||
      item.origin.toLowerCase().includes(query) ||
      item.destination.toLowerCase().includes(query) ||
      (item.hsCode && item.hsCode.toLowerCase().includes(query)) ||
      (item.trackingNumber && item.trackingNumber.toLowerCase().includes(query));

    const matchesStatus =
      selectedStatus === 'ALL' || item.status === selectedStatus.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            Cross-Border Shipments
            <span className="px-2.5 py-0.5 text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full">
              Production Gateway
            </span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Real-time compliance tracking, trade lane manifests, and automated HS classification.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchShipments}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-300 bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-400' : ''}`} />
            Refresh Data
          </button>
          <button className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-lg shadow-blue-600/20 transition-all">
            <Plus className="w-4 h-4" />
            New Declaration
          </button>
        </div>
      </div>

      {/* Real-time Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Manifests"
          value={shipments.length.toString()}
          subtitle="Records in production database"
          icon={<FileText className="w-5 h-5 text-blue-400" />}
        />
        <MetricCard
          title="Verified & Cleared"
          value={shipments.filter((s) => s.status === 'success' || s.status === 'verified').length.toString()}
          subtitle="Passed compliance checks"
          icon={<ShieldCheck className="w-5 h-5 text-emerald-400" />}
        />
        <MetricCard
          title="Processing Queue"
          value={shipments.filter((s) => s.status === 'processing').length.toString()}
          subtitle="Awaiting agentic audit"
          icon={<Clock className="w-5 h-5 text-amber-400" />}
        />
        <MetricCard
          title="Flagged / High Risk"
          value={shipments.filter((s) => s.status === 'error' || s.status === 'flagged').length.toString()}
          subtitle="Requires customs resolution"
          icon={<AlertTriangle className="w-5 h-5 text-rose-400" />}
        />
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search Manifest ID, HS Code, Origin..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          <Filter className="w-4 h-4 text-slate-400 mr-1 hidden sm:block" />
          {['ALL', 'SUCCESS', 'PROCESSING', 'ERROR'].map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${selectedStatus === st
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                : 'bg-slate-950 text-slate-400 border border-slate-800 hover:bg-slate-900'
                }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Production State Handling */}
      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>Failed to load shipments: {error}</span>
          </div>
          <button onClick={fetchShipments} className="underline hover:text-white ml-4">Retry</button>
        </div>
      )}

      {loading ? (
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-12 text-center">
          <div className="inline-flex items-center space-x-3 text-slate-400">
            <span className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></span>
            <span className="text-sm">Connecting to compliance network...</span>
          </div>
        </div>
      ) : (
        <ProductionShipmentTable
          shipments={filteredShipments}
          onSelect={(shipment) => setSelectedShipment(shipment)}
        />
      )}

      {/* Shipment Inspection Modal */}
      {selectedShipment && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-lg bg-[#020617] border-l border-slate-800 h-full p-6 overflow-y-auto space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  Shipment Inspection Node
                  <span className="font-mono text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                    {selectedShipment.id}
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Live Audit Report & Tariff Analysis
                </p>
              </div>
              <button
                onClick={() => setSelectedShipment(null)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-3">
                <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Route Overview
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block">Origin Port</span>
                    <span className="font-medium text-slate-200">{selectedShipment.origin}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Destination Port</span>
                    <span className="font-medium text-slate-200">{selectedShipment.destination}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">HS Code</span>
                    <span className="font-mono text-slate-200">{selectedShipment.hsCode}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Declared Value</span>
                    <span className="font-mono text-slate-200">${selectedShipment.declaredValue?.toLocaleString()} {selectedShipment.currency}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-3">
                <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Trader Information
                </div>
                <div className="text-xs space-y-2">
                  <div>
                    <span className="text-slate-500 block">Exporter</span>
                    <span className="text-slate-200">{selectedShipment.exporter}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Importer</span>
                    <span className="text-slate-200">{selectedShipment.importer}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex gap-3">
              <button className="flex-1 py-2.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg flex items-center justify-center gap-2">
                Export Certificate Payload
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProductionShipmentTable({
  shipments,
  onSelect,
}: {
  shipments: Shipment[];
  onSelect: (shipment: Shipment) => void;
}) {
  if (shipments.length === 0) {
    return (
      <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-12 text-center text-slate-400 text-sm">
        No shipments registered in the system.
      </div>
    );
  }

  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden backdrop-blur-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-950/80 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
            <tr>
              <th className="px-6 py-4">Shipment ID</th>
              <th className="px-6 py-4">Trade Lane</th>
              <th className="px-6 py-4">HS Classification</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Timestamp</th>
              <th className="px-6 py-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {shipments.map((shipment) => (
              <tr
                key={shipment.id}
                onClick={() => onSelect(shipment)}
                className="hover:bg-slate-800/30 transition-colors cursor-pointer"
              >
                <td className="px-6 py-4 font-mono font-medium text-blue-400">
                  {shipment.id}
                  {shipment.trackingNumber && shipment.trackingNumber !== shipment.id && (
                    <div className="text-xs text-slate-500 font-sans">{shipment.trackingNumber}</div>
                  )}
                </td>
                <td className="px-6 py-4 font-medium text-slate-200">
                  {shipment.origin} ➔ {shipment.destination}
                </td>
                <td className="px-6 py-4 font-mono text-xs text-slate-300">
                  <span className="bg-slate-800/80 border border-slate-700/50 px-2 py-1 rounded">
                    {shipment.hsCode || 'N/A'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <StatusBadge status={shipment.status} />
                </td>
                <td className="px-6 py-4 text-xs text-slate-400">{shipment.time || '—'}</td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(shipment);
                    }}
                    className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-white transition-colors"
                  >
                    Details
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="p-4 bg-slate-900/40 border border-slate-800/80 rounded-xl space-y-2 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-400">{title}</span>
        {icon}
      </div>
      <div className="text-2xl font-bold font-mono text-white tracking-tight">{value}</div>
      <p className="text-xs text-slate-500">{subtitle}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  if (s === 'success' || s === 'verified' || s === 'compliance_verified') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        <ShieldCheck className="w-3 h-3" />
        Verified
      </span>
    );
  }
  if (s === 'error' || s === 'flagged') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
        <AlertTriangle className="w-3 h-3" />
        Flagged
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
      <Clock className="w-3 h-3" />
      Processing
    </span>
  );
}