import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workoutsAPI } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export const useWorkouts = (type?: string, level?: string) => {
  return useQuery({
    queryKey: ['workouts', type, level],
    queryFn: () => workoutsAPI.getWorkouts(type, level),
    staleTime: 15 * 60 * 1000, // 15 minutes
    retry: 3,
  });
};

export const useWorkout = (id: number) => {
  return useQuery({
    queryKey: ['workout', id],
    queryFn: () => workoutsAPI.getWorkout(id),
    enabled: !!id,
    staleTime: 30 * 60 * 1000, // 30 minutes
    retry: 3,
  });
};

export const useWorkoutSessions = (userId: number) => {
  return useQuery({
    queryKey: ['workout-sessions', userId],
    queryFn: () => workoutsAPI.getWorkoutSessions(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
  });
};

export const useCreateWorkoutSession = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: workoutsAPI.createWorkoutSession,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workout-sessions'] });
      
      toast({
        title: "Workout Started",
        description: "Your workout session has been started successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to start workout",
        variant: "destructive",
      });
    },
  });
};

export const useUpdateWorkoutSession = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => 
      workoutsAPI.updateWorkoutSession(id, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workout-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      
      if (variables.data.completed) {
        toast({
          title: "Workout Completed",
          description: "Great job! Your workout has been recorded.",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to update workout",
        variant: "destructive",
      });
    },
  });
};