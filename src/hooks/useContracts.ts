import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  contractsApi,
  type CreateContractPayload,
} from "../lib/api/contracts";
import type { AutoGenerateContractPayload } from "../types/legal-contracts";

export const contractKeys = {
  all: ["contracts"] as const,
  lists: () => [...contractKeys.all, "list"] as const,
  detail: (contractId: number | string) => [...contractKeys.all, "detail", String(contractId)] as const,
  clauses: (contractId: number | string) => [...contractKeys.detail(contractId), "clauses"] as const,
};

export function useContractsList() {
  return useQuery({
    queryKey: contractKeys.lists(),
    queryFn: contractsApi.list,
    staleTime: 30_000,
  });
}

export function useContract(contractId: number | null | undefined) {
  return useQuery({
    queryKey: contractKeys.detail(contractId ?? "pending"),
    queryFn: () => contractsApi.get(contractId as number),
    enabled: typeof contractId === "number" && Number.isFinite(contractId),
    staleTime: 15_000,
  });
}

export function useCreateContractMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateContractPayload) => contractsApi.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: contractKeys.lists() });
    },
  });
}

export function useAutoGenerateContractMutation(contractId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: AutoGenerateContractPayload) => contractsApi.autoGenerate(contractId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: contractKeys.detail(contractId) });
    },
  });
}

export function useUpdateContractClauseMutation(contractId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ clauseId, customContent }: { clauseId: string | number; customContent: string }) =>
      contractsApi.updateClause(contractId, clauseId, customContent),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: contractKeys.detail(contractId) });
      void queryClient.invalidateQueries({ queryKey: contractKeys.clauses(contractId) });
    },
  });
}

export function useGenerateContractShareLinkMutation(contractId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (expiresInHours?: number) => contractsApi.generateShareLink(contractId, expiresInHours),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: contractKeys.detail(contractId) });
    },
  });
}

export function useMarkContractPaidMutation(contractId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { note?: string; payerName?: string; payerDocument?: string; stepUpToken?: string }) => {
      const { stepUpToken, ...data } = payload;
      return contractsApi.markPaid(contractId, data, stepUpToken);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: contractKeys.detail(contractId) });
      void queryClient.invalidateQueries({ queryKey: contractKeys.lists() });
    },
  });
}

