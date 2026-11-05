
import React, { useState } from 'react';
import { View } from '../types';
import { 
  LayoutDashboard, 
  Users, 
  CalendarDays, 
  ClipboardCheck,
  Trophy,
  MonitorPlay,
  Bot,
  Wrench,
  ChevronLeft,
  ChevronRight,
  Menu,
  Flame,
  MessageSquare
} from 'lucide-react';
// Fix: Added @ts-ignore to bypass environment-specific resolution issues with Firebase exports
// @ts-ignore
import type { User } from 'firebase/auth';

interface SidebarProps {
  activeView: View;
  onNavigate: (view: View) => void;
  user: User | null;
  onLock?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeView, onNavigate, user }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  const menuItems = [
    { id: View.DASHBOARD, label: 'Hem', icon: LayoutDashboard },
    { id: View.ROSTER, label: 'Laget', icon: Users },
    { id: View.CHAT, label: 'Chat', icon: MessageSquare, isNew: true },
    { id: View.PLAN, label: 'Planering', icon: CalendarDays },
    { id: View.TRAINING, label: 'Träna', icon: ClipboardCheck },
    { id: View.WARMUP_LIBRARY, label: 'Uppvärmning', icon: Flame },
    { id: View.MATCH_EVAL, label: 'Match', icon: Trophy },
    { id: View.TOOLS, label: 'Verktyg', icon: Wrench },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={`hidden md:flex transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) p-4 flex-col h-full shrink-0 relative ${isCollapsed ? 'w-24' : 'w-72'}`}>
        
        {/* Sleek Long Edge Toggle Handle - Nu längre (h-64) för bättre kontroll */}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`absolute top-1/2 -right-1 -translate-y-1/2 z-[100] w-1.5 h-64 rounded-full transition-all duration-300 group/toggle ${isCollapsed ? 'hover:w-3 bg-white/10 hover:bg-orange-600' : 'hover:w-3 bg-white/5 hover:bg-orange-600'}`}
          title={isCollapsed ? "Expandera meny" : "Kollapsa meny"}
        >
          {/* Subtil pil som bara visas vid hover */}
          <div className="opacity-0 group-hover/toggle:opacity-100 transition-opacity flex items-center justify-center h-full">
            {isCollapsed ? <ChevronRight size={14} className="text-white" /> : <ChevronLeft size={14} className="text-white" />}
          </div>
        </button>

        <div className="flex-1 rounded-[2.5rem] bg-slate-900/90 backdrop-blur-2xl border border-white/5 flex flex-col overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.3)] relative">
          
          {/* Header Section */}
          <div className={`transition-all duration-500 flex flex-col items-center pt-10 pb-6 shrink-0 ${isCollapsed ? 'px-0' : 'px-8 items-start'}`}>
             <div className="flex items-center gap-3">
                <div className={`rounded-2xl bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center shadow-lg shadow-orange-900/40 shrink-0 transition-all duration-500 ${isCollapsed ? 'w-12 h-12 rotate-0' : 'w-10 h-10 -rotate-6'}`}>
                   <Trophy size={isCollapsed ? 24 : 18} className="text-white" />
                </div>
                {!isCollapsed && (
                   <div className="animate-in fade-in slide-in-from-left duration-500">
                      <span className="text-xl font-black italic uppercase text-white tracking-tighter whitespace-nowrap block leading-none">Coach Pro</span>
                      <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.3em] mt-1 block">Säsong 25/26</span>
                   </div>
                )}
             </div>
          </div>

          {/* Navigation Items - Nu låst från skroll (overflow-hidden) */}
          <nav className="flex-1 px-3 space-y-2 overflow-hidden py-6">
            {menuItems.map((item) => (
              <div key={item.id} className="mb-1">
                <button
                  onClick={() => onNavigate(item.id)}
                  title={isCollapsed ? item.label : ''}
                  className={`w-full flex items-center rounded-2xl transition-all duration-300 group relative ${
                    isCollapsed ? 'justify-center py-5' : 'px-5 py-4 gap-4'
                  } ${
                    activeView === item.id
                      ? 'bg-gradient-to-r from-orange-600/20 to-transparent border-l-4 border-orange-500 text-white shadow-lg shadow-orange-900/10'
                      : 'text-slate-500 hover:bg-white/5 hover:text-slate-200'
                  }`}
                >
                  <item.icon className={`transition-all duration-300 shrink-0 ${isCollapsed ? 'w-7 h-7' : 'w-5 h-5'} ${activeView === item.id ? 'text-orange-500 scale-110 drop-shadow-[0_0_8px_rgba(249,115,22,0.4)]' : 'text-slate-600 group-hover:text-slate-300'}`} />
                  
                  {!isCollapsed && (
                    <span className="font-black text-[11px] uppercase tracking-widest whitespace-nowrap animate-in fade-in slide-in-from-left duration-500">{item.label}</span>
                  )}
                  
                  {!isCollapsed && activeView === item.id && (
                      <div className="ml-auto flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></div>
                      </div>
                  )}
                  
                  {/* @ts-ignore */}
                  {item.isNew && (
                    <span className={`absolute bg-blue-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.5)] ${isCollapsed ? 'right-3 top-3 w-2.5 h-2.5' : 'right-4 top-1/2 -translate-y-1/2 w-2 h-2'}`}></span>
                  )}
                </button>
              </div>
            ))}
          </nav>

          {/* User Profile Info (Bottom) - Static display, no navigation */}
          <div className={`p-4 border-t border-white/5 transition-all duration-500 shrink-0 ${isCollapsed ? 'items-center px-0' : 'px-6'}`}>
              <div className={`flex items-center rounded-2xl w-full ${isCollapsed ? 'justify-center py-4' : 'p-3 gap-3'}`}>
                  {!isCollapsed ? (
                      <div className="text-left animate-in fade-in duration-500">
                          <div className="text-[10px] font-black text-white uppercase truncate max-w-[150px]">{user?.displayName || 'Coach'}</div>
                          <div className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter">Coach Pro System</div>
                      </div>
                  ) : (
                      <div className="w-8 h-8 rounded-lg bg-slate-800/50 flex items-center justify-center">
                        <Users size={16} className="text-slate-600" />
                      </div>
                  )}
              </div>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-4 left-4 right-4 bg-slate-900/95 backdrop-blur-xl border border-white/10 h-16 rounded-2xl flex items-center z-50 shadow-2xl px-1 overflow-hidden">
        <div className="flex items-center justify-between w-full h-full px-2">
          {menuItems.filter(item => 
            item.id !== View.PLAN && 
            item.id !== View.WARMUP_LIBRARY && 
            item.id !== View.TOOLS
          ).map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex flex-col items-center justify-center gap-1 transition-all relative w-12 h-12 rounded-xl ${
                activeView === item.id ? 'text-orange-500 bg-white/5' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <item.icon className="w-5 h-5" strokeWidth={activeView === item.id ? 2.5 : 2} />
              <span className="text-[8px] font-bold uppercase tracking-tight scale-75">{item.label}</span>
            </button>
          ))}
           <button
              onClick={() => onNavigate(View.TOOLS)}
              className={`flex flex-col items-center justify-center gap-1 transition-all relative w-12 h-12 rounded-xl ${
                activeView === View.TOOLS || activeView === View.AI_COACH || activeView === View.WARMUP_LIBRARY ? 'text-orange-500 bg-white/5' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Wrench className="w-5 h-5" strokeWidth={activeView === View.TOOLS ? 2.5 : 2} />
              <span className="text-[8px] font-bold uppercase tracking-tight scale-75">Mer</span>
            </button>
        </div>
      </nav>
    </>
  );
};
