import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { goalsAPI } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export const useGoals = (userId: number) => {
  return useQuery({
    queryKey: ['goals', userId],
    queryFn: () => goalsAPI.getGoals(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
  });
};

export const useCreateGoal = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: goalsAPI.createGoal,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      
      toast({
        title: "Goal Created",
        description: "Your new goal has been set successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to create goal",
        variant: "destructive",
      });
    },
  });
};

export const useUpdateGoal = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => 
      goalsAPI.updateGoal(id, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      
      toast({
        title: "Goal Updated",
        description: "Your goal has been updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to update goal",
        variant: "destructive",
      });
    },
  });
};