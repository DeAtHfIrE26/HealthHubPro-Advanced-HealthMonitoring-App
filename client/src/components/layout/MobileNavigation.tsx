import { Link, useLocation } from 'wouter';
import { Home, Dumbbell, Trophy, Utensils, Brain } from 'lucide-react';

const MobileNavigation = () => {
  const [location] = useLocation();
  
  // Check if a nav item is active
  const isActive = (path: string) => {
    return location === path;
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.1)] z-50">
      <div className="flex justify-around items-center py-2">
        <Link 
          href="/" 
          className={`flex flex-col items-center py-1 px-3 ${isActive('/') ? 'text-primary' : 'text-gray-600'}`}
        >
          <Home className="h-5 w-5" />
          <span className="text-xs mt-1">Home</span>
        </Link>
        
        <Link 
          href="/workouts" 
          className={`flex flex-col items-center py-1 px-3 ${isActive('/workouts') ? 'text-primary' : 'text-gray-600'}`}
        >
          <Dumbbell className="h-5 w-5" />
          <span className="text-xs mt-1">Workouts</span>
        </Link>
        
        <Link 
          href="/challenges" 
          className={`flex flex-col items-center py-1 px-3 ${isActive('/challenges') ? 'text-primary' : 'text-gray-600'}`}
        >
          <Trophy className="h-5 w-5" />
          <span className="text-xs mt-1">Challenges</span>
        </Link>
        
        <Link 
          href="/nutrition" 
          className={`flex flex-col items-center py-1 px-3 ${isActive('/nutrition') ? 'text-primary' : 'text-gray-600'}`}
        >
          <Utensils className="h-5 w-5" />
          <span className="text-xs mt-1">Nutrition</span>
        </Link>
        
        <Link 
          href="/insights" 
          className={`flex flex-col items-center py-1 px-3 ${isActive('/insights') ? 'text-primary' : 'text-gray-600'}`}
        >
          <Brain className="h-5 w-5" />
          <span className="text-xs mt-1">AI</span>
        </Link>
      </div>
    </div>
  );
};

export default MobileNavigation;
