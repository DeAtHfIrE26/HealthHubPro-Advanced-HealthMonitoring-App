import { GoalProgressProps } from '@/types';

const GoalProgress = ({ type, current, target, icon, color }: GoalProgressProps) => {
  const progressPercentage = Math.min(Math.round((current / target) * 100), 100);
  
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <div className="flex items-center">
          <i className={`fas ${icon} ${color} mr-2`}></i>
          <span className="font-medium">{type}</span>
        </div>
        <div className="font-mono text-sm">
          <span className="font-medium">{current}</span>
          <span className="text-gray-400">/{target}</span>
        </div>
      </div>
      <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full`}
          style={{ width: `${progressPercentage}%` }}
        ></div>
      </div>
    </div>
  );
};

export default GoalProgress;
