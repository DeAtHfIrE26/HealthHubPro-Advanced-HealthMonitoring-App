import { StatCardProps } from '@/types';

const StatCard = ({ type, value, change, icon, bgColor, textColor }: StatCardProps) => {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4 flex space-x-4 items-center transition hover:shadow-md">
      <div className={`h-14 w-14 rounded-full ${bgColor} flex items-center justify-center ${textColor}`}>
        <i className={`fas ${icon} text-xl`}></i>
      </div>
      <div>
        <p className="text-gray-500 text-sm capitalize">{type}</p>
        <p className="text-2xl font-mono font-medium">{value}</p>
        <div className="flex items-center text-xs">
          {change > 0 ? (
            <>
              <span className="text-green-500">
                <i className="fas fa-arrow-up mr-1"></i>
                {Math.abs(change)}%
              </span>
              <span className="text-gray-500 ml-1">vs last week</span>
            </>
          ) : change < 0 ? (
            <>
              <span className="text-red-500">
                <i className="fas fa-arrow-down mr-1"></i>
                {Math.abs(change)}%
              </span>
              <span className="text-gray-500 ml-1">vs last week</span>
            </>
          ) : (
            <span className="text-gray-500">No change vs last week</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatCard;
