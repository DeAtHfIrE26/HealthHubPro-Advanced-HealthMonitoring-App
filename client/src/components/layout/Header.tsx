import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Bell, LogOut, Search, Settings, User as UserIcon } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

const Header = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const [location] = useLocation();
  const isMobile = useIsMobile();
  const [searchOpen, setSearchOpen] = useState(false);

  // Check if a nav item is active
  const isActive = (path: string) => {
    return location === path;
  };
  
  // Get user initials for avatar fallback
  const getUserInitials = () => {
    if (!user) return 'GU';
    return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`;
  };

  return (
    <header className="bg-white shadow-md fixed top-0 left-0 right-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-3">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="text-primary text-2xl font-bold">
              <i className="fas fa-heartbeat mr-2"></i>
              <Link href="/">FitAI</Link>
            </div>
          </div>

          {/* Navigation - Desktop */}
          <div className="hidden md:flex space-x-6 items-center">
            <Link 
              href="/" 
              className={`font-medium ${isActive('/') ? 'text-primary font-semibold' : 'text-gray-700 hover:text-primary'}`}
            >
              Dashboard
            </Link>
            <Link 
              href="/workouts" 
              className={`font-medium ${isActive('/workouts') ? 'text-primary font-semibold' : 'text-gray-700 hover:text-primary'}`}
            >
              Workouts
            </Link>
            <Link 
              href="/nutrition" 
              className={`font-medium ${isActive('/nutrition') ? 'text-primary font-semibold' : 'text-gray-700 hover:text-primary'}`}
            >
              Nutrition
            </Link>
            <Link 
              href="/challenges" 
              className={`font-medium ${isActive('/challenges') ? 'text-primary font-semibold' : 'text-gray-700 hover:text-primary'}`}
            >
              Challenges
            </Link>
            <Link 
              href="/insights" 
              className={`font-medium ${isActive('/insights') ? 'text-primary font-semibold' : 'text-gray-700 hover:text-primary'}`}
            >
              AI Insights
            </Link>
          </div>

          {/* User section */}
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                {/* Search - Desktop */}
                <div className="hidden md:block relative">
                  <Input 
                    type="text" 
                    placeholder="Search..." 
                    className="bg-gray-100 rounded-lg px-4 py-2 text-sm w-40 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
                </div>
                
                {/* Search - Mobile */}
                {isMobile && searchOpen && (
                  <div className="absolute inset-x-0 top-0 bg-white p-3 shadow-md z-50">
                    <div className="relative">
                      <Input 
                        type="text" 
                        placeholder="Search..." 
                        className="bg-gray-100 w-full pr-8"
                        autoFocus
                      />
                      <button 
                        className="absolute right-2 top-2.5"
                        onClick={() => setSearchOpen(false)}
                      >
                        <i className="fas fa-times text-gray-400"></i>
                      </button>
                    </div>
                  </div>
                )}
                
                {isMobile && !searchOpen && (
                  <button onClick={() => setSearchOpen(true)} className="text-gray-700">
                    <Search className="h-5 w-5" />
                  </button>
                )}
                
                {/* Notifications */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative">
                      <Bell className="h-5 w-5 text-gray-700" />
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">3</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-80">
                    <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <div className="max-h-72 overflow-y-auto">
                      <DropdownMenuItem className="flex flex-col items-start p-3">
                        <div className="font-medium">New challenge available</div>
                        <div className="text-xs text-gray-500 mt-1">Join the May Fitness Challenge and compete with others!</div>
                        <div className="text-xs text-gray-400 mt-1">5 min ago</div>
                      </DropdownMenuItem>
                      <DropdownMenuItem className="flex flex-col items-start p-3">
                        <div className="font-medium">New AI recommendation</div>
                        <div className="text-xs text-gray-500 mt-1">We've updated your workout plan based on your recent activity.</div>
                        <div className="text-xs text-gray-400 mt-1">1 hour ago</div>
                      </DropdownMenuItem>
                      <DropdownMenuItem className="flex flex-col items-start p-3">
                        <div className="font-medium">Achievement unlocked</div>
                        <div className="text-xs text-gray-500 mt-1">Congratulations! You've reached 10,000 steps today.</div>
                        <div className="text-xs text-gray-400 mt-1">3 hours ago</div>
                      </DropdownMenuItem>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-center text-primary">
                      View all notifications
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* User menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <div className="flex items-center space-x-2 cursor-pointer">
                      <Avatar className="h-9 w-9">
                        <AvatarImage 
                          src={user?.profileImage} 
                          alt={`${user?.firstName} ${user?.lastName}`} 
                        />
                        <AvatarFallback className="bg-primary text-white">
                          {getUserInitials()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="hidden md:inline font-medium">{user?.firstName} {user?.lastName}</span>
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <UserIcon className="mr-2 h-4 w-4" />
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={logout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Button variant="ghost" asChild>
                  <Link href="/login">Login</Link>
                </Button>
                <Button asChild>
                  <Link href="/register">Sign Up</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
