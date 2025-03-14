import { Button } from '@/components/ui/button';
import { ChallengeCardProps } from '@/types';
import { formatDistanceToNow } from 'date-fns';

const ChallengeCard = ({ 
  challenge, 
  participant, 
  participants, 
  userPosition,
  onAction 
}: ChallengeCardProps) => {
  // Get days remaining
  const getDaysLeft = () => {
    const endDate = new Date(challenge.endDate);
    const today = new Date();
    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  // Get gradient colors based on challenge type
  const getGradient = () => {
    switch (challenge.type) {
      case 'steps':
        return 'from-blue-600 to-indigo-600';
      case 'workout':
        return 'from-green-600 to-teal-600';
      case 'activeMinutes':
        return 'from-orange-500 to-amber-500';
      case 'sleep':
        return 'from-purple-600 to-pink-600';
      case 'water':
        return 'from-blue-400 to-cyan-500';
      default:
        return 'from-gray-600 to-gray-700';
    }
  };

  // Get text color based on challenge type
  const getTextColor = () => {
    switch (challenge.type) {
      case 'steps':
        return 'text-primary';
      case 'workout':
        return 'text-green-600';
      case 'activeMinutes':
        return 'text-orange-500';
      case 'sleep':
        return 'text-purple-600';
      case 'water':
        return 'text-blue-400';
      default:
        return 'text-gray-600';
    }
  };

  // Get progress percentage
  const getProgressPercentage = () => {
    if (!participant) return 0;
    return Math.min(Math.round((participant.currentProgress / challenge.target) * 100), 100);
  };

  // Get button text
  const getButtonText = () => {
    if (!participant) return 'Join Challenge';
    
    switch (challenge.type) {
      case 'steps':
        return 'Log Today\'s Steps';
      case 'workout':
        return 'Record Workout';
      case 'activeMinutes':
        return 'Update Activity';
      case 'sleep':
        return 'Log Sleep';
      case 'water':
        return 'Log Water Intake';
      default:
        return 'Update Progress';
    }
  };

  // Get button color
  const getButtonColor = () => {
    switch (challenge.type) {
      case 'steps':
        return 'bg-primary hover:bg-blue-600';
      case 'workout':
        return 'bg-green-600 hover:bg-green-700';
      case 'activeMinutes':
        return 'bg-orange-500 hover:bg-orange-600';
      case 'sleep':
        return 'bg-purple-600 hover:bg-purple-700';
      case 'water':
        return 'bg-blue-400 hover:bg-blue-500';
      default:
        return 'bg-gray-600 hover:bg-gray-700';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className={`bg-gradient-to-r ${getGradient()} text-white p-4`}>
        <div className="flex justify-between">
          <h3 className="font-bold text-lg">{challenge.name}</h3>
          <span className={`bg-white ${getTextColor()} text-xs px-2 py-1 rounded-full font-medium`}>
            {getDaysLeft()} days left
          </span>
        </div>
        <p className="text-sm opacity-90 mt-1">{challenge.description}</p>
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex -space-x-2">
            {/* This would typically use actual participant images */}
            <div className="h-8 w-8 rounded-full bg-blue-200 border-2 border-white flex items-center justify-center text-blue-700 text-xs font-medium">
              JD
            </div>
            <div className="h-8 w-8 rounded-full bg-green-200 border-2 border-white flex items-center justify-center text-green-700 text-xs font-medium">
              SM
            </div>
            <div className="h-8 w-8 rounded-full bg-yellow-200 border-2 border-white flex items-center justify-center text-yellow-700 text-xs font-medium">
              AK
            </div>
            <div className="h-8 w-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs text-gray-600">
              +{Math.max(0, participants - 3)}
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium">Your position: <span className={getTextColor()}>#{userPosition}</span></p>
            <p className="text-xs text-gray-500">of {participants} participants</p>
          </div>
        </div>
        {participant && (
          <div className="mb-4">
            <div className="flex justify-between items-center mb-1 text-sm">
              <span className="font-medium">Your progress</span>
              <span className={getTextColor()}>
                {participant.currentProgress}/{challenge.target} 
                {challenge.type === 'steps' ? ' steps' : 
                 challenge.type === 'activeMinutes' ? ' min' : ''}
              </span>
            </div>
            <div className="h-2.5 w-full bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`h-full ${getButtonColor()} rounded-full`} 
                style={{ width: `${getProgressPercentage()}%` }}
              ></div>
            </div>
          </div>
        )}
        <Button 
          className={`w-full py-2 rounded-lg ${getButtonColor()} transition text-white`}
          onClick={onAction}
        >
          {getButtonText()}
        </Button>
      </div>
    </div>
  );
};

export default ChallengeCard;
