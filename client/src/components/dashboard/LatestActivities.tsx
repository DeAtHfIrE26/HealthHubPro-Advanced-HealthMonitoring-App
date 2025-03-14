import { formatDistanceToNow, format } from 'date-fns';
import { WorkoutSession, Workout } from '@/types';

interface LatestActivitiesProps {
  activities: (WorkoutSession & { workout?: Workout })[];
}

const LatestActivities = ({ activities }: LatestActivitiesProps) => {
  // Helper to get the icon based on workout type
  const getIcon = (type: string | undefined) => {
    switch (type?.toLowerCase()) {
      case 'hiit':
      case 'running':
        return 'fas fa-running';
      case 'strength':
        return 'fas fa-dumbbell';
      case 'cycling':
        return 'fas fa-biking';
      case 'yoga':
        return 'fas fa-om';
      case 'swimming':
        return 'fas fa-swimmer';
      default:
        return 'fas fa-heartbeat';
    }
  };
  
  // Helper to get background color based on workout type
  const getIconBg = (type: string | undefined) => {
    switch (type?.toLowerCase()) {
      case 'hiit':
      case 'running':
        return 'bg-blue-100 text-primary';
      case 'strength':
        return 'bg-purple-100 text-purple-500';
      case 'cycling':
        return 'bg-green-100 text-green-500';
      case 'yoga':
        return 'bg-indigo-100 text-indigo-500';
      case 'swimming':
        return 'bg-cyan-100 text-cyan-500';
      default:
        return 'bg-gray-100 text-gray-500';
    }
  };
  
  // Format the start time
  const formatTime = (timeString: string) => {
    const date = new Date(timeString);
    
    // If the date is today, just show the time
    if (new Date().toDateString() === date.toDateString()) {
      return format(date, 'h:mm a');
    }
    
    // Otherwise show relative time (e.g., "2 days ago")
    return formatDistanceToNow(date, { addSuffix: true });
  };
  
  // Calculate duration in minutes
  const getDuration = (session: WorkoutSession & { workout?: Workout }): number => {
    if (!session.endTime) return session.workout?.duration || 0;
    
    const start = new Date(session.startTime);
    const end = new Date(session.endTime);
    return Math.round((end.getTime() - start.getTime()) / (1000 * 60));
  };
  
  return (
    <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-5">
      <h3 className="font-semibold text-lg mb-4">Latest Activities</h3>
      
      <div className="space-y-4">
        {activities.length > 0 ? (
          activities.map((activity, index) => (
            <div 
              key={activity.id}
              className={`flex items-center py-3 ${
                index < activities.length - 1 ? 'border-b border-gray-100' : ''
              }`}
            >
              <div className={`h-12 w-12 rounded-full ${getIconBg(activity.workout?.type)} flex items-center justify-center mr-4`}>
                <i className={`${getIcon(activity.workout?.type)} text-lg`}></i>
              </div>
              <div className="flex-grow">
                <h4 className="font-medium">{activity.workout?.name || 'Unknown Workout'}</h4>
                <p className="text-sm text-gray-500">
                  {activity.workout?.type === 'running' || activity.workout?.type === 'cycling' 
                    ? '5.2 km • ' 
                    : ''
                  }
                  {getDuration(activity)} min • {formatTime(activity.startTime)}
                </p>
              </div>
              <div className="text-right">
                <p className="font-mono font-medium">{activity.caloriesBurned || activity.workout?.calories || 0}</p>
                <p className="text-xs text-gray-500">calories</p>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-gray-500">
            <i className="fas fa-running text-2xl mb-2 opacity-50"></i>
            <p>No activities recorded yet.</p>
            <p className="text-sm mt-1">Start a workout to track your progress!</p>
          </div>
        )}
        
        {activities.length > 0 && (
          <div className="pt-2 text-center">
            <a href="/workouts" className="inline-flex items-center text-primary hover:underline">
              View All Activities
              <i className="fas fa-chevron-right ml-1 text-xs"></i>
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default LatestActivities;
