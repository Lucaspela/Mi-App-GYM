import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { UserProfile, Gym, AuthContextType } from '../../types/auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [gym, setGym] = useState<Gym | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async (userId: string) => {
    try {
      const { data: profile, error: profileError } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        throw new Error(`Error BD: ${profileError.message || JSON.stringify(profileError)}`);
      }
      if (!profile) {
        throw new Error('No se pudo encontrar el perfil del usuario');
      }

      if (profile.estado === 'suspendido') {
        throw new Error('Tu cuenta ha sido suspendida. Contacta al administrador.');
      }

      setUser(profile);

      if (profile.gym_id) {
        const { data: gymData, error: gymError } = await supabase
          .from('gyms')
          .select('*')
          .eq('id', profile.gym_id)
          .single();

        if (gymError) {
          console.error('Error fetching gym:', gymError);
        } else if (gymData) {
          if (gymData.estado === 'inactive' && profile.rol !== 'superadmin') {
            throw new Error('El gimnasio está inactivo. Contacta al soporte.');
          }
          setGym(gymData);
        }
      }
    } catch (err: any) {
      setError(err.message);
      await supabase.auth.signOut();
      setUser(null);
      setGym(null);
    }
  };

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        fetchProfile(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
          setLoading(true);
          await fetchProfile(session.user.id);
          setLoading(false);
        }
      } else {
        setUser(null);
        setGym(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    setError(null);
    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
    if (loginError) throw loginError;
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const register = async (formData: any) => {
    setError(null);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
    });

    if (signUpError) throw signUpError;
    if (!data.user) throw new Error('Error al crear usuario');

    const { error: profileError } = await supabase.from('usuarios').insert([
      {
        id: data.user.id,
        nombre: formData.nombre,
        email: formData.email,
        rol: 'alumno',
        gym_id: formData.gym_id,
        estado: 'activo'
      }
    ]);

    if (profileError) throw profileError;
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  return (
    <AuthContext.Provider value={{ user, gym, loading, error, login, logout, register, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};
