import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { challengesAPI } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export const useChallenges = () => {
  return useQuery({
    queryKey: ['challenges'],
    queryFn: () => challengesAPI.getChallenges(),
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 3,
  });
};

export const useChallenge = (id: number) => {
  return useQuery({
    queryKey: ['challenge', id],
    queryFn: () => challengesAPI.getChallenge(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
  });
};

export const useChallengeParticipants = (challengeId: number) => {
  return useQuery({
    queryKey: ['challenge-participants', challengeId],
    queryFn: () => challengesAPI.getParticipants(challengeId),
    enabled: !!challengeId,
    staleTime: 2 * 60 * 1000, // 2 minutes for real-time feel
    retry: 3,
  });
};

export const useUserChallenges = (userId: number) => {
  return useQuery({
    queryKey: ['user-challenges', userId],
    queryFn: () => challengesAPI.getUserChallenges(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
  });
};

export const useJoinChallenge = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ challengeId, userId }: { challengeId: number; userId: number }) =>
      challengesAPI.joinChallenge(challengeId, userId),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['challenges'] });
      queryClient.invalidateQueries({ queryKey: ['user-challenges'] });
      queryClient.invalidateQueries({ queryKey: ['challenge-participants'] });
      
      toast({
        title: "Challenge Joined",
        description: "You've successfully joined the challenge!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to join challenge",
        variant: "destructive",
      });
    },
  });
};

export const useUpdateChallengeProgress = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ challengeId, userId, progress }: { 
      challengeId: number; 
      userId: number; 
      progress: number 
    }) => challengesAPI.updateProgress(challengeId, userId, progress),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['challenge-participants'] });
      queryClient.invalidateQueries({ queryKey: ['user-challenges'] });
      
      toast({
        title: "Progress Updated",
        description: "Your challenge progress has been updated",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to update progress",
        variant: "destructive",
      });
    },
  });
};