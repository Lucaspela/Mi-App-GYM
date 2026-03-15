import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Dumbbell, Eye, EyeOff, Activity, Info } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const { login, error: authError } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      // El AuthProvider detectará el cambio de sesión y el ProtectedRoute/RoleBasedRoute hará su magia
      // Pero podemos forzar una redirección inicial aquí si queremos
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
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
          <p className="text-gray-400 font-medium tracking-wide uppercase text-[10px]">SaaS Multi-tenant Management</p>
        </div>

        <div className="bg-[#141414] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl">
          <h2 className="text-2xl font-bold text-white mb-8 text-center tracking-tight">Bienvenido</h2>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Email</label>
              <input
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
            
            {(error || authError) && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm font-bold text-center">
                {error || authError}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-5 bg-[#39FF14] text-black rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-[#32e612] transition-all shadow-[0_8px_30px_rgb(57,255,20,0.2)] disabled:opacity-50"
            >
              {loading ? 'Cargando...' : 'Entrar'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <Link 
              to="/forgot-password"
              className="text-gray-400 text-xs hover:text-[#39FF14] transition-colors"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
          
          <p className="mt-8 text-center text-gray-400 text-sm font-medium">
            ¿No tienes cuenta?{' '}
            <Link to="/register" className="text-[#39FF14] font-bold hover:underline">
              Regístrate
            </Link>
          </p>
        </div>

        <div className="mt-6 p-5 bg-[#1a1a1a] rounded-2xl border border-white/5">
          <div className="flex items-center gap-2 text-[#39FF14] mb-2">
            <Info className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">Soporte SaaS</span>
          </div>
          <p className="text-[11px] text-gray-400 leading-relaxed">
            Si eres dueño de un gimnasio y quieres usar nuestra plataforma, contacta con ventas para activar tu periodo de prueba.
          </p>
        </div>
      </div>
    </div>
  );
};
