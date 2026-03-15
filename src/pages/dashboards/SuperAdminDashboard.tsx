import React, { useState, useEffect } from 'react';
import { Activity, Plus, Trash2, Eye, EyeOff, CheckCircle, Info } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { Gym } from '../../types/auth';

export const SuperAdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [gymForm, setGymForm] = useState({ nombre: '', slug: '', trial_days: 15 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchGyms();
  }, []);

  const fetchGyms = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('gyms').select('*').order('created_at', { ascending: false });
    if (!error && data) setGyms(data);
    setLoading(false);
  };

  const handleCreateGym = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const trial_ends_at = new Date();
      trial_ends_at.setDate(trial_ends_at.getDate() + gymForm.trial_days);
      
      const { error } = await supabase.from('gyms').insert([{
        nombre: gymForm.nombre,
        slug: gymForm.slug,
        estado: 'trial',
        trial_ends_at: trial_ends_at.toISOString()
      }]);
      
      if (error) throw error;
      fetchGyms();
      setGymForm({ nombre: '', slug: '', trial_days: 15 });
      alert('Gimnasio creado con éxito');
    } catch (err) {
      alert('Error al crear gimnasio');
    }
  };

  const handleToggleGymStatus = async (id: string, currentStatus: string) => {
    const nuevoEstado = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      const { error } = await supabase.from('gyms').update({ estado: nuevoEstado }).eq('id', id);
      if (error) throw error;
      fetchGyms();
    } catch (err) {
      alert('Error al cambiar estado del gimnasio');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-[#141414] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl h-fit">
          <h2 className="text-2xl font-black text-white mb-6 uppercase tracking-tight">Nuevo Gimnasio</h2>
          <form onSubmit={handleCreateGym} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Nombre del Gimnasio</label>
              <input
                type="text"
                placeholder="Ej: CrossFit Norte"
                value={gymForm.nombre}
                onChange={e => setGymForm({...gymForm, nombre: e.target.value})}
                className="w-full px-5 py-4 bg-[#1a1a1a] border border-transparent focus:border-[#39FF14] focus:bg-[#0a0a0a] outline-none transition-all rounded-2xl text-white"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Slug (Identificador único)</label>
              <input
                type="text"
                placeholder="ej: box-norte"
                value={gymForm.slug}
                onChange={e => setGymForm({...gymForm, slug: e.target.value.toLowerCase().replace(/\s+/g, '-')})}
                className="w-full px-5 py-4 bg-[#1a1a1a] border border-transparent focus:border-[#39FF14] focus:bg-[#0a0a0a] outline-none transition-all rounded-2xl text-white"
                required
              />
              <p className="text-[10px] text-gray-500 mt-2 ml-1">Este será el identificador en la URL.</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Días de Prueba</label>
              <input
                type="number"
                value={gymForm.trial_days}
                onChange={e => setGymForm({...gymForm, trial_days: parseInt(e.target.value)})}
                className="w-full px-5 py-4 bg-[#1a1a1a] border border-transparent focus:border-[#39FF14] focus:bg-[#0a0a0a] outline-none transition-all rounded-2xl text-white"
                required
                min="1"
              />
            </div>
            <button type="submit" className="w-full py-5 bg-[#39FF14] text-black rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-[#32e612] transition-all shadow-[0_8px_30px_rgb(57,255,20,0.2)]">
              Crear Gimnasio
            </button>
          </form>
        </div>

        <div className="bg-[#141414] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl">
          <h2 className="text-2xl font-black text-white mb-6 uppercase tracking-tight">Gimnasios Registrados</h2>
          <div className="space-y-4">
            {gyms.map(gym => (
              <div key={gym.id} className="p-5 bg-[#1a1a1a] border border-white/5 rounded-3xl flex items-center justify-between group hover:border-[#39FF14]/30 transition-all">
                <div>
                  <h3 className="text-lg font-black text-white uppercase tracking-tighter group-hover:text-[#39FF14] transition-colors">{gym.nombre}</h3>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">ID: {gym.slug}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter ${
                      gym.estado === 'active' ? 'bg-[#39FF14]/10 text-[#39FF14] border border-[#39FF14]/20' : 
                      gym.estado === 'trial' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' : 
                      'bg-red-500/10 text-red-500 border border-red-500/20'
                    }`}>
                      {gym.estado}
                    </span>
                    {gym.trial_ends_at && (
                      <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Gira hasta: {new Date(gym.trial_ends_at).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => handleToggleGymStatus(gym.id, gym.estado)}
                    className={`p-3 rounded-2xl transition-all ${gym.estado === 'active' ? 'bg-orange-500/10 text-orange-400 hover:bg-orange-500/20' : 'bg-[#39FF14]/10 text-[#39FF14] hover:bg-[#39FF14]/20'}`}
                    title={gym.estado === 'active' ? "Suspender" : "Activar"}
                  >
                    {gym.estado === 'active' ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
