// hooks/useShipments.ts
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useShipments() {
  return useQuery({
    queryKey: ['shipments'],
    queryFn: async () => {
      const res = await api.get('/shipments');
      return res.data;
    }
  });
}