import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { activityAPI } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export const useStats = (userId: number, date?: string) => {
  return useQuery({
    queryKey: ['stats', userId, date],
    queryFn: () => activityAPI.getStats(userId, date),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
  });
};

export const useStatsHistory = (userId: number, days: number = 7) => {
  return useQuery({
    queryKey: ['stats-history', userId, days],
    queryFn: () => activityAPI.getHistory(userId, days),
    enabled: !!userId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 3,
  });
};

export const useUpdateStats = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: activityAPI.createStats,
    onSuccess: (data, variables) => {
      // Invalidate and refetch stats queries
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['stats-history'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      
      toast({
        title: "Success",
        description: "Activity stats updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to update stats",
        variant: "destructive",
      });
    },
  });
};