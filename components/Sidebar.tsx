import React from 'react';
import { LayoutDashboard, FileText, Users, Calendar, Settings, ShieldAlert, Send, Crown, BarChart } from 'lucide-react';
import { UserRole } from '../types';

interface SidebarProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  userRole?: UserRole;
  userScope?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, setCurrentView, userRole, userScope }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'membership', label: 'Membership', icon: Crown },
    { id: 'developers', label: 'Developers', icon: Users },
    { id: 'outreach', label: 'Outreach', icon: Send },
    { id: 'invoices', label: 'Finance', icon: FileText },
    { id: 'reporting', label: 'Reporting', icon: BarChart },
    { id: 'events', label: 'Events', icon: Calendar },
    { id: 'admin', label: 'Settings', icon: ShieldAlert },
  ];

  // RBAC: Filter items based on role
  // Super Admin: All
  // Community/Regional Admin: Dashboard & Reporting Only
  const visibleNavItems = (userRole === UserRole.SUPER_ADMIN)
    ? navItems
    : navItems.filter(item => ['dashboard', 'reporting'].includes(item.id));

  return (
    <div className="w-64 bg-[#0d1117] border-r border-[#30363d] flex flex-col h-screen shrink-0 font-sans hidden md:flex">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-4 border-b border-[#30363d] bg-[#161b22]">
        <div className="flex items-center gap-3 text-white">
            {/* Logo matches GitHub's accent blue */}
            <svg viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-7 h-7">
                <path d="M10 25H0V45C0 47.7614 2.23858 50 5 50H15V25C15 19.4772 19.4772 15 25 15C30.5228 15 35 19.4772 35 25V50H45C47.7614 50 50 47.7614 50 45V25C50 11.1929 38.8071 0 25 0H15V10C15 12.7614 12.7614 15 10 15V25Z" fill="#58a6ff"/>
            </svg>
            <span className="font-semibold text-sm tracking-tight">Dar Blockchain</span>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {visibleNavItems.map((item) => {
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={`w-full flex items-center px-3 py-2 text-sm rounded-md transition-all duration-200 group ${
                isActive 
                  ? 'bg-[#1f6feb] text-white font-medium shadow-sm' 
                  : 'text-[#8b949e] hover:bg-[#161b22] hover:text-[#c9d1d9]'
              }`}
            >
              <item.icon className={`w-4 h-4 mr-3 ${isActive ? 'text-white' : 'text-[#8b949e] group-hover:text-[#c9d1d9]'}`} />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Profile Footer */}
      <div className="p-4 border-t border-[#30363d] bg-[#161b22]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1f6feb] to-[#58a6ff] flex items-center justify-center text-xs font-bold text-white shadow-sm ring-2 ring-[#0d1117]">
            {userRole === UserRole.SUPER_ADMIN ? 'SA' : 'CA'}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-medium text-[#c9d1d9] truncate">
                {userRole === UserRole.SUPER_ADMIN ? 'Super Admin' : userRole === UserRole.REGIONAL_ADMIN ? 'Regional Admin' : 'Community Admin'}
            </p>
            <p className="text-xs text-[#8b949e] truncate" title={userScope}>
                {userScope || 'Loading...'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};