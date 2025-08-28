import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { recommendationsAPI } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export const useRecommendations = (userId: number, type?: string) => {
  return useQuery({
    queryKey: ['recommendations', userId, type],
    queryFn: () => recommendationsAPI.getRecommendations(userId, type),
    enabled: !!userId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 3,
  });
};

export const useProvideFeedback = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, feedback }: { id: number; feedback: string }) =>
      recommendationsAPI.provideFeedback(id, feedback),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['recommendations'] });
      
      toast({
        title: "Feedback Submitted",
        description: "Thank you for your feedback!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to submit feedback",
        variant: "destructive",
      });
    },
  });
};

export const useGenerateWorkoutPlan = () => {
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ userId, preferences }: { userId: number; preferences: any }) =>
      recommendationsAPI.generateWorkoutPlan(userId, preferences),
    onSuccess: (data) => {
      toast({
        title: "Workout Plan Generated",
        description: "Your personalized workout plan is ready!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to generate workout plan",
        variant: "destructive",
      });
    },
  });
};