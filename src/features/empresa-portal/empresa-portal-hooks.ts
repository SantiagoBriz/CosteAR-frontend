import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface Operator {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  createdAt: string;
}

export interface GeneratedAccess {
  email: string;
  tempPassword: string;
  operatorId: string;
}

export function useOperators(companyId: string) {
  return useQuery({
    queryKey: ['operators', companyId],
    queryFn: async () => {
      const res = await api.get<{ data: Operator[] }>(`/empresa-portal/${companyId}/operators`);
      return res.data.data;
    },
    enabled: !!companyId,
  });
}

export function useGenerateOperatorAccess(companyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ operatorName, operatorEmail }: { operatorName: string; operatorEmail: string }) => {
      const res = await api.post<{ data: GeneratedAccess }>(
        `/empresa-portal/${companyId}/operators`,
        { operatorName, operatorEmail },
      );
      return res.data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['operators', companyId] }),
  });
}

export function useRevokeOperator() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (operatorId: string) => {
      await api.delete(`/empresa-portal/operators/${operatorId}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['operators'] }),
  });
}
