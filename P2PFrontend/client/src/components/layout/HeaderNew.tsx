import { useState } from 'react';
import { Menu, Search, Upload, User, LogOut, Settings } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { Link, useLocation } from 'wouter';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface HeaderNewProps {
  onMenuClick: () => void;
  onUploadClick: () => void;
}

export function HeaderNew({ onMenuClick, onUploadClick }: HeaderNewProps) {
  const { searchQuery, setSearchQuery } = useAppStore();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [, setLocation] = useLocation();
  const [localSearch, setLocalSearch] = useState(searchQuery);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(localSearch);
  };

  const handleLogout = async () => {
    await logout();
    setLocation('/login');
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-[#0a0a14]/90 backdrop-blur-xl z-50 flex items-center justify-between px-4 lg:px-6 border-b border-white/5">
      <div className="flex items-center gap-4 lg:gap-6">
        <button 
          onClick={onMenuClick}
          className="p-2 hover:bg-white/10 rounded-lg transition-all text-gray-400 hover:text-white lg:hidden"
        >
          <Menu size={22} />
        </button>
        <Link href="/" className="flex items-center">
          <Logo size="sm" variant="light" />
        </Link>
      </div>

      {/* Search Bar */}
      <div className="hidden md:flex items-center flex-1 max-w-[500px] mx-4 lg:mx-8">
        <form onSubmit={handleSearch} className="flex flex-1 items-center relative">
          <div className="relative w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input
              type="text"
              placeholder="Search videos..."
              className="w-full h-11 pl-12 pr-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
            />
          </div>
        </form>
      </div>

      {/* Right Icons */}
      <div className="flex items-center gap-1 lg:gap-2">
        {/* Upload Button - Desktop */}
        <button
          onClick={onUploadClick}
          className="hidden lg:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-500/20 transition-all"
        >
          <Upload size={16} />
          Upload
        </button>

        {/* Upload Button - Mobile */}
        <button
          onClick={onUploadClick}
          className="lg:hidden p-2.5 hover:bg-white/10 rounded-xl transition-all text-gray-400 hover:text-white"
        >
          <Upload size={20} />
        </button>

        {/* Auth UI */}
        {isAuthenticated && user ? (
          /* User Dropdown */
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="ml-1 lg:ml-2 flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/10 transition-all">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                  <User size={16} className="text-white" />
                </div>
                <span className="hidden lg:inline text-sm font-medium text-white">
                  {user.username}
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-[#12121f] border-white/10">
              <DropdownMenuLabel className="text-white">
                My Account
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem
                disabled
                className="text-gray-400 cursor-not-allowed focus:bg-white/5"
              >
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-red-400 focus:bg-white/5 focus:text-red-300 cursor-pointer"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          /* Login/Signup Buttons */
          <>
            <Link href="/login">
              <Button
                variant="ghost"
                className="hidden lg:inline-flex text-gray-300 hover:text-white hover:bg-white/10"
              >
                Log In
              </Button>
            </Link>
            <Link href="/signup">
              <Button className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 rounded-xl shadow-lg shadow-blue-500/20">
                Sign Up
              </Button>
            </Link>
          </>
        )}
      </div>
    </header>
  );
}

