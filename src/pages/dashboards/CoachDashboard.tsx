import React, { useState, useEffect } from 'react';
import { Users, Activity, MessageCircle, Calendar } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';

export const CoachDashboard: React.FC = () => {
  const { user } = useAuth();
  const [clases, setClases] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.gym_id) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    const [clasesRes, usuariosRes] = await Promise.all([
      supabase.from('clases').select('*, reservas(id)').eq('gym_id', user?.gym_id),
      supabase.from('usuarios').select('*').eq('gym_id', user?.gym_id).eq('rol', 'alumno')
    ]);
    if (clasesRes.data) setClases(clasesRes.data);
    if (usuariosRes.data) setUsuarios(usuariosRes.data);
    setLoading(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#141414] p-6 rounded-3xl border border-white/5">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-[#39FF14]/10 rounded-xl"><Activity className="w-6 h-6 text-[#39FF14]" /></div>
            <div>
              <h2 className="text-xl font-black uppercase">Mis Clases</h2>
              <p className="text-xs text-gray-400">Gestión de asistencia y horarios</p>
            </div>
          </div>
          <div className="space-y-3">
            {clases.map(clase => (
              <div key={clase.id} className="p-4 bg-[#1a1a1a] rounded-2xl border border-white/5 flex items-center justify-between">
                <div>
                  <p className="font-bold text-white">{clase.nombre_clase}</p>
                  <p className="text-xs text-gray-400 font-mono">{clase.hora_inicio.substring(0, 5)} - {clase.hora_fin?.substring(0, 5)}</p>
                </div>
                <div className="text-[10px] font-bold px-2 py-1 bg-[#39FF14]/10 text-[#39FF14] rounded-lg border border-[#39FF14]/20 uppercase">
                  {clase.reservas?.length || 0} alumnos
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#141414] p-6 rounded-3xl border border-white/5">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-blue-500/10 rounded-xl"><Users className="w-6 h-6 text-blue-500" /></div>
            <div>
              <h2 className="text-xl font-black uppercase">Alumnos</h2>
              <p className="text-xs text-gray-400">Listado rápido de contacto</p>
            </div>
          </div>
          <div className="space-y-3">
            {usuarios.map(alumno => (
              <div key={alumno.id} className="p-4 bg-[#1a1a1a] rounded-2xl border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#0a0a0a] flex items-center justify-center text-gray-500 text-xs font-bold">{alumno.nombre.charAt(0)}</div>
                  <p className="font-bold text-sm">{alumno.nombre}</p>
                </div>
                {alumno.telefono && (
                  <a href={`https://wa.me/${alumno.telefono.replace(/\D/g, '')}`} target="_blank" className="p-2 text-[#39FF14] hover:bg-[#39FF14]/10 rounded-lg transition-colors">
                    <MessageCircle className="w-4 h-4" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
