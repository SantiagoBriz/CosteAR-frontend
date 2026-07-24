import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface EmpresaConnection {
  id: string;
  companyId: string;
  costistId: string;
  apiKey: string;
  whatsappPhoneNumber: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  company: {
    id: string;
    name: string;
    industry: string | null;
    cuit: string | null;
  };
  _count: {
    dataEntries: number;
  };
}

export function useEmpresaConnections() {
  return useQuery({
    queryKey: ['empresa-connections'],
    queryFn: async () => {
      const res = await api.get<{ data: EmpresaConnection[] }>('/conexiones');
      return res.data.data;
    },
  });
}
