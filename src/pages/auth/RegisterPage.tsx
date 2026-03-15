import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Dumbbell, Eye, EyeOff, Info } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { Gym } from '../../types/auth';

export const RegisterPage: React.FC = () => {
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    password: '',
    telefono: '',
    gym_id: ''
  });
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const { register } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchGyms = async () => {
      const { data, error } = await supabase.from('gyms').select('*').eq('estado', 'active');
      if (!error && data) setGyms(data);
    };
    fetchGyms();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.gym_id) {
      setError('Debes seleccionar un gimnasio');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await register(formData);
      // AuthProvider se encargará de la sesión
    } catch (err: any) {
      setError(err.message || 'Error al registrarse');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 font-sans text-white">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-[#1a1a1a] rounded-3xl mb-6 shadow-2xl border border-white/5">
            <Dumbbell className="w-10 h-10 text-[#39FF14]" />
          </div>
          <h1 className="text-4xl font-black text-white mb-2 tracking-tighter uppercase italic">GymFlow</h1>
          <p className="text-gray-400 font-medium tracking-wide uppercase text-[10px]">Crea tu cuenta de alumno</p>
        </div>

        <div className="bg-[#141414] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl">
          <h2 className="text-2xl font-bold text-white mb-8 text-center tracking-tight">Registro de Alumno</h2>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Nombre Completo</label>
              <input
                type="text"
                placeholder="Tu nombre"
                value={formData.nombre}
                onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                className="w-full px-5 py-4 bg-[#1a1a1a] border border-transparent focus:border-[#39FF14] focus:bg-[#0a0a0a] outline-none transition-all rounded-2xl text-white"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Email</label>
              <input
                type="email"
                placeholder="tu@email.com"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full px-5 py-4 bg-[#1a1a1a] border border-transparent focus:border-[#39FF14] focus:bg-[#0a0a0a] outline-none transition-all rounded-2xl text-white"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">WhatsApp</label>
              <input
                type="tel"
                placeholder="+549..."
                value={formData.telefono}
                onChange={(e) => setFormData({...formData, telefono: e.target.value})}
                className="w-full px-5 py-4 bg-[#1a1a1a] border border-transparent focus:border-[#39FF14] focus:bg-[#0a0a0a] outline-none transition-all rounded-2xl text-white"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Contraseña</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="w-full px-5 py-4 bg-[#1a1a1a] border border-transparent focus:border-[#39FF14] focus:bg-[#0a0a0a] outline-none transition-all rounded-2xl text-white pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Seleccionar Gimnasio</label>
              <select
                value={formData.gym_id}
                onChange={(e) => setFormData({...formData, gym_id: e.target.value})}
                className="w-full px-5 py-4 bg-[#1a1a1a] border border-transparent focus:border-[#39FF14] focus:bg-[#0a0a0a] outline-none transition-all rounded-2xl text-white appearance-none"
                required
              >
                <option value="">Elegir gimnasio...</option>
                {gyms.map(g => (
                  <option key={g.id} value={g.id}>{g.nombre}</option>
                ))}
              </select>
            </div>
            
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm font-bold text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-5 bg-[#39FF14] text-black rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-[#32e612] transition-all shadow-[0_8px_30px_rgb(57,255,20,0.2)] disabled:opacity-50"
            >
              {loading ? 'Creando cuenta...' : 'Registrarse'}
            </button>
          </form>

          <p className="mt-8 text-center text-gray-400 text-sm font-medium">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="text-[#39FF14] font-bold hover:underline">
              Inicia Sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
