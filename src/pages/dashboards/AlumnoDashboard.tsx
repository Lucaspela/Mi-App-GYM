import React, { useState, useEffect } from 'react';
import { format, parseISO, startOfWeek, addDays, subWeeks, addWeeks, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, Clock, User, CheckCircle, Trash2, ChevronLeft, ChevronRight, CreditCard, TrendingUp, Info, Activity } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';

export const AlumnoDashboard: React.FC = () => {
  const { user, gym } = useAuth();
  const [activeTab, setActiveTab] = useState<'clases' | 'planes'>('clases');
  const [clases, setClases] = useState<any[]>([]);
  const [misReservas, setMisReservas] = useState<any[]>([]);
  const [planes, setPlanes] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ telefono: user?.telefono || '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([
      fetchClases(),
      fetchMisReservas(),
      fetchPlanes(),
      fetchSettings()
    ]);
    setLoading(false);
  };

  const fetchClases = async () => {
    const { data } = await supabase.from('clases').select('*, reservas(id)').eq('gym_id', user?.gym_id);
    setClases(data || []);
  };

  const fetchMisReservas = async () => {
    const { data } = await supabase
      .from('reservas')
      .select('*, clases(nombre_clase, hora_inicio)')
      .eq('usuario_id', user?.id)
      .order('fecha_reserva', { ascending: false });
    
    if (data) {
      setMisReservas(data.map((r: any) => ({
        ...r,
        nombre_clase: r.clases.nombre_clase,
        hora_inicio: r.clases.hora_inicio
      })));
    }
  };

  const fetchPlanes = async () => {
    const { data } = await supabase.from('planes').select('*').eq('gym_id', user?.gym_id);
    setPlanes(data || []);
  };

  const fetchSettings = async () => {
    const { data } = await supabase.from('settings').select('*').eq('gym_id', user?.gym_id);
    if (data) {
      const s: any = {};
      data.forEach((item: any) => s[item.key] = item.value);
      setSettings(s);
    }
  };

  const reservarClase = async (claseId: string, dateString: string) => {
    try {
      const { data: clase } = await supabase.from('clases').select('capacidad_max').eq('id', claseId).single();
      const { count } = await supabase.from('reservas').select('*', { count: 'exact', head: true }).eq('clase_id', claseId).eq('fecha_reserva', dateString);
      
      if (count !== null && count >= (clase?.capacidad_max || 20)) {
        alert('La clase ya está llena para este día.');
        return;
      }

      const { error } = await supabase
        .from('reservas')
        .insert([{ usuario_id: user?.id, clase_id: claseId, fecha_reserva: dateString, gym_id: user?.gym_id }]);
      
      if (error) {
        if (error.code === '23505') alert('Ya tienes una reserva para esta clase.');
        else throw error;
      } else {
        await fetchMisReservas();
        alert('Clase reservada con éxito');
      }
    } catch (err) {
      alert('Error al reservar');
    }
  };

  const cancelarReserva = async (reservaId: string) => {
    if (!confirm('¿Estás seguro de cancelar esta reserva?')) return;
    const { error } = await supabase.from('reservas').delete().eq('id', reservaId);
    if (!error) await fetchMisReservas();
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('usuarios').update({ telefono: profileForm.telefono }).eq('id', user?.id);
    if (!error) {
      setIsEditingProfile(false);
      alert('Perfil actualizado');
    }
  };

  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(currentWeek, i));

  return (
    <div className="space-y-6">
      <div className="flex gap-2 mb-2 overflow-x-auto pb-2">
        <button 
          onClick={() => setActiveTab('clases')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${activeTab === 'clases' ? 'bg-[#39FF14] text-black shadow-[0_0_15px_rgba(57,255,20,0.3)]' : 'bg-[#1a1a1a] text-gray-400 hover:text-white border border-white/5'}`}
        >
          <Calendar className="w-4 h-4" /> Clases y Reservas
        </button>
        <button 
          onClick={() => setActiveTab('planes')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${activeTab === 'planes' ? 'bg-[#39FF14] text-black shadow-[0_0_15px_rgba(57,255,20,0.3)]' : 'bg-[#1a1a1a] text-gray-400 hover:text-white border border-white/5'}`}
        >
          <CreditCard className="w-4 h-4" /> Planes y Precios
        </button>
      </div>

      {activeTab === 'clases' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-[#141414] p-6 rounded-3xl border border-white/5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-black text-white uppercase tracking-tight">Mi Perfil</h2>
                {!isEditingProfile && (
                  <button onClick={() => setIsEditingProfile(true)} className="text-xs font-bold text-[#39FF14] hover:underline">Editar Teléfono</button>
                )}
              </div>
              {isEditingProfile ? (
                <form onSubmit={handleUpdateProfile} className="flex gap-3">
                  <input
                    type="tel"
                    value={profileForm.telefono}
                    onChange={(e) => setProfileForm({ telefono: e.target.value })}
                    className="flex-1 bg-[#1a1a1a] border border-white/5 p-3 rounded-xl text-white outline-none focus:border-[#39FF14]"
                    required
                  />
                  <button type="submit" className="px-4 py-2 bg-[#39FF14] text-black font-bold rounded-xl text-xs">Guardar</button>
                  <button type="button" onClick={() => setIsEditingProfile(false)} className="px-4 py-2 bg-[#1a1a1a] text-white font-bold rounded-xl text-xs">Cancelar</button>
                </form>
              ) : (
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 rounded-full bg-[#1a1a1a] flex items-center justify-center text-[#39FF14]">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{user?.nombre}</p>
                    <p className="text-xs text-gray-400">{user?.email}</p>
                    <p className="text-xs text-[#39FF14] mt-1 font-mono">{user?.telefono || 'Sin teléfono'}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-[#141414] p-6 rounded-3xl border border-white/5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <h2 className="text-2xl font-black text-white uppercase tracking-tight">Calendario Semanal</h2>
                <div className="flex items-center gap-2 bg-[#1a1a1a] p-1 rounded-xl border border-white/5">
                  <button onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))} className="p-1.5 text-gray-400 hover:text-white rounded-lg"><ChevronLeft className="w-5 h-5" /></button>
                  <span className="text-white font-bold text-sm px-2">{format(currentWeek, 'd MMM', { locale: es })}</span>
                  <button onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))} className="p-1.5 text-gray-400 hover:text-white rounded-lg"><ChevronRight className="w-5 h-5" /></button>
                </div>
              </div>

              <div className="overflow-x-auto pb-4">
                <div className="min-w-[800px] grid grid-cols-7 gap-3">
                  {weekDays.map(day => {
                    const dateString = format(day, 'yyyy-MM-dd');
                    const dayClasses = clases.filter(c => c.dia_semana === day.getDay()).sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));
                    return (
                      <div key={dateString} className="bg-[#0a0a0a] rounded-xl p-3 border border-white/5">
                        <div className="text-center mb-4 border-b border-white/5 pb-2">
                          <div className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">{format(day, 'EEEE', { locale: es })}</div>
                          <div className={`text-xl font-black mt-1 ${isSameDay(day, new Date()) ? 'text-[#39FF14]' : 'text-white'}`}>{format(day, 'd')}</div>
                        </div>
                        <div className="space-y-3">
                          {dayClasses.map(clase => {
                            const yaReservada = misReservas.some(r => r.clase_id === clase.id && r.fecha_reserva === dateString);
                            return (
                              <div key={clase.id} className="bg-[#141414] border border-white/5 p-3 rounded-xl flex flex-col gap-2">
                                <h3 className="font-bold text-white text-sm leading-tight">{clase.nombre_clase}</h3>
                                <div className="text-xs text-gray-400 font-mono">{clase.hora_inicio.substring(0, 5)}</div>
                                {yaReservada ? (
                                  <div className="mt-1 flex items-center justify-center gap-1 text-[#39FF14] font-bold text-[10px] uppercase bg-[#39FF14]/10 py-1.5 rounded-lg border border-[#39FF14]/20"><CheckCircle className="w-3 h-3" /> Reservada</div>
                                ) : (
                                  <button onClick={() => reservarClase(clase.id, dateString)} className="mt-1 w-full py-1.5 bg-[#1a1a1a] text-white text-[10px] uppercase font-bold rounded-lg hover:bg-[#39FF14] hover:text-black transition-colors">Reservar</button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#141414] p-6 rounded-3xl border border-white/5">
            <h2 className="text-xl font-black text-white mb-6 uppercase tracking-tight">Mis Reservas</h2>
            <div className="space-y-4">
              {misReservas.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">Aún no tienes reservas.</p>
              ) : (
                misReservas.map(reserva => (
                  <div key={reserva.id} className="p-4 rounded-xl border border-white/5 bg-[#0a0a0a] relative group">
                    <h3 className="font-bold text-white">{reserva.nombre_clase}</h3>
                    <div className="space-y-1 text-xs text-gray-400 mt-2">
                      <div className="flex items-center gap-2"><Calendar className="w-3 h-3" /> {reserva.fecha_reserva}</div>
                      <div className="flex items-center gap-2"><Clock className="w-3 h-3" /> {reserva.hora_inicio}</div>
                    </div>
                    <button onClick={() => cancelarReserva(reserva.id)} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'planes' && (
        <div className="bg-[#141414] p-8 rounded-3xl border border-white/5">
           <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-[#39FF14]/10 rounded-2xl"><CreditCard className="w-8 h-8 text-[#39FF14]" /></div>
            <div>
              <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Nuestros Planes</h2>
              <p className="text-gray-400 font-medium">Elige el plan que mejor se adapte a ti</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {planes.map(plan => (
              <div key={plan.id} className="bg-[#0a0a0a] border border-white/5 p-6 rounded-2xl hover:border-[#39FF14]/50 transition-all">
                <h3 className="text-xl font-black text-white uppercase mb-2">{plan.nombre}</h3>
                <p className="text-gray-400 text-sm mb-6">{plan.descripcion}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-white">${plan.precio.toLocaleString()}</span>
                  <span className="text-gray-400 text-xs font-bold uppercase tracking-widest">/ mes</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
