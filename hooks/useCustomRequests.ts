import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'
import type { CustomRequest } from '@/lib/types'

export function useCustomRequests() {
  return useQuery<CustomRequest[]>({
    queryKey: queryKeys.customRequests(),
    queryFn: async () => {
      const response = await api.get('/custom-requests')
      return response.data.data
    },
    staleTime: 2 * 60 * 1000,
  })
}

export function useCustomRequestDetail(id: string) {
  return useQuery<CustomRequest>({
    queryKey: queryKeys.customRequestDetail(id),
    queryFn: async () => {
      const response = await api.get(`/custom-requests/${id}`)
      return response.data.data
    },
    staleTime: 2 * 60 * 1000,
    enabled: !!id,
  })
}

export function useAcceptQuotation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (quotationId: string) => {
      const response = await api.post(`/quotations/${quotationId}/accept`)
      return response.data.data
    },
    onSuccess: (_, quotationId) => {
      // Invalidate both lists and detail query
      queryClient.invalidateQueries({ queryKey: queryKeys.customRequests() })
      queryClient.invalidateQueries({ queryKey: ['customRequests'] })
    },
  })
}

export function useRejectQuotation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (quotationId: string) => {
      const response = await api.post(`/quotations/${quotationId}/reject`)
      return response.data.data
    },
    onSuccess: (_, quotationId) => {
      // Invalidate both lists and detail query
      queryClient.invalidateQueries({ queryKey: queryKeys.customRequests() })
      queryClient.invalidateQueries({ queryKey: ['customRequests'] })
    },
  })
}
