import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { auth } from './firebase';
import { signOut } from 'firebase/auth';
import { useAuth } from './AuthContext';
import { 
  LayoutDashboard, 
  CheckCircle, 
  BookOpen, 
  Wallet, 
  LayoutGrid, 
  User, 
  LogOut, 
  Menu, 
  X,
  Sun,
  Moon,
  Files,
  StickyNote,
  Users
} from 'lucide-react';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Habit Tracker', path: '/habits', icon: CheckCircle },
    { name: 'Study Tracker', path: '/study', icon: BookOpen },
    { name: 'Finance Tracker', path: '/finance', icon: Wallet },
    { name: 'My Files', path: '/files', icon: Files },
    { name: 'My Notes', path: '/notes', icon: StickyNote },
    { name: 'Team Members', path: '/team', icon: Users },
    { name: 'Templates', path: '/templates', icon: LayoutGrid },
    { name: 'Profile', path: '/profile', icon: User },
  ];

  return (
    <div className={`min-h-screen flex bg-surface text-on-surface transition-colors duration-200 ${isDarkMode ? 'dark' : ''}`}>
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-surface-container-low border-r border-outline-variant/20 transform transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-full flex flex-col p-4">
          <div className="flex items-center gap-3 mb-8 px-2">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-on-primary">
              <Wallet className="w-6 h-6" />
            </div>
            <span className="text-xl font-extrabold tracking-tighter text-primary">TRACK HUB</span>
          </div>

          <nav className="flex-1 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsSidebarOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all
                    ${isActive 
                      ? 'bg-primary text-on-primary shadow-lg shadow-primary/20' 
                      : 'text-on-surface-variant hover:bg-surface-container-high'}
                  `}
                >
                  <Icon className="w-5 h-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="pt-4 border-t border-outline-variant/20">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-error hover:bg-error-container/10 transition-all"
            >
              <LogOut className="w-5 h-5" />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 bg-surface-container-lowest border-b border-outline-variant/20 flex items-center justify-between px-4 md:px-8 sticky top-0 z-30">
          <button 
            className="md:hidden p-2 text-on-surface-variant"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu className="w-6 h-6" />
          </button>

          <div className="flex-1 px-4">
            <h2 className="text-lg font-bold text-primary truncate">
              {navItems.find(i => i.path === location.pathname)?.name || 'Track Hub'}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={toggleDarkMode}
              className="p-2 rounded-full hover:bg-surface-container-high text-on-surface-variant transition-all"
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <div className="hidden md:flex items-center gap-3 pl-4 border-l border-outline-variant/20">
              <div className="text-right">
                <p className="text-sm font-bold text-on-surface">{user?.displayName || 'User'}</p>
                <p className="text-xs text-on-surface-variant">{user?.email}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container font-bold overflow-hidden">
                {user?.photoURL ? (
                  <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  user?.displayName?.[0] || user?.email?.[0]?.toUpperCase() || 'U'
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
