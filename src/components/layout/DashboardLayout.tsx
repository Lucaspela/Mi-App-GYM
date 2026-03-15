import React from 'react';
import { LogOut, Activity, User, Dumbbell } from 'lucide-react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export const DashboardLayout: React.FC = () => {
  const { user, gym, logout } = useAuth();

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-[#39FF14] selection:text-black">
      <header className="bg-[#141414] border-b border-white/5 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#39FF14] rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(57,255,20,0.3)]">
              <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-black" />
            </div>
            <h1 className="text-lg sm:text-2xl font-black text-white uppercase tracking-tighter truncate max-w-[150px] sm:max-w-none">
              {gym?.nombre || 'GYM FLOW'}
            </h1>
          </div>
          <div className="flex items-center gap-3 sm:gap-6">
            <div className="hidden md:block text-right">
              <p className="text-sm font-black text-white uppercase">{user.nombre}</p>
              <p className="text-[10px] font-bold text-[#39FF14] uppercase tracking-widest">{user.rol}</p>
            </div>
            <button 
              onClick={() => logout()}
              className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl font-bold text-xs hover:bg-red-500 hover:text-white transition-all active:scale-95"
            >
              <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
};
