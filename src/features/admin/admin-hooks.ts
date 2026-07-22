import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface VaultQueryResult {
  answer: string;
  citations: string[];
  confidence: 'HIGH' | 'LOW' | 'NONE';
  fallbackMessage?: string;
}

export interface VaultProposal {
  id: string;
  title: string;
  sourceFile: string;
  proposedText: string;
  justification: string;
  status: 'PENDING' | 'PROCESSED' | 'REJECTED';
  requiresVerification: boolean;
  createdAt: string;
}

// ---- RAG Query Hook ----
export function useVaultQueryMutation() {
  return useMutation({
    mutationFn: async (question: string) => {
      const res = await api.post<{ data: VaultQueryResult }>('/vault/query', { question });
      return res.data.data;
    }
  });
}

// ---- Feedback Hook ----
export function useVaultFeedbackMutation() {
  return useMutation({
    mutationFn: async ({ question, feedback }: { question?: string; feedback: string }) => {
      const res = await api.post('/vault/feedback', { question, feedback });
      return res.data;
    }
  });
}

// ---- Stats Hook ----
export function useAdminStats() {
  return useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const res = await api.get('/admin/stats');
      return res.data.data as {
        saas: { totalUsers: number; activeUsersToday: number; totalCompanies: number };
        vault: { totalChunks: number; totalSignals: number; pendingSignals: number; ragMisses: number; userCorrections: number };
      };
    }
  });
}

// ---- Proposals Hooks ----
export function usePendingProposals() {
  return useQuery({
    queryKey: ['vault-proposals', 'pending'],
    queryFn: async () => {
      const res = await api.get<{ data: VaultProposal[] }>('/vault/proposals');
      return res.data.data;
    }
  });
}

export function useApproveProposalMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/vault/proposals/${id}/approve`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vault-proposals'] });
    }
  });
}

export function useRejectProposalMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/vault/proposals/${id}/reject`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vault-proposals'] });
    }
  });
}

// ---- Users Hooks ----
export function useAdminUsers() {
  return useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const res = await api.get('/admin/users');
      return res.data.data as Array<{ id: string; email: string; name: string; role: string; createdAt: string }>;
    }
  });
}

export function useCreateAdminUserMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { email: string; password: string; name: string; role: string }) => {
      const res = await api.post('/admin/users', data);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
    }
  });
}

// ---- Nightly Pipeline Hook ----
export function useRunNightlyPipelineMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await api.post('/admin/nightly/run');
      return res.data;
    },
    // We delay the invalidation slightly to give BullMQ time to process the job
    onSuccess: () => {
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['vault-proposals', 'pending'] });
        queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      }, 5000);
    }
  });
}

// ---- RAG Chat Sessions ----
export function useVaultSessions() {
  return useQuery({
    queryKey: ['vault-sessions'],
    queryFn: async () => {
      const res = await api.get('/vault/sessions');
      return res.data.data;
    }
  });
}

export function useVaultSession(id: string | null) {
  return useQuery({
    queryKey: ['vault-sessions', id],
    queryFn: async () => {
      const res = await api.get(`/vault/sessions/${id}`);
      return res.data.data;
    },
    enabled: !!id
  });
}

export function useCreateVaultSessionMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await api.post('/vault/sessions');
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vault-sessions'] });
    }
  });
}

export function useVaultSessionQueryMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ sessionId, question }: { sessionId: string; question: string }) => {
      const res = await api.post(`/vault/sessions/${sessionId}/query`, { question });
      return res.data.data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['vault-sessions', variables.sessionId] });
      qc.invalidateQueries({ queryKey: ['vault-sessions'] });
    }
  });
}

export function useTranscribeAudioMutation() {
  return useMutation({
    mutationFn: async (audioBlob: Blob) => {
      const formData = new FormData();
      formData.append('file', audioBlob, 'audio.webm');
      const res = await api.post('/vault/transcribe', formData);
      return res.data.data;
    }
  });
}
