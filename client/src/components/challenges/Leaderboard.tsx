import { LeaderboardParticipant } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface LeaderboardProps {
  title: string;
  subtitle: string;
  participants: LeaderboardParticipant[];
  type: 'steps' | 'activeMinutes' | 'calories';
  gradientFrom: string;
  gradientTo: string;
}

const Leaderboard = ({ 
  title, 
  subtitle, 
  participants,
  type,
  gradientFrom,
  gradientTo
}: LeaderboardProps) => {
  const getUnitLabel = () => {
    switch (type) {
      case 'steps':
        return 'steps';
      case 'activeMinutes':
        return 'active minutes';
      case 'calories':
        return 'calories';
      default:
        return '';
    }
  };

  const getUserInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className={`p-4 bg-gradient-to-r from-${gradientFrom} to-${gradientTo} text-white`}>
        <h4 className="font-bold">{title}</h4>
        <p className="text-sm">{subtitle}</p>
      </div>
      <div className="divide-y divide-gray-100">
        {participants.map((participant, index) => (
          <div 
            key={participant.id}
            className={`p-4 flex items-center justify-between ${
              participant.isCurrentUser ? 'bg-blue-50' : (index === 0 ? 'bg-amber-50' : '')
            }`}
          >
            <div className="flex items-center">
              <div className={`w-8 h-8 ${
                index === 0 
                  ? 'bg-amber-500 text-white' 
                  : participant.isCurrentUser 
                    ? 'bg-primary text-white'
                    : 'bg-gray-200 text-gray-700'
              } rounded-full flex items-center justify-center font-medium mr-3`}>
                {participant.position}
              </div>
              <Avatar className="h-10 w-10 mr-3">
                <AvatarImage src={participant.profileImage} />
                <AvatarFallback className={`${
                  index === 0 
                    ? 'bg-amber-100 text-amber-800' 
                    : participant.isCurrentUser 
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                }`}>
                  {getUserInitials(participant.firstName, participant.lastName)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">
                  {participant.isCurrentUser ? 'You' : `${participant.firstName} ${participant.lastName}`}
                </p>
                <p className="text-xs text-gray-500">{participant.location || 'Unknown location'}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-mono font-medium text-lg">{participant.progress.toLocaleString()}</p>
              <p className="text-xs text-gray-500">{getUnitLabel()}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="p-4 text-center border-t border-gray-100">
        <button className="text-primary hover:underline">View Full Leaderboard</button>
      </div>
    </div>
  );
};

export default Leaderboard;
