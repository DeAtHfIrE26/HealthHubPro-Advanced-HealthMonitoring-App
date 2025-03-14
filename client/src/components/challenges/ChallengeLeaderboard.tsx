import { useState, useEffect } from 'react';
import { useWebSocket } from '../../hooks/useWebSocket';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Trophy, Medal, Award } from 'lucide-react';
import axios from 'axios';

interface Participant {
  id: number;
  userId: number;
  challengeId: number;
  currentProgress: number;
  joinedAt: string;
  user: {
    username: string;
    firstName: string;
    lastName: string;
    profileImage: string | null;
  };
}

interface ChallengeLeaderboardProps {
  userId: number;
  challengeId: number;
  challengeName: string;
  challengeType: string;
  challengeTarget: number;
}

const ChallengeLeaderboard = ({
  userId,
  challengeId,
  challengeName,
  challengeType,
  challengeTarget
}: ChallengeLeaderboardProps) => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // WebSocket connection for real-time updates
  const { lastMessage } = useWebSocket(userId);
  
  // Fetch challenge participants
  const fetchParticipants = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`/api/challenges/${challengeId}/participants`);
      
      // Sort participants by progress (descending)
      const sortedParticipants = response.data.sort((a: Participant, b: Participant) => 
        b.currentProgress - a.currentProgress
      );
      
      setParticipants(sortedParticipants);
      setError(null);
    } catch (error) {
      console.error('Error fetching challenge participants:', error);
      setError('Failed to load leaderboard data');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Initial fetch
  useEffect(() => {
    fetchParticipants();
  }, [challengeId]);
  
  // Handle WebSocket messages for real-time updates
  useEffect(() => {
    if (lastMessage && lastMessage.type === 'challengeUpdate' && lastMessage.payload.challengeId === challengeId) {
      // Update participant progress
      setParticipants(prevParticipants => {
        const updatedParticipants = [...prevParticipants];
        const participantIndex = updatedParticipants.findIndex(p => p.userId === lastMessage.payload.userId);
        
        if (participantIndex !== -1) {
          updatedParticipants[participantIndex] = {
            ...updatedParticipants[participantIndex],
            currentProgress: lastMessage.payload.progress
          };
          
          // Re-sort participants
          return updatedParticipants.sort((a, b) => b.currentProgress - a.currentProgress);
        }
        
        return prevParticipants;
      });
    }
  }, [lastMessage, challengeId]);
  
  // Format progress based on challenge type
  const formatProgress = (progress: number): string => {
    switch (challengeType) {
      case 'steps':
        return `${progress.toLocaleString()} steps`;
      case 'distance':
        return `${progress.toFixed(2)} km`;
      case 'calories':
        return `${progress.toLocaleString()} cal`;
      case 'workouts':
        return `${progress} workouts`;
      default:
        return `${progress}`;
    }
  };
  
  // Calculate progress percentage
  const calculatePercentage = (progress: number): number => {
    return Math.min(Math.round((progress / challengeTarget) * 100), 100);
  };
  
  // Get rank badge
  const getRankBadge = (index: number) => {
    switch (index) {
      case 0:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 1:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 2:
        return <Award className="h-5 w-5 text-amber-700" />;
      default:
        return <span className="text-sm font-medium">{index + 1}</span>;
    }
  };
  
  // Get user initials for avatar fallback
  const getUserInitials = (firstName: string, lastName: string): string => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`;
  };
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Leaderboard</CardTitle>
          <CardDescription>Loading challenge participants...</CardDescription>
        </CardHeader>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Leaderboard</CardTitle>
          <CardDescription className="text-red-500">{error}</CardDescription>
        </CardHeader>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{challengeName} Leaderboard</span>
          <Badge variant="outline">{participants.length} Participants</Badge>
        </CardTitle>
        <CardDescription>
          Real-time rankings for the {challengeName} challenge
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">Rank</TableHead>
              <TableHead>Participant</TableHead>
              <TableHead className="text-right">Progress</TableHead>
              <TableHead className="text-right">Completion</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {participants.map((participant, index) => (
              <TableRow key={participant.id} className={participant.userId === userId ? "bg-muted/50" : ""}>
                <TableCell className="font-medium">
                  {getRankBadge(index)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      {participant.user.profileImage && (
                        <AvatarImage src={participant.user.profileImage} alt={participant.user.username} />
                      )}
                      <AvatarFallback>
                        {getUserInitials(participant.user.firstName, participant.user.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{participant.user.username}</div>
                      <div className="text-xs text-muted-foreground">
                        Joined {new Date(participant.joinedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatProgress(participant.currentProgress)}
                </TableCell>
                <TableCell className="text-right">
                  <Badge variant={calculatePercentage(participant.currentProgress) === 100 ? "secondary" : "default"}>
                    {calculatePercentage(participant.currentProgress)}%
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default ChallengeLeaderboard; 