import React, { useState, useEffect } from 'react';
import { format, parseISO, startOfWeek, addDays, subWeeks, addWeeks, isSameDay, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, Clock, User, LogOut, CheckCircle, Trash2, Edit, Plus, Users, CreditCard, Activity, MessageCircle, ChevronLeft, ChevronRight, BarChart3, TrendingUp, Info, UserMinus, UserCheck, Dumbbell, Eye, EyeOff } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { supabase } from './lib/supabase';

type User = {
  id: string;
  nombre: string;
  email: string;
  rol: 'superadmin' | 'admin' | 'coach' | 'alumno';
  created_at?: string;
  telefono?: string;
  estado?: 'activo' | 'inactivo';
  gym_id?: string;
};

type Gym = {
  id: string;
  nombre: string;
  slug: string;
  estado: 'active' | 'inactive' | 'trial';
  trial_ends_at?: string;
  created_at: string;
};

type Clase = {
  id: string;
  nombre_clase: string;
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
  capacidad_max: number;
  gym_id: string;
};

type Reserva = {
  id: string;
  usuario_id: string;
  clase_id: string;
  fecha_reserva: string;
  estado: string;
  nombre_clase: string;
  hora_inicio: string;
  gym_id: string;
};

type Pago = {
  id: string;
  usuario_id: string;
  nombre_usuario: string;
  monto: number;
  fecha_pago: string;
  vencimiento: string;
  estado_pago: string;
  gym_id: string;
};

type Plan = {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number;
  gym_id: string;
};

type Gasto = {
  id: string;
  descripcion: string;
  monto: number;
  categoria: string;
  fecha: string;
  gym_id: string;
};

const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerForm, setRegisterForm] = useState({
    nombre: '',
    email: '',
    password: '',
    telefono: '',
    gym_id: ''
  });
  const [error, setError] = useState('');
  
  const [clases, setClases] = useState<Clase[]>([]);
  const [misReservas, setMisReservas] = useState<Reserva[]>([]);
  const [usuarios, setUsuarios] = useState<(User & { total_reservas?: number, ultima_reserva?: string, ultimo_pago?: string })[]>([]);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [currentGym, setCurrentGym] = useState<Gym | null>(null);
  const [claseReservas, setClaseReservas] = useState<{ [key: string]: any[] }>({});
  const [expandedClase, setExpandedClase] = useState<string | null>(null);
  const [settings, setSettings] = useState<{ [key: string]: string }>({});
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ telefono: '' });
  
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [activeTab, setActiveTab] = useState<'dashboard' | 'clases' | 'alumnos' | 'pagos' | 'config' | 'planes' | 'gastos' | 'gyms'>('dashboard');
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [supabaseStatus, setSupabaseStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [supabaseError, setSupabaseError] = useState<string | null>(null);

  // Form state for new/edit class
  const [editingClase, setEditingClase] = useState<Clase | null>(null);
  const [claseForm, setClaseForm] = useState({ nombre_clase: '', dia_semana: 1, hora_inicio: '08:00', hora_fin: '09:00', capacidad_max: 20 });
  const [showClaseModal, setShowClaseModal] = useState(false);

  // Form state for new users and payments
  const [usuarioForm, setUsuarioForm] = useState({ nombre: '', email: '', password: '', rol: 'alumno', telefono: '' });
  const [pagoForm, setPagoForm] = useState({ 
    usuario_id: '', 
    monto: 0, 
    fecha_pago: format(new Date(), 'yyyy-MM-dd'), 
    vencimiento: format(new Date(new Date().setMonth(new Date().getMonth() + 1)), 'yyyy-MM-dd'), 
    estado_pago: 'al dia' 
  });

  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [planForm, setPlanForm] = useState({ nombre: '', descripcion: '', precio: 0 });
  const [gastoForm, setGastoForm] = useState({ descripcion: '', monto: 0, categoria: 'otros', fecha: format(new Date(), 'yyyy-MM-dd') });
  const [gymForm, setGymForm] = useState({ nombre: '', slug: '', trial_days: 15 });

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const { data, error } = await supabase.from('gyms').select('id').limit(1);
        if (error) throw error;
        setSupabaseStatus('connected');
        setSupabaseError(null);
        
        // Cargar gimnasios para el registro
        fetchGyms();
      } catch (err: any) {
        console.error('Supabase connection error:', err);
        setSupabaseStatus('error');
        setSupabaseError(err.message || 'Error desconocido');
      }
    };
    checkConnection();
  }, []);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          setIsUpdatingPassword(true);
          return;
        }

        if (session?.user) {
          const { data: userData, error: userError } = await supabase
            .from('usuarios')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (userData) {
            setUser(userData);
            if (userData.rol === 'admin') {
              setActiveTab('dashboard');
            } else if (userData.rol === 'superadmin') {
              setActiveTab('gyms');
            } else {
              setActiveTab('clases');
            }
          } else {
            // User authenticated in Auth but not in our usuarios table
            // This could happen if registration failed halfway
            setUser(null);
          }
        } else {
          setUser(null);
        }
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      const loadAllData = async () => {
        setIsLoading(true);
        try {
          if (user.rol === 'superadmin') {
            await fetchGyms();
            setActiveTab('gyms');
          } else {
            await Promise.all([
              fetchClases(),
              fetchSettings(),
              fetchPlanes(),
              user.rol === 'alumno' ? fetchMisReservas() : Promise.all([
                fetchUsuarios(),
                fetchPagos(),
                fetchGastos(),
                fetchDashboardData()
              ])
            ]);
          }
        } catch (err) {
          console.error("Error loading data:", err);
          setError("Error al cargar los datos. Por favor, intenta de nuevo.");
        } finally {
          setIsLoading(false);
        }
      };
      loadAllData();
      if (user.rol === 'alumno' || user.rol === 'admin') {
        setProfileForm({ telefono: user.telefono || '' });
      }
    }
  }, [user, selectedDate]);

  const fetchGyms = async () => {
    try {
      const { data, error } = await supabase.from('gyms').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setGyms(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDashboardData = async () => {
    if (!user?.gym_id) return;
    try {
      const [
        { count: totalAlumnos },
        { data: activosData },
        { data: pagosData },
        { data: gastosData },
        { data: reservasSemana },
        { data: clasesData }
      ] = await Promise.all([
        supabase.from('usuarios').select('*', { count: 'exact', head: true }).eq('rol', 'alumno').eq('gym_id', user.gym_id),
        supabase.from('reservas').select('usuario_id', { count: 'exact', head: false }).gte('fecha_reserva', format(subWeeks(new Date(), 4), 'yyyy-MM-dd')).eq('gym_id', user.gym_id),
        supabase.from('pagos').select('monto').eq('gym_id', user.gym_id),
        supabase.from('gastos').select('monto').eq('gym_id', user.gym_id),
        supabase.from('reservas').select('fecha_reserva').gte('fecha_reserva', format(subWeeks(new Date(), 1), 'yyyy-MM-dd')).eq('gym_id', user.gym_id),
        supabase.from('clases').select('id, nombre_clase, reservas(id)').eq('gym_id', user.gym_id)
      ]);

      const ingresosTotales = pagosData?.reduce((acc, p) => acc + p.monto, 0) || 0;
      const egresosTotales = gastosData?.reduce((acc, g) => acc + g.monto, 0) || 0;
      
      const reservasMap: { [key: string]: number } = {};
      reservasSemana?.forEach(r => {
        reservasMap[r.fecha_reserva] = (reservasMap[r.fecha_reserva] || 0) + 1;
      });
      const reservasPorDia = Object.entries(reservasMap).map(([date, count]) => ({ date, count }));

      const clasesPopulares = clasesData?.map(c => ({
        name: c.nombre_clase,
        value: c.reservas?.length || 0
      })).sort((a, b) => b.value - a.value).slice(0, 5) || [];

      setDashboardData({
        stats: {
          totalAlumnos: totalAlumnos || 0,
          alumnosActivos: new Set(activosData?.map(r => r.usuario_id)).size,
          ingresosTotales,
          egresosTotales,
          balanceNeto: ingresosTotales - egresosTotales
        },
        reservasPorDia,
        clasesPopulares
      });
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSettings = async () => {
    if (!user?.gym_id) return;
    try {
      const { data, error } = await supabase.from('settings').select('*').eq('gym_id', user.gym_id);
      if (error) throw error;
      const settingsMap: { [key: string]: string } = {};
      data.forEach(s => {
        settingsMap[s.key] = s.value;
      });
      setSettings(settingsMap);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        console.error('Login error:', authError);
        setError('Email o contraseña incorrectos.');
        return;
      }

      if (!data.user) {
        setError('No se pudo obtener el usuario.');
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (userError || !userData) {
        console.error('User data fetch error:', userError);
        setError('Usuario no registrado en el sistema.');
        // Sign out if no user data found to keep state consistent
        await supabase.auth.signOut();
        return;
      }

      // Si no es superadmin, verificar el estado del gimnasio
      if (userData.rol !== 'superadmin') {
        if (!userData.gym_id) {
          setError('Este usuario no está asociado a ningún gimnasio.');
          await supabase.auth.signOut();
          return;
        }

        const { data: gymData, error: gymError } = await supabase
          .from('gyms')
          .select('*')
          .eq('id', userData.gym_id)
          .single();

        if (gymError || !gymData) {
          setError('Error al verificar el gimnasio.');
          await supabase.auth.signOut();
          return;
        }

        if (gymData.estado === 'inactive') {
          setError('Este gimnasio está desactivado. Contacta al administrador.');
          await supabase.auth.signOut();
          return;
        }

        if (gymData.estado === 'trial' && gymData.trial_ends_at) {
          const trialEnd = new Date(gymData.trial_ends_at);
          if (trialEnd < new Date()) {
            setError('El periodo de prueba ha expirado. Contacta al administrador para activar tu cuenta.');
            await supabase.auth.signOut();
            return;
          }
        }
      }

      setUser(userData);
      if (userData.rol === 'admin') {
        setActiveTab('dashboard');
      } else if (userData.rol === 'superadmin') {
        setActiveTab('gyms');
      } else {
        setActiveTab('clases');
      }
    } catch (err: any) {
      setError('Error inesperado al intentar iniciar sesión.');
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });
      if (updateError) throw updateError;
      setIsUpdatingPassword(false);
      setPassword('');
      alert('Contraseña actualizada con éxito. Ya puedes iniciar sesión.');
    } catch (err: any) {
      setError(err.message || 'Error al actualizar la contraseña.');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      if (resetError) throw resetError;
      setResetEmailSent(true);
    } catch (err: any) {
      setError(err.message || 'Error al enviar el correo de recuperación.');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (gyms.length === 0) {
      setError('No hay gimnasios registrados. El sistema está en configuración inicial.');
      return;
    }
    if (!registerForm.gym_id) {
      setError('Debes seleccionar un gimnasio.');
      return;
    }
    try {
      // 1. Sign up in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: registerForm.email,
        password: registerForm.password,
        options: {
          data: {
            nombre: registerForm.nombre,
            rol: 'alumno',
            gym_id: registerForm.gym_id
          }
        }
      });

      if (authError) {
        console.error('Auth registration error:', authError);
        setError(`Error al registrar: ${authError.message}`);
        return;
      }

      if (!authData.user) {
        setError('No se pudo crear el usuario.');
        return;
      }

      // 2. Insert into our usuarios table
      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .insert([{
          id: authData.user.id, // Use the Auth ID
          nombre: registerForm.nombre,
          email: registerForm.email,
          telefono: registerForm.telefono,
          rol: 'alumno',
          gym_id: registerForm.gym_id
        }])
        .select()
        .single();

      if (userError) {
        console.error('User table registration error:', userError);
        setError(`Error al registrar en base de datos: ${userError.message}`);
        return;
      }

      setUser(userData);
      setActiveTab('clases');
    } catch (err: any) {
      setError('Error inesperado durante el registro.');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const fetchClases = async () => {
    if (!user?.gym_id) return;
    try {
      const { data, error } = await supabase
        .from('clases')
        .select(`
          *,
          reservas(id)
        `)
        .eq('gym_id', user.gym_id);
      if (error) throw error;
      setClases(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMisReservas = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('reservas')
        .select(`
          *,
          clases(nombre_clase, hora_inicio)
        `)
        .eq('usuario_id', user.id)
        .order('fecha_reserva', { ascending: false });
      
      if (error) throw error;
      
      // Aplanar la respuesta para que coincida con el tipo Reserva
      const formattedData = data.map(r => ({
        ...r,
        nombre_clase: r.clases.nombre_clase,
        hora_inicio: r.clases.hora_inicio
      }));
      
      setMisReservas(formattedData);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUsuarios = async () => {
    if (!user?.gym_id) return;
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select(`
          *,
          reservas(id, fecha_reserva),
          pagos(id, fecha_pago)
        `)
        .eq('gym_id', user.gym_id);
      
      if (error) throw error;

      const formattedData = data.map(u => {
        const total_reservas = u.reservas?.length || 0;
        const ultima_reserva = u.reservas?.sort((a: any, b: any) => b.fecha_reserva.localeCompare(a.fecha_reserva))[0]?.fecha_reserva;
        const ultimo_pago = u.pagos?.sort((a: any, b: any) => b.fecha_pago.localeCompare(a.fecha_pago))[0]?.fecha_pago;
        return { ...u, total_reservas, ultima_reserva, ultimo_pago };
      });

      setUsuarios(formattedData);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchReservasDeClase = async (claseId: string) => {
    if (!user?.gym_id) return;
    try {
      const { data, error } = await supabase
        .from('reservas')
        .select(`
          *,
          usuarios(nombre)
        `)
        .eq('clase_id', claseId)
        .eq('fecha_reserva', selectedDate)
        .eq('gym_id', user.gym_id);
      
      if (error) throw error;
      
      const formattedData = data.map(r => ({
        ...r,
        nombre_usuario: r.usuarios.nombre
      }));

      setClaseReservas(prev => ({ ...prev, [claseId]: formattedData }));
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPagos = async () => {
    if (!user?.gym_id) return;
    try {
      const { data, error } = await supabase
        .from('pagos')
        .select(`
          *,
          usuarios(nombre)
        `)
        .eq('gym_id', user.gym_id)
        .order('fecha_pago', { ascending: false });
      
      if (error) throw error;

      const formattedData = data.map(p => ({
        ...p,
        nombre_usuario: p.usuarios.nombre
      }));

      setPagos(formattedData);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPlanes = async () => {
    if (!user?.gym_id) return;
    try {
      const { data, error } = await supabase.from('planes').select('*').eq('gym_id', user.gym_id);
      if (error) throw error;
      setPlanes(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchGastos = async () => {
    if (!user?.gym_id) return;
    try {
      const { data, error } = await supabase.from('gastos').select('*').eq('gym_id', user.gym_id).order('fecha', { ascending: false });
      if (error) throw error;
      setGastos(data);
    } catch (err) {
      console.error(err);
    }
  };

  const reservarClase = async (claseId: string, dateString: string) => {
    if (!user || !user.gym_id) return;
    try {
      // Verificar capacidad
      const { data: clase, error: claseError } = await supabase.from('clases').select('capacidad_max').eq('id', claseId).eq('gym_id', user.gym_id).single();
      const { count: reservasCount, error: countError } = await supabase.from('reservas').select('*', { count: 'exact', head: true }).eq('clase_id', claseId).eq('fecha_reserva', dateString).eq('gym_id', user.gym_id);
      
      if (claseError || countError) throw new Error('Error al verificar capacidad');
      if (reservasCount !== null && reservasCount >= (clase?.capacidad_max || 20)) {
        alert('La clase ya está llena para este día.');
        return;
      }

      const { error } = await supabase
        .from('reservas')
        .insert([{ usuario_id: user.id, clase_id: claseId, fecha_reserva: dateString, gym_id: user.gym_id }]);
      
      if (error) {
        if (error.code === '23505') {
          alert('Ya tienes una reserva para esta clase en esta fecha.');
        } else {
          throw error;
        }
      } else {
        fetchClases();
        fetchMisReservas();
        fetchReservasDeClase(claseId);
        alert('Clase reservada con éxito');
      }
    } catch (err) {
      alert('Error al reservar');
    }
  };

  const cancelarReserva = async (reservaId: string, claseId?: string) => {
    if (!confirm('¿Estás seguro de cancelar esta reserva?')) return;
    if (!user?.gym_id) return;
    try {
      const { error } = await supabase.from('reservas').delete().eq('id', reservaId).eq('gym_id', user.gym_id);
      if (error) throw error;
      fetchClases();
      fetchMisReservas();
      if (claseId) fetchReservasDeClase(claseId);
    } catch (err) {
      alert('Error al cancelar');
    }
  };

  const handleSaveClase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.gym_id) return;
    try {
      if (editingClase) {
        const { error } = await supabase.from('clases').update(claseForm).eq('id', editingClase.id).eq('gym_id', user.gym_id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('clases').insert([{ ...claseForm, gym_id: user.gym_id }]);
        if (error) throw error;
      }
      fetchClases();
      setEditingClase(null);
      setClaseForm({ nombre_clase: '', dia_semana: 1, hora_inicio: '08:00', hora_fin: '09:00', capacidad_max: 20 });
      setShowClaseModal(false);
    } catch (err) {
      alert('Error al guardar clase');
    }
  };

  const handleDeleteClase = async (id: string) => {
    if (!confirm('¿Eliminar esta clase? Se borrarán también las reservas asociadas.')) return;
    if (!user?.gym_id) return;
    try {
      const { error } = await supabase.from('clases').delete().eq('id', id).eq('gym_id', user.gym_id);
      if (error) throw error;
      fetchClases();
    } catch (err) {
      alert('Error al eliminar');
    }
  };

  const startEditClase = (clase: Clase) => {
    setEditingClase(clase);
    setClaseForm({
      nombre_clase: clase.nombre_clase,
      dia_semana: clase.dia_semana,
      hora_inicio: clase.hora_inicio,
      hora_fin: clase.hora_fin || '00:00',
      capacidad_max: clase.capacidad_max
    });
    setShowClaseModal(true);
  };

  const openNewClassModal = (dia_semana: number = 1) => {
    setEditingClase(null);
    setClaseForm({ nombre_clase: '', dia_semana, hora_inicio: '08:00', hora_fin: '09:00', capacidad_max: 20 });
    setShowClaseModal(true);
  };

  const handleSaveUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.gym_id) return;
    try {
      // Note: In Supabase Auth, users should ideally register themselves
      // or be created via a secure backend/edge function.
      // For now, we just insert into the usuarios table as requested.
      const { error } = await supabase.from('usuarios').insert([{
        nombre: usuarioForm.nombre,
        email: usuarioForm.email,
        rol: usuarioForm.rol,
        telefono: usuarioForm.telefono,
        gym_id: user.gym_id
      }]);
      if (error) throw error;
      fetchUsuarios();
      setUsuarioForm({ nombre: '', email: '', password: '', rol: 'alumno', telefono: '' });
      alert('Usuario creado con éxito. Nota: El usuario debe registrarse en la plataforma para activar su acceso.');
    } catch (err) {
      alert('Error al guardar usuario');
    }
  };

  const handleDeleteUsuario = async (id: string) => {
    if (!confirm('¿Eliminar este usuario? Se borrarán sus reservas y pagos.')) return;
    if (!user?.gym_id) return;
    try {
      const { error } = await supabase.from('usuarios').delete().eq('id', id).eq('gym_id', user.gym_id);
      if (error) throw error;
      fetchUsuarios();
    } catch (err) {
      alert('Error al eliminar');
    }
  };

  const handleToggleEstado = async (id: string, currentEstado: string) => {
    const nuevoEstado = currentEstado === 'activo' ? 'inactivo' : 'activo';
    if (!user?.gym_id) return;
    try {
      const { error } = await supabase.from('usuarios').update({ estado: nuevoEstado }).eq('id', id).eq('gym_id', user.gym_id);
      if (error) throw error;
      fetchUsuarios();
    } catch (err) {
      alert('Error al cambiar estado');
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      const { error } = await supabase.from('usuarios').update({ telefono: profileForm.telefono }).eq('id', user.id);
      if (error) throw error;
      const updatedUser = { ...user, telefono: profileForm.telefono };
      setUser(updatedUser);
      localStorage.setItem('gym_user', JSON.stringify(updatedUser));
      setIsEditingProfile(false);
      alert('Perfil actualizado');
    } catch (err) {
      alert('Error al actualizar perfil');
    }
  };

  const handleSaveSetting = async (key: string, value: string) => {
    if (!user?.gym_id) return;
    try {
      const { error } = await supabase.from('settings').upsert({ key, value, gym_id: user.gym_id });
      if (error) throw error;
      setSettings(prev => ({ ...prev, [key]: value }));
      alert('Configuración guardada');
    } catch (err) {
      alert('Error al guardar configuración');
    }
  };

  const handleSavePago = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pagoForm.usuario_id) return alert('Selecciona un alumno');
    if (!user?.gym_id) return;
    try {
      const { error } = await supabase.from('pagos').insert([{ 
        usuario_id: pagoForm.usuario_id,
        monto: pagoForm.monto,
        fecha_pago: pagoForm.fecha_pago,
        vencimiento: pagoForm.vencimiento,
        estado_pago: pagoForm.estado_pago,
        gym_id: user.gym_id 
      }]);
      if (error) throw error;
      fetchPagos();
      fetchUsuarios();
      fetchDashboardData();
      setPagoForm({ usuario_id: '', monto: 0, fecha_pago: format(new Date(), 'yyyy-MM-dd'), vencimiento: format(addDays(new Date(), 30), 'yyyy-MM-dd'), estado_pago: 'al dia' });
      alert('Pago registrado con éxito');
    } catch (err) {
      alert('Error al registrar pago');
    }
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.gym_id) return;
    try {
      if (editingPlan) {
        const { error } = await supabase.from('planes').update({
          nombre: planForm.nombre,
          descripcion: planForm.descripcion,
          precio: planForm.precio
        }).eq('id', editingPlan.id).eq('gym_id', user.gym_id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('planes').insert([{ 
          nombre: planForm.nombre,
          descripcion: planForm.descripcion,
          precio: planForm.precio,
          gym_id: user.gym_id 
        }]);
        if (error) throw error;
      }
      fetchPlanes();
      setEditingPlan(null);
      setPlanForm({ nombre: '', descripcion: '', precio: 0 });
      alert('Plan guardado');
    } catch (err) {
      alert('Error al guardar plan');
    }
  };

  const handleDeletePlan = async (id: string) => {
    if (!confirm('¿Eliminar este plan?')) return;
    if (!user?.gym_id) return;
    try {
      const { error } = await supabase.from('planes').delete().eq('id', id).eq('gym_id', user.gym_id);
      if (error) throw error;
      fetchPlanes();
    } catch (err) {
      alert('Error al eliminar');
    }
  };

  const handleSaveGasto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.gym_id) return;
    try {
      const { error } = await supabase.from('gastos').insert([{ 
        descripcion: gastoForm.descripcion,
        monto: gastoForm.monto,
        categoria: gastoForm.categoria,
        fecha: gastoForm.fecha,
        gym_id: user.gym_id 
      }]);
      if (error) throw error;
      fetchGastos();
      fetchDashboardData();
      setGastoForm({ descripcion: '', monto: 0, categoria: 'otros', fecha: format(new Date(), 'yyyy-MM-dd') });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteGasto = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este gasto?')) return;
    if (!user?.gym_id) return;
    try {
      const { error } = await supabase.from('gastos').delete().eq('id', id).eq('gym_id', user.gym_id);
      if (error) throw error;
      fetchGastos();
      fetchDashboardData();
    } catch (err) {
      console.error(err);
    }
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

  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(currentWeek, i));

  if (isLoading && !user) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#39FF14]"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-google-bg flex items-center justify-center p-4 font-sans selection:bg-gym-accent/30">
        <div className="w-full max-w-md">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-google-surface-variant rounded-3xl mb-6 shadow-2xl border border-white/5">
              <Dumbbell className="w-10 h-10 text-gym-accent" />
            </div>
            <h1 className="text-4xl font-black text-white mb-2 tracking-tighter uppercase italic">GymFlow</h1>
            <p className="text-google-text-secondary font-medium tracking-wide uppercase text-[10px]">SaaS Multi-tenant Management</p>
          </div>

          {gyms.length === 0 && !isRegistering && !showAdminLogin ? (
            <div className="bg-google-surface p-8 rounded-[2.5rem] border border-white/5 shadow-2xl text-center">
              <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Info className="w-8 h-8 text-yellow-500" />
              </div>
              <h2 className="text-xl font-bold text-white mb-3 tracking-tight">Configuración Inicial</h2>
              <p className="text-google-text-secondary text-sm mb-8 leading-relaxed">
                El sistema se encuentra en configuración inicial. Por favor, contacta al administrador para dar de alta el primer gimnasio.
              </p>
              <div className="space-y-4">
                <button
                  onClick={() => setShowAdminLogin(true)}
                  className="w-full py-4 bg-gym-accent text-zinc-950 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-[#32e612] transition-all shadow-[0_8px_30px_rgb(57,255,20,0.2)]"
                >
                  Acceso Super Admin
                </button>
              </div>
            </div>
          ) : isUpdatingPassword ? (
            <div className="bg-google-surface p-8 rounded-[2.5rem] border border-white/5 shadow-2xl">
              <h2 className="text-2xl font-bold text-white mb-4 text-center tracking-tight">Nueva Contraseña</h2>
              <form onSubmit={handleUpdatePassword} className="space-y-6">
                <p className="text-google-text-secondary text-sm text-center">
                  Ingresa tu nueva contraseña para recuperar el acceso a tu cuenta.
                </p>
                <div>
                  <label className="block text-xs font-bold text-google-text-secondary uppercase tracking-widest mb-1.5 ml-1">Nueva Contraseña</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-5 py-4 bg-google-surface-variant border border-transparent focus:border-gym-accent focus:bg-google-surface outline-none transition-all rounded-2xl text-white pr-12"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-google-text-secondary hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                {error && <p className="text-red-400 text-sm font-bold text-center">{error}</p>}
                <button
                  type="submit"
                  className="w-full py-5 bg-gym-accent text-zinc-950 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-[#32e612] transition-all shadow-[0_8px_30px_rgb(57,255,20,0.2)]"
                >
                  Actualizar Contraseña
                </button>
              </form>
            </div>
          ) : isResettingPassword ? (
            <div className="bg-google-surface p-8 rounded-[2.5rem] border border-white/5 shadow-2xl">
              <h2 className="text-2xl font-bold text-white mb-4 text-center tracking-tight">Recuperar Contraseña</h2>
              {resetEmailSent ? (
                <div className="text-center space-y-6">
                  <div className="w-16 h-16 bg-gym-accent/10 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle className="w-8 h-8 text-gym-accent" />
                  </div>
                  <p className="text-google-text-secondary text-sm leading-relaxed">
                    Si el correo existe en nuestro sistema, recibirás un enlace para restablecer tu contraseña en unos minutos.
                  </p>
                  <button 
                    onClick={() => { setIsResettingPassword(false); setResetEmailSent(false); }}
                    className="w-full py-4 bg-google-surface-variant text-white rounded-2xl font-bold text-sm hover:bg-white/10 transition-all"
                  >
                    Volver al Login
                  </button>
                </div>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-6">
                  <p className="text-google-text-secondary text-sm text-center">
                    Ingresa tu email y te enviaremos un enlace para recuperar tu acceso.
                  </p>
                  <div>
                    <label className="block text-xs font-bold text-google-text-secondary uppercase tracking-widest mb-1.5 ml-1">Email</label>
                    <input
                      type="email"
                      placeholder="tu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-5 py-4 bg-google-surface-variant border border-transparent focus:border-gym-accent focus:bg-google-surface outline-none transition-all rounded-2xl text-white"
                      required
                    />
                  </div>
                  {error && <p className="text-red-400 text-sm font-bold text-center">{error}</p>}
                  <button
                    type="submit"
                    className="w-full py-5 bg-gym-accent text-zinc-950 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-[#32e612] transition-all shadow-[0_8px_30px_rgb(57,255,20,0.2)]"
                  >
                    Enviar Enlace
                  </button>
                  <button 
                    type="button"
                    onClick={() => { setIsResettingPassword(false); setError(''); }}
                    className="w-full text-google-text-secondary text-xs hover:text-white transition-colors"
                  >
                    ← Volver al Login
                  </button>
                </form>
              )}
            </div>
          ) : isRegistering ? (
            <div className="bg-google-surface p-8 rounded-[2.5rem] border border-white/5 shadow-2xl">
              <h2 className="text-2xl font-bold text-white mb-8 text-center tracking-tight">Crear Cuenta</h2>
              <form onSubmit={handleRegister} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-google-text-secondary uppercase tracking-widest mb-1.5 ml-1">Nombre Completo</label>
                  <input
                    type="text"
                    placeholder="Tu nombre"
                    value={registerForm.nombre}
                    onChange={(e) => setRegisterForm({...registerForm, nombre: e.target.value})}
                    className="w-full px-5 py-4 bg-google-surface-variant border border-transparent focus:border-gym-accent focus:bg-google-surface outline-none transition-all rounded-2xl text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-google-text-secondary uppercase tracking-widest mb-1.5 ml-1">Email</label>
                  <input
                    type="email"
                    placeholder="tu@email.com"
                    value={registerForm.email}
                    onChange={(e) => setRegisterForm({...registerForm, email: e.target.value})}
                    className="w-full px-5 py-4 bg-google-surface-variant border border-transparent focus:border-gym-accent focus:bg-google-surface outline-none transition-all rounded-2xl text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-google-text-secondary uppercase tracking-widest mb-1.5 ml-1">WhatsApp</label>
                  <input
                    type="tel"
                    placeholder="+549..."
                    value={registerForm.telefono}
                    onChange={(e) => setRegisterForm({...registerForm, telefono: e.target.value})}
                    className="w-full px-5 py-4 bg-google-surface-variant border border-transparent focus:border-gym-accent focus:bg-google-surface outline-none transition-all rounded-2xl text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-google-text-secondary uppercase tracking-widest mb-1.5 ml-1">Contraseña</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={registerForm.password}
                      onChange={(e) => setRegisterForm({...registerForm, password: e.target.value})}
                      className="w-full px-5 py-4 bg-google-surface-variant border border-transparent focus:border-gym-accent focus:bg-google-surface outline-none transition-all rounded-2xl text-white pr-12"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-google-text-secondary hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-google-text-secondary uppercase tracking-widest mb-1.5 ml-1">Seleccionar Gimnasio</label>
                  <select
                    value={registerForm.gym_id}
                    onChange={(e) => setRegisterForm({...registerForm, gym_id: e.target.value})}
                    className="w-full px-5 py-4 bg-google-surface-variant border border-transparent focus:border-gym-accent focus:bg-google-surface outline-none transition-all rounded-2xl text-white"
                    required
                  >
                    <option value="">{gyms.length === 0 ? 'Cargando gimnasios...' : 'Elegir gimnasio...'}</option>
                    {gyms.map(g => (
                      <option key={g.id} value={g.id}>{g.nombre}</option>
                    ))}
                  </select>
                  {gyms.length === 0 && (
                    <p className="text-[10px] text-yellow-500 mt-2 ml-1 italic">
                      No hay gimnasios registrados. Contacta al administrador del sistema.
                    </p>
                  )}
                </div>
                {error && <p className="text-red-400 text-sm font-bold text-center">{error}</p>}
                <button
                  type="submit"
                  disabled={gyms.length === 0}
                  className="w-full py-5 bg-gym-accent text-zinc-950 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-[#32e612] transition-all shadow-[0_8px_30px_rgb(57,255,20,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Registrarse
                </button>
              </form>
              <p className="mt-8 text-center text-google-text-secondary text-sm font-medium">
                ¿Ya tienes cuenta?{' '}
                <button onClick={() => { setIsRegistering(false); setError(''); }} className="text-gym-accent font-bold hover:underline">
                  Inicia Sesión
                </button>
              </p>
            </div>
          ) : (
            <div className="bg-google-surface p-8 rounded-[2.5rem] border border-white/5 shadow-2xl">
              <h2 className="text-2xl font-bold text-white mb-8 text-center tracking-tight">Bienvenido</h2>
              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-google-text-secondary uppercase tracking-widest mb-1.5 ml-1">Email</label>
                  <input
                    type="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-5 py-4 bg-google-surface-variant border border-transparent focus:border-gym-accent focus:bg-google-surface outline-none transition-all rounded-2xl text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-google-text-secondary uppercase tracking-widest mb-1.5 ml-1">Contraseña</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-5 py-4 bg-google-surface-variant border border-transparent focus:border-gym-accent focus:bg-google-surface outline-none transition-all rounded-2xl text-white pr-12"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-google-text-secondary hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                {error && <p className="text-red-400 text-sm font-bold text-center">{error}</p>}
                <button
                  type="submit"
                  className="w-full py-5 bg-gym-accent text-zinc-950 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-[#32e612] transition-all shadow-[0_8px_30px_rgb(57,255,20,0.2)]"
                >
                  Entrar
                </button>
              </form>
              <div className="mt-4 text-center">
                <button 
                  onClick={() => { setIsResettingPassword(true); setError(''); }}
                  className="text-google-text-secondary text-xs hover:text-gym-accent transition-colors"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <p className="mt-8 text-center text-google-text-secondary text-sm font-medium">
                ¿No tienes cuenta?{' '}
                <button onClick={() => { setIsRegistering(true); setError(''); }} className="text-gym-accent font-bold hover:underline">
                  Regístrate
                </button>
              </p>
              {gyms.length === 0 && (
                <button 
                  onClick={() => setShowAdminLogin(false)} 
                  className="w-full mt-4 text-google-text-secondary text-xs hover:text-white transition-colors"
                >
                  ← Volver a Configuración Inicial
                </button>
              )}
            </div>
          )}

          <div className="mt-6 p-5 bg-google-surface-variant rounded-2xl border border-white/5">
            <div className="flex items-center gap-2 text-gym-accent mb-2">
              <Info className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Soporte SaaS</span>
            </div>
            <p className="text-[11px] text-google-text-secondary leading-relaxed">
              Si eres dueño de un gimnasio y quieres usar nuestra plataforma, contacta con ventas para activar tu periodo de prueba.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const selectedDayOfWeek = parseISO(selectedDate).getDay();
  const clasesDelDia = clases.filter(c => c.dia_semana === selectedDayOfWeek).sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));

  return (
    <div className="min-h-screen bg-google-bg text-google-text font-sans selection:bg-gym-accent selection:text-zinc-950">
      <header className="bg-google-surface border-b border-white/5 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            {settings.gym_logo ? (
              <img src={settings.gym_logo} alt="Logo" className="w-8 h-8 sm:w-10 sm:h-10 object-contain" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gym-accent rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(57,255,20,0.3)]">
                <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-zinc-950" />
              </div>
            )}
            <h1 className="text-lg sm:text-2xl font-black text-white uppercase tracking-tighter truncate max-w-[150px] sm:max-w-none">
              {settings.gym_name || 'GYM FLOW'}
            </h1>
          </div>
          <div className="flex items-center gap-3 sm:gap-6">
            <div className="hidden md:block text-right">
              <p className="text-sm font-black text-white uppercase">{user.nombre}</p>
              <p className="text-[10px] font-bold text-gym-accent uppercase tracking-widest">{user.rol}</p>
            </div>
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl font-bold text-xs hover:bg-red-500 hover:text-white transition-all active:scale-95"
            >
              <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-between">
            <p className="text-red-500 text-sm font-bold">{error}</p>
            <button 
              onClick={() => setError('')} 
              className="text-red-500/50 hover:text-red-500 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}

        {isLoading && (
          <div className="absolute inset-0 bg-google-bg/50 backdrop-blur-sm z-40 flex items-center justify-center rounded-3xl">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gym-accent"></div>
              <p className="text-gym-accent font-black uppercase tracking-widest text-xs">Sincronizando datos...</p>
            </div>
          </div>
        )}
        
        {/* VISTA ALUMNO */}
        {user.rol === 'alumno' && (
          <div className="space-y-6">
            {/* Tabs Alumno */}
            <div className="flex gap-2 mb-2 overflow-x-auto pb-2">
              <button 
                onClick={() => setActiveTab('clases')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${activeTab === 'clases' ? 'bg-gym-accent text-zinc-950 shadow-[0_0_15px_rgba(57,255,20,0.3)]' : 'bg-google-surface-variant text-google-text-secondary hover:text-white border border-white/5'}`}
              >
                <Calendar className="w-4 h-4" /> Clases y Reservas
              </button>
              <button 
                onClick={() => setActiveTab('planes')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${activeTab === 'planes' ? 'bg-gym-accent text-zinc-950 shadow-[0_0_15px_rgba(57,255,20,0.3)]' : 'bg-google-surface-variant text-google-text-secondary hover:text-white border border-white/5'}`}
              >
                <CreditCard className="w-4 h-4" /> Planes y Precios
              </button>
            </div>

            {activeTab === 'clases' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4">
                <div className="lg:col-span-2 space-y-6">
                  {/* Perfil del Alumno */}
                  <div className="google-card p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-black text-white uppercase tracking-tight">Mi Perfil</h2>
                      {!isEditingProfile && (
                        <button 
                          onClick={() => setIsEditingProfile(true)}
                          className="text-xs font-bold text-gym-accent hover:underline"
                        >
                          Editar Teléfono
                        </button>
                      )}
                    </div>
                    
                    {isEditingProfile ? (
                      <form onSubmit={handleUpdateProfile} className="flex gap-3">
                        <input
                          type="tel"
                          placeholder="Tu número de WhatsApp (ej: +549...)"
                          value={profileForm.telefono}
                          onChange={(e) => setProfileForm({ telefono: e.target.value })}
                          className="flex-1 google-input"
                          required
                        />
                        <button type="submit" className="px-4 py-2 bg-gym-accent text-zinc-950 font-bold rounded-xl text-xs">Guardar</button>
                        <button type="button" onClick={() => setIsEditingProfile(false)} className="px-4 py-2 bg-google-surface-variant text-white font-bold rounded-xl text-xs">Cancelar</button>
                      </form>
                    ) : (
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-google-surface-variant flex items-center justify-center text-gym-accent">
                          <User className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">{user.nombre}</p>
                          <p className="text-xs text-google-text-secondary">{user.email}</p>
                          <p className="text-xs text-gym-accent mt-1 font-mono">
                            {user.telefono ? `WhatsApp: ${user.telefono}` : '⚠️ No has cargado tu teléfono'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="google-card p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                      <h2 className="text-2xl font-black text-white uppercase tracking-tight">Calendario Semanal</h2>
                      <div className="flex items-center gap-2 bg-google-surface p-1 rounded-xl border border-white/5">
                        <button onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))} className="p-1.5 text-google-text-secondary hover:text-white hover:bg-google-surface-variant rounded-lg transition-colors">
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <span className="text-white font-bold text-sm px-2">Semana del {format(currentWeek, 'd MMM', { locale: es })}</span>
                        <button onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))} className="p-1.5 text-google-text-secondary hover:text-white hover:bg-google-surface-variant rounded-lg transition-colors">
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    <div className="overflow-x-auto pb-4">
                      <div className="min-w-[800px] grid grid-cols-7 gap-3">
                        {weekDays.map(day => {
                          const dayOfWeek = day.getDay();
                          const dateString = format(day, 'yyyy-MM-dd');
                          const dayClasses = clases.filter(c => c.dia_semana === dayOfWeek).sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));
                          
                          return (
                            <div key={dateString} className="bg-google-surface rounded-xl p-3 border border-white/5">
                              <div className="text-center mb-4 border-b border-white/5 pb-2">
                                <div className="text-google-text-secondary text-[10px] font-bold uppercase tracking-widest">{format(day, 'EEEE', { locale: es })}</div>
                                <div className={`text-xl font-black mt-1 ${isSameDay(day, new Date()) ? 'text-gym-accent' : 'text-white'}`}>
                                  {format(day, 'd')}
                                </div>
                              </div>
                              <div className="space-y-3">
                                {dayClasses.map(clase => {
                                  const yaReservada = misReservas.some(r => r.clase_id === clase.id && r.fecha_reserva === dateString);
                                  
                                  return (
                                    <div key={clase.id} className="bg-google-surface-variant border border-white/5 p-3 rounded-xl hover:border-gym-accent/30 transition-colors flex flex-col gap-2">
                                      <div className="flex justify-between items-start">
                                        <h3 className="font-bold text-white text-sm leading-tight">{clase.nombre_clase}</h3>
                                      </div>
                                      <div className="text-xs text-google-text-secondary font-mono">
                                        {clase.hora_inicio.substring(0, 5)} - {clase.hora_fin.substring(0, 5)}
                                      </div>
                                      
                                      {yaReservada ? (
                                        <div className="mt-1 flex items-center justify-center gap-1 text-gym-accent font-bold text-[10px] uppercase tracking-wider bg-gym-accent/10 py-1.5 rounded-lg border border-gym-accent/20">
                                          <CheckCircle className="w-3 h-3" /> Reservada
                                        </div>
                                      ) : (
                                        <button
                                          onClick={() => reservarClase(clase.id, dateString)}
                                          className="mt-1 w-full py-1.5 bg-google-surface text-white text-[10px] uppercase tracking-wider font-bold rounded-lg hover:bg-gym-accent hover:text-zinc-950 transition-colors"
                                        >
                                          Reservar
                                        </button>
                                      )}
                                    </div>
                                  );
                                })}
                                {dayClasses.length === 0 && (
                                  <div className="text-center py-4 text-google-text-secondary text-xs italic">
                                    Sin clases
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="google-card p-6">
                    <h2 className="text-xl font-black text-white mb-6 uppercase tracking-tight">Mis Reservas</h2>
                    
                    <div className="space-y-4">
                      {misReservas.length === 0 ? (
                        <p className="text-sm text-google-text-secondary text-center py-8 bg-google-surface rounded-xl border border-dashed border-white/5">Aún no tienes reservas.</p>
                      ) : (
                        misReservas.map(reserva => (
                          <div key={reserva.id} className="p-4 rounded-xl border border-white/5 bg-google-surface relative group">
                            <div className="flex justify-between items-start mb-3">
                              <h3 className="font-bold text-white">{reserva.nombre_clase}</h3>
                              <span className="text-[10px] font-bold px-2 py-1 bg-gym-accent/10 text-gym-accent border border-gym-accent/20 rounded-md uppercase tracking-wider">
                                {reserva.estado}
                              </span>
                            </div>
                            <div className="space-y-2 text-sm text-google-text-secondary">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-google-text-secondary" />
                                {format(parseISO(reserva.fecha_reserva), "d 'de' MMMM, yyyy", { locale: es })}
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-google-text-secondary" />
                                {reserva.hora_inicio.substring(0, 5)}
                              </div>
                            </div>
                            
                            <button
                              onClick={() => cancelarReserva(reserva.id)}
                              className="absolute top-4 right-4 p-2 text-google-text-secondary hover:text-red-400 hover:bg-red-400/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                              title="Cancelar reserva"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
          </div>
        )}

        {activeTab === 'planes' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                <div className="google-card p-8">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-gym-accent/10 rounded-2xl">
                      <CreditCard className="w-8 h-8 text-gym-accent" />
                    </div>
                    <div>
                      <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Nuestros Planes</h2>
                      <p className="text-google-text-secondary font-medium">Elige el plan que mejor se adapte a tu entrenamiento</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {planes.map(plan => (
                      <div key={plan.id} className="bg-google-surface border border-white/5 p-6 rounded-2xl hover:border-gym-accent/50 transition-all group">
                        <h3 className="text-xl font-black text-white uppercase mb-2 group-hover:text-gym-accent transition-colors">{plan.nombre}</h3>
                        <p className="text-google-text-secondary text-sm mb-6">{plan.descripcion}</p>
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-black text-white">${plan.precio.toLocaleString()}</span>
                          <span className="text-google-text-secondary text-xs font-bold uppercase tracking-widest">/ mes</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-white/5">
                    <div className="space-y-4">
                      <h3 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
                        <Info className="w-5 h-5 text-gym-accent" /> Información Adicional
                      </h3>
                      <div className="bg-google-surface p-6 rounded-2xl border border-white/5">
                        <p className="text-google-text-secondary text-sm leading-relaxed">
                          {settings.info_general || 'Consulta por entrenamientos personalizados y otros servicios.'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <h3 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-gym-accent" /> Medios de Pago
                      </h3>
                      <div className="bg-google-surface p-6 rounded-2xl border border-white/5">
                        <p className="text-google-text-secondary text-xs font-bold uppercase tracking-widest mb-2">Alias para Transferencias:</p>
                        <p className="text-2xl font-black text-gym-accent tracking-wider font-mono">
                          {settings.alias_transferencia || 'GYM.FLOW.BOX'}
                        </p>
                        <p className="text-google-text-secondary text-[10px] mt-4 leading-relaxed">
                          Una vez realizada la transferencia, por favor envía el comprobante a tu coach para que registre tu pago en el sistema.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* VISTA ADMIN / COACH / SUPERADMIN */}
        {(user.rol === 'admin' || user.rol === 'coach' || user.rol === 'superadmin') && (
          <div className="space-y-6">
            
            {/* Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {user.rol === 'admin' && (
                <button 
                  onClick={() => setActiveTab('dashboard')}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${activeTab === 'dashboard' ? 'bg-gym-accent text-zinc-950 shadow-[0_0_15px_rgba(57,255,20,0.3)]' : 'bg-google-surface-variant text-google-text-secondary hover:text-white border border-white/5'}`}
                >
                  <BarChart3 className="w-4 h-4" /> Dashboard
                </button>
              )}
              <button 
                onClick={() => setActiveTab('clases')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${activeTab === 'clases' ? 'bg-gym-accent text-zinc-950 shadow-[0_0_15px_rgba(57,255,20,0.3)]' : 'bg-google-surface-variant text-google-text-secondary hover:text-white border border-white/5'}`}
              >
                <Activity className="w-4 h-4" /> Gestión de Clases
              </button>
              <button 
                onClick={() => setActiveTab('alumnos')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${activeTab === 'alumnos' ? 'bg-gym-accent text-zinc-950 shadow-[0_0_15px_rgba(57,255,20,0.3)]' : 'bg-google-surface-variant text-google-text-secondary hover:text-white border border-white/5'}`}
              >
                <Users className="w-4 h-4" /> Alumnos ({usuarios.filter(u => u.rol === 'alumno').length})
              </button>
              {user.rol === 'admin' && (
                <button 
                  onClick={() => setActiveTab('pagos')}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${activeTab === 'pagos' ? 'bg-gym-accent text-zinc-950 shadow-[0_0_15px_rgba(57,255,20,0.3)]' : 'bg-google-surface-variant text-google-text-secondary hover:text-white border border-white/5'}`}
                >
                  <CreditCard className="w-4 h-4" /> Pagos
                </button>
              )}
              {user.rol === 'admin' && (
                <button 
                  onClick={() => setActiveTab('gastos')}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${activeTab === 'gastos' ? 'bg-gym-accent text-zinc-950 shadow-[0_0_15px_rgba(57,255,20,0.3)]' : 'bg-google-surface-variant text-google-text-secondary hover:text-white border border-white/5'}`}
                >
                  <TrendingUp className="w-4 h-4 rotate-180" /> Gastos
                </button>
              )}
              {user.rol === 'admin' && (
                <button 
                  onClick={() => setActiveTab('config')}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${activeTab === 'config' ? 'bg-gym-accent text-zinc-950 shadow-[0_0_15px_rgba(57,255,20,0.3)]' : 'bg-google-surface-variant text-google-text-secondary hover:text-white border border-white/5'}`}
                >
                  <Activity className="w-4 h-4" /> Configuración
                </button>
              )}
              {user.rol === 'superadmin' && (
                <button 
                  onClick={() => setActiveTab('gyms')}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${activeTab === 'gyms' ? 'bg-gym-accent text-zinc-950 shadow-[0_0_15px_rgba(57,255,20,0.3)]' : 'bg-google-surface-variant text-google-text-secondary hover:text-white border border-white/5'}`}
                >
                  <Activity className="w-4 h-4" /> Gestión de Gimnasios
                </button>
              )}
            </div>

            {/* Tab: Dashboard */}
            {activeTab === 'dashboard' && user.rol === 'admin' && dashboardData && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="google-card p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-blue-500/10 rounded-xl">
                        <Users className="w-6 h-6 text-blue-500" />
                      </div>
                      <span className="text-[10px] font-bold text-google-text-secondary uppercase tracking-widest">Alumnos Totales</span>
                    </div>
                    <p className="text-4xl font-black text-white">{dashboardData.stats.totalAlumnos}</p>
                    <p className="text-xs text-google-text-secondary mt-2">Registrados en el sistema</p>
                  </div>
                  <div className="google-card p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-gym-accent/10 rounded-xl">
                        <TrendingUp className="w-6 h-6 text-gym-accent" />
                      </div>
                      <span className="text-[10px] font-bold text-google-text-secondary uppercase tracking-widest">Alumnos Activos</span>
                    </div>
                    <p className="text-4xl font-black text-white">{dashboardData.stats.alumnosActivos}</p>
                    <p className="text-xs text-google-text-secondary mt-2">Reservas en los últimos 30 días</p>
                  </div>
                  <div className="google-card p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-emerald-500/10 rounded-xl">
                        <CreditCard className="w-6 h-6 text-emerald-500" />
                      </div>
                      <span className="text-[10px] font-bold text-google-text-secondary uppercase tracking-widest">Ingresos Totales</span>
                    </div>
                    <p className="text-4xl font-black text-white">${dashboardData.stats.ingresosTotales.toLocaleString()}</p>
                    <p className="text-xs text-google-text-secondary mt-2">Histórico de cobros registrados</p>
                  </div>
                  <div className="google-card p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-red-500/10 rounded-xl">
                        <TrendingUp className="w-6 h-6 text-red-500 rotate-180" />
                      </div>
                      <span className="text-[10px] font-bold text-google-text-secondary uppercase tracking-widest">Gastos Totales</span>
                    </div>
                    <p className="text-4xl font-black text-white">${dashboardData.stats.egresosTotales.toLocaleString()}</p>
                    <p className="text-xs text-google-text-secondary mt-2">Histórico de gastos registrados</p>
                  </div>
                  <div className="google-card p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-gym-accent/10 rounded-xl">
                        <BarChart3 className="w-6 h-6 text-gym-accent" />
                      </div>
                      <span className="text-[10px] font-bold text-google-text-secondary uppercase tracking-widest">Balance Neto</span>
                    </div>
                    <p className={`text-4xl font-black ${dashboardData.stats.balanceNeto >= 0 ? 'text-gym-accent' : 'text-red-500'}`}>
                      ${dashboardData.stats.balanceNeto.toLocaleString()}
                    </p>
                    <p className="text-xs text-google-text-secondary mt-2">Ingresos - Gastos</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="google-card p-6">
                    <h3 className="text-lg font-black text-white mb-6 uppercase tracking-tight">Reservas (Últimos 7 días)</h3>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dashboardData.reservasPorDia}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                          <XAxis dataKey="date" stroke="#71717a" fontSize={10} tickFormatter={(val) => format(parseISO(val), 'dd/MM')} />
                          <YAxis stroke="#71717a" fontSize={10} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#1e1e1e', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px' }}
                            itemStyle={{ color: '#39FF14', fontWeight: 'bold' }}
                          />
                          <Bar dataKey="count" fill="#39FF14" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="google-card p-6">
                    <h3 className="text-lg font-black text-white mb-6 uppercase tracking-tight">Clases más Populares</h3>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={dashboardData.clasesPopulares}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {dashboardData.clasesPopulares.map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={['#39FF14', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b'][index % 5]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#1e1e1e', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-4">
                      {dashboardData.clasesPopulares.map((clase: any, index: number) => (
                        <div key={index} className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ['#39FF14', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b'][index % 5] }} />
                          <span className="text-[10px] text-google-text-secondary font-bold uppercase truncate">{clase.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Clases */}
            {activeTab === 'clases' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                  <div className="google-card p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                      <h2 className="text-xl font-black text-white uppercase tracking-tight">Todas las Clases</h2>
                      <div className="flex items-center gap-2 bg-google-surface p-1 rounded-xl border border-white/5">
                        <Calendar className="w-4 h-4 text-gym-accent ml-2" />
                        <input
                          type="date"
                          value={selectedDate}
                          onChange={(e) => setSelectedDate(e.target.value)}
                          className="bg-transparent border-none text-white px-3 py-1 text-xs focus:ring-0 outline-none"
                        />
                      </div>
                    </div>
                    <div className="space-y-6">
                      {diasSemana.map((nombreDia, indexDia) => {
                        const clasesDelDiaAdmin = clases.filter(c => c.dia_semana === indexDia).sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));
                        
                        if (clasesDelDiaAdmin.length === 0) return null;

                        return (
                          <div key={indexDia} className="space-y-3">
                            <h3 className="text-gym-accent font-bold uppercase tracking-wider text-sm border-b border-white/5 pb-2">{nombreDia}</h3>
                            {clasesDelDiaAdmin.map(clase => (
                              <div key={clase.id} className="space-y-2">
                                <div className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-google-surface hover:border-gym-accent/20 transition-colors">
                                  <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 bg-google-surface-variant border border-white/5 text-white rounded-xl flex items-center justify-center font-black text-lg shadow-inner">
                                      {clase.hora_inicio.substring(0, 5)}
                                    </div>
                                    <div>
                                      <h4 className="font-bold text-white text-lg">{clase.nombre_clase}</h4>
                                      <div className="flex items-center gap-3 text-xs text-google-text-secondary mt-1 font-mono">
                                        <span>{clase.hora_inicio.substring(0, 5)} - {clase.hora_fin.substring(0, 5)}</span>
                                        <span>•</span>
                                        <button 
                                          onClick={() => {
                                            if (expandedClase === clase.id) setExpandedClase(null);
                                            else {
                                              setExpandedClase(clase.id);
                                              fetchReservasDeClase(clase.id);
                                            }
                                          }}
                                          className={`flex items-center gap-1 px-2 py-0.5 rounded-md border transition-colors ${
                                            (clase as any).reservas_count > 0 ? 'bg-gym-accent/10 text-gym-accent border-gym-accent/20 hover:bg-gym-accent/20' : 'bg-google-surface-variant text-google-text-secondary border-white/5'
                                          }`}
                                        >
                                          <Users className="w-3 h-3" /> {(clase as any).reservas_count || 0} / {clase.capacidad_max}
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-2">
                                    <button onClick={() => startEditClase(clase)} className="p-2 text-google-text-secondary hover:text-gym-accent hover:bg-gym-accent/10 rounded-lg transition-colors" title="Editar horario">
                                      <Edit className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDeleteClase(clase.id)} className="p-2 text-google-text-secondary hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors" title="Eliminar horario">
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>

                                {expandedClase === clase.id && (
                                  <div className="ml-4 p-4 bg-google-surface-variant rounded-xl border border-white/5 space-y-3 animate-in fade-in slide-in-from-top-2">
                                    <h5 className="text-[10px] font-bold text-google-text-secondary uppercase tracking-widest flex items-center gap-2">
                                      <Users className="w-3 h-3" /> Alumnos anotados para hoy
                                    </h5>
                                    <div className="space-y-2">
                                      {claseReservas[clase.id]?.length > 0 ? (
                                        claseReservas[clase.id].map((res: any) => (
                                          <div key={res.reserva_id} className="flex items-center justify-between p-2 bg-google-surface rounded-lg border border-white/5">
                                            <div className="flex items-center gap-3">
                                              <div className="w-8 h-8 rounded-full bg-google-surface-variant flex items-center justify-center text-google-text-secondary text-xs">
                                                {res.nombre.charAt(0)}
                                              </div>
                                              <div>
                                                <p className="text-xs font-bold text-white">{res.nombre}</p>
                                                <p className="text-[10px] text-google-text-secondary">{res.email}</p>
                                              </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              {res.telefono && (
                                                <a href={`https://wa.me/${res.telefono.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="p-1.5 text-gym-accent hover:bg-gym-accent/10 rounded-md transition-colors">
                                                  <MessageCircle className="w-3.5 h-3.5" />
                                                </a>
                                              )}
                                              <button onClick={() => cancelarReserva(res.reserva_id)} className="p-1.5 text-google-text-secondary hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors">
                                                <Trash2 className="w-3.5 h-3.5" />
                                              </button>
                                            </div>
                                          </div>
                                        ))
                                      ) : (
                                        <p className="text-xs text-google-text-secondary italic py-2">No hay alumnos anotados aún.</p>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        );
                      })}
                      {clases.length === 0 && (
                        <div className="text-center py-8 text-google-text-secondary bg-google-surface rounded-xl border border-dashed border-white/5">
                          No hay clases registradas en el sistema.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="google-card p-6 h-fit sticky top-24">
                  <h2 className="text-xl font-black text-white mb-6 uppercase tracking-tight">
                    {editingClase ? 'Editar Clase' : 'Nueva Clase'}
                  </h2>
                  <form onSubmit={handleSaveClase} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-google-text-secondary uppercase tracking-wider mb-1.5">Nombre</label>
                      <input
                        type="text"
                        value={claseForm.nombre_clase}
                        onChange={e => setClaseForm({...claseForm, nombre_clase: e.target.value})}
                        className="w-full google-input"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-google-text-secondary uppercase tracking-wider mb-1.5">Día</label>
                        <select
                          value={claseForm.dia_semana}
                          onChange={e => setClaseForm({...claseForm, dia_semana: parseInt(e.target.value)})}
                          className="w-full google-input"
                        >
                          {diasSemana.map((dia, idx) => (
                            <option key={idx} value={idx}>{dia}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-google-text-secondary uppercase tracking-wider mb-1.5">Hora Inicio</label>
                        <input
                          type="time"
                          value={claseForm.hora_inicio}
                          onChange={e => setClaseForm({...claseForm, hora_inicio: e.target.value})}
                          className="w-full google-input"
                          required
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-google-text-secondary uppercase tracking-wider mb-1.5">Hora Fin</label>
                        <input
                          type="time"
                          value={claseForm.hora_fin}
                          onChange={e => setClaseForm({...claseForm, hora_fin: e.target.value})}
                          className="w-full google-input"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-google-text-secondary uppercase tracking-wider mb-1.5">Capacidad</label>
                        <input
                          type="number"
                          min="1"
                          value={claseForm.capacidad_max}
                          onChange={e => setClaseForm({...claseForm, capacidad_max: parseInt(e.target.value)})}
                          className="w-full google-input"
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="pt-4 flex gap-2">
                      <button
                        type="submit"
                        className="flex-1 bg-gym-accent text-zinc-950 py-3 rounded-xl font-bold text-sm hover:bg-[#32e612] transition-colors shadow-[0_0_20px_rgba(57,255,20,0.2)]"
                      >
                        {editingClase ? 'Actualizar' : 'Crear'}
                      </button>
                      {editingClase && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingClase(null);
                            setClaseForm({ nombre_clase: '', dia_semana: 1, hora_inicio: '08:00', capacidad_max: 20 });
                          }}
                          className="px-4 py-3 bg-google-surface-variant text-white rounded-xl font-bold text-sm hover:bg-google-surface transition-colors"
                        >
                          Cancelar
                        </button>
                      )}
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Tab: Alumnos */}
            {activeTab === 'alumnos' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 google-card p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-black text-white uppercase tracking-tight">Directorio de Alumnos</h2>
                    <div className="px-3 py-1 bg-google-surface-variant rounded-lg text-[10px] font-bold text-google-text-secondary uppercase tracking-widest">
                      Total: {usuarios.filter(u => u.rol === 'alumno').length}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {usuarios.filter(u => u.rol === 'alumno').map(alumno => {
                      const diasInactivo = alumno.ultima_reserva 
                        ? differenceInDays(new Date(), parseISO(alumno.ultima_reserva)) 
                        : 999;
                      const esInactivoPorFalta = diasInactivo >= 10;
                      const esBaja = alumno.estado === 'inactivo';
                      
                      const template = settings.motivational_message || '¡Hola {nombre}! Hace {dias} días que no te vemos por el box. ¡Te extrañamos! Animate a reservar tu clase hoy y volver a entrenar con todo. 💪🔥';
                      const mensajeMotivacional = template
                        .replace('{nombre}', alumno.nombre.split(' ')[0])
                        .replace('{dias}', diasInactivo === 999 ? 'mucho' : String(diasInactivo));

                      return (
                        <div key={alumno.id} className={`p-4 rounded-xl border transition-all flex items-start justify-between gap-4 group ${esBaja ? 'opacity-50 grayscale bg-google-surface border-white/5' : esInactivoPorFalta ? 'bg-red-500/5 border-red-500/20' : 'bg-google-surface-variant border-white/5'}`}>
                          <div className="flex items-start gap-4">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${esBaja ? 'bg-google-surface-variant text-google-text-secondary' : esInactivoPorFalta ? 'bg-red-500/10 text-red-400' : 'bg-google-surface text-google-text-secondary'}`}>
                              <User className="w-6 h-6" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-bold text-white">{alumno.nombre}</h3>
                                {esBaja ? (
                                  <span className="px-1.5 py-0.5 bg-google-surface-variant border border-white/5 rounded text-[8px] font-black uppercase tracking-tighter text-google-text-secondary">
                                    Baja
                                  </span>
                                ) : esInactivoPorFalta && (
                                  <span className="px-1.5 py-0.5 bg-red-500/20 border border-red-500/30 rounded text-[8px] font-black uppercase tracking-tighter text-red-400">
                                    Inactivo
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-google-text-secondary mb-2">{alumno.email}</p>
                              
                              <div className="flex flex-wrap gap-2">
                                <div className="px-2 py-0.5 bg-google-surface rounded border border-white/5 text-[9px] font-bold uppercase tracking-wider text-google-text-secondary">
                                  {alumno.total_reservas || 0} Clases
                                </div>
                                {!esBaja && alumno.telefono && (
                                  <div className="flex gap-1">
                                    <a
                                      href={`https://wa.me/${alumno.telefono.replace(/\D/g, '')}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-gym-accent hover:text-[#32e612] bg-gym-accent/10 px-2 py-0.5 rounded border border-gym-accent/20 transition-colors"
                                    >
                                      <MessageCircle className="w-2.5 h-2.5" /> WhatsApp
                                    </a>
                                    {esInactivoPorFalta && (
                                      <a
                                        href={`https://wa.me/${alumno.telefono.replace(/\D/g, '')}?text=${encodeURIComponent(mensajeMotivacional)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-white bg-red-500 hover:bg-red-600 px-2 py-0.5 rounded border border-red-400 transition-colors shadow-[0_0_10px_rgba(239,68,68,0.3)]"
                                      >
                                        Motivar
                                      </a>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          {user.rol === 'admin' && (
                            <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => handleToggleEstado(alumno.id, alumno.estado || 'activo')} 
                                title={esBaja ? "Dar de Alta" : "Dar de Baja"}
                                className={`p-2 rounded-lg transition-colors ${esBaja ? 'text-gym-accent hover:bg-gym-accent/10' : 'text-orange-400 hover:bg-orange-400/10'}`}
                              >
                                {esBaja ? <UserCheck className="w-4 h-4" /> : <UserMinus className="w-4 h-4" />}
                              </button>
                              <button 
                                onClick={() => handleDeleteUsuario(alumno.id)} 
                                title="Eliminar Definitivamente"
                                className="p-2 text-google-text-secondary hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {user.rol === 'admin' && (
                  <div className="google-card p-6 h-fit sticky top-24">
                    <h2 className="text-xl font-black text-white mb-6 uppercase tracking-tight">Nuevo Alumno</h2>
                    <form onSubmit={handleSaveUsuario} className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-google-text-secondary uppercase tracking-wider mb-1.5">Nombre</label>
                        <input type="text" value={usuarioForm.nombre} onChange={e => setUsuarioForm({...usuarioForm, nombre: e.target.value})} className="w-full google-input" required />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-google-text-secondary uppercase tracking-wider mb-1.5">Email</label>
                        <input type="email" value={usuarioForm.email} onChange={e => setUsuarioForm({...usuarioForm, email: e.target.value})} className="w-full google-input" required />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-google-text-secondary uppercase tracking-wider mb-1.5">Teléfono (WhatsApp)</label>
                        <input type="tel" placeholder="Ej: 5491123456789" value={usuarioForm.telefono} onChange={e => setUsuarioForm({...usuarioForm, telefono: e.target.value})} className="w-full google-input" />
                      </div>
                      <button type="submit" className="w-full bg-gym-accent text-zinc-950 py-3 rounded-xl font-bold text-sm hover:bg-[#32e612] transition-colors mt-2 shadow-[0_0_20px_rgba(57,255,20,0.2)]">
                        Registrar Alumno
                      </button>
                    </form>
                  </div>
                )}
              </div>
            )}

            {/* Tab: Pagos */}
            {activeTab === 'pagos' && user.rol === 'admin' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 google-card p-6">
                  <h2 className="text-xl font-black text-white mb-6 uppercase tracking-tight">Movimientos de Pagos</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="text-[10px] text-google-text-secondary uppercase border-b border-white/5">
                        <tr>
                          <th className="px-4 py-3 font-bold">Alumno</th>
                          <th className="px-4 py-3 font-bold">Monto</th>
                          <th className="px-4 py-3 font-bold">Fecha Pago</th>
                          <th className="px-4 py-3 font-bold">Vencimiento</th>
                          <th className="px-4 py-3 font-bold">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {pagos.map(pago => (
                          <tr key={pago.id} className="hover:bg-white/5 transition-colors">
                            <td className="px-4 py-4 font-bold text-white">{pago.nombre_usuario}</td>
                            <td className="px-4 py-4 font-mono text-gym-accent">${pago.monto.toLocaleString()}</td>
                            <td className="px-4 py-4 text-google-text-secondary">{pago.fecha_pago}</td>
                            <td className="px-4 py-4 text-google-text-secondary">{pago.vencimiento}</td>
                            <td className="px-4 py-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter ${
                                pago.estado_pago === 'al dia' ? 'bg-gym-accent/20 text-gym-accent border border-gym-accent/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
                              }`}>
                                {pago.estado_pago}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="google-card p-6 h-fit sticky top-24">
                  <h2 className="text-xl font-black text-white mb-6 uppercase tracking-tight">Registrar Pago</h2>
                  <form onSubmit={handleSavePago} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-google-text-secondary uppercase tracking-wider mb-1.5">Alumno</label>
                      <select value={pagoForm.usuario_id} onChange={e => setPagoForm({...pagoForm, usuario_id: parseInt(e.target.value)})} className="w-full google-input" required>
                        <option value={0}>Seleccionar alumno...</option>
                        {usuarios.filter(u => u.rol === 'alumno').map(u => (
                          <option key={u.id} value={u.id}>{u.nombre}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-google-text-secondary uppercase tracking-wider mb-1.5">Monto ($)</label>
                      <input type="number" step="0.01" value={pagoForm.monto} onChange={e => setPagoForm({...pagoForm, monto: parseFloat(e.target.value)})} className="w-full google-input" required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-google-text-secondary uppercase tracking-wider mb-1.5">Fecha Pago</label>
                        <input type="date" value={pagoForm.fecha_pago} onChange={e => setPagoForm({...pagoForm, fecha_pago: e.target.value})} className="w-full google-input" required />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-google-text-secondary uppercase tracking-wider mb-1.5">Vencimiento</label>
                        <input type="date" value={pagoForm.vencimiento} onChange={e => setPagoForm({...pagoForm, vencimiento: e.target.value})} className="w-full google-input" required />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-google-text-secondary uppercase tracking-wider mb-1.5">Estado</label>
                      <select value={pagoForm.estado_pago} onChange={e => setPagoForm({...pagoForm, estado_pago: e.target.value})} className="w-full google-input">
                        <option value="al dia">Al día</option>
                        <option value="vencido">Vencido</option>
                      </select>
                    </div>
                    <button type="submit" className="w-full bg-gym-accent text-zinc-950 py-3 rounded-xl font-bold text-sm hover:bg-[#32e612] transition-colors mt-2 shadow-[0_0_20px_rgba(57,255,20,0.2)]">
                      Registrar Pago
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* Tab: Configuración */}
            {activeTab === 'config' && user.rol === 'admin' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4">
                <div className="space-y-8">
                  <div className="google-card p-8">
                    <h2 className="text-2xl font-black text-white mb-6 uppercase tracking-tight">Identidad del Box</h2>
                    
                    <div className="space-y-6">
                      <div className="space-y-3">
                        <label className="block text-xs font-bold text-google-text-secondary uppercase tracking-widest">Nombre del Box</label>
                        <input
                          type="text"
                          placeholder="Ej: Mi Box CrossFit"
                          value={settings.gym_name || ''}
                          onChange={(e) => setSettings({ ...settings, gym_name: e.target.value })}
                          className="w-full google-input"
                        />
                        <button
                          onClick={() => handleSaveSetting('gym_name', settings.gym_name)}
                          className="w-full py-2 bg-google-surface-variant text-white font-bold rounded-lg hover:bg-gym-accent hover:text-zinc-950 transition-colors text-xs uppercase tracking-widest"
                        >
                          Guardar Nombre
                        </button>
                      </div>

                      <div className="space-y-3 pt-4 border-t border-white/5">
                        <label className="block text-xs font-bold text-google-text-secondary uppercase tracking-widest">URL del Logo (Imagen)</label>
                        <input
                          type="text"
                          placeholder="https://ejemplo.com/logo.png"
                          value={settings.gym_logo || ''}
                          onChange={(e) => setSettings({ ...settings, gym_logo: e.target.value })}
                          className="w-full google-input"
                        />
                        <button
                          onClick={() => handleSaveSetting('gym_logo', settings.gym_logo)}
                          className="w-full py-2 bg-google-surface-variant text-white font-bold rounded-lg hover:bg-gym-accent hover:text-zinc-950 transition-colors text-xs uppercase tracking-widest"
                        >
                          Guardar Logo
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="google-card p-8">
                    <h2 className="text-2xl font-black text-white mb-6 uppercase tracking-tight">Configuración General</h2>
                    
                    <div className="space-y-6">
                      <div className="space-y-3">
                        <label className="block text-xs font-bold text-google-text-secondary uppercase tracking-widest">Mensaje Motivacional (WhatsApp)</label>
                        <p className="text-[10px] text-google-text-secondary mb-2">Usa <span className="text-gym-accent">{'{nombre}'}</span> y <span className="text-gym-accent">{'{dias}'}</span>.</p>
                        <textarea
                          value={settings.motivational_message || ''}
                          onChange={(e) => setSettings({ ...settings, motivational_message: e.target.value })}
                          className="w-full h-24 px-4 py-3 google-input resize-none"
                        />
                        <button
                          onClick={() => handleSaveSetting('motivational_message', settings.motivational_message)}
                          className="w-full py-2 bg-google-surface-variant text-white font-bold rounded-lg hover:bg-gym-accent hover:text-zinc-950 transition-colors text-xs uppercase tracking-widest"
                        >
                          Guardar Mensaje
                        </button>
                      </div>

                      <div className="space-y-3 pt-4 border-t border-white/5">
                        <label className="block text-xs font-bold text-google-text-secondary uppercase tracking-widest">Alias para Transferencias</label>
                        <input
                          type="text"
                          value={settings.alias_transferencia || ''}
                          onChange={(e) => setSettings({ ...settings, alias_transferencia: e.target.value })}
                          className="w-full google-input"
                          placeholder="GYM.FLOW.BOX"
                        />
                        <button
                          onClick={() => handleSaveSetting('alias_transferencia', settings.alias_transferencia)}
                          className="w-full py-2 bg-google-surface-variant text-white font-bold rounded-lg hover:bg-gym-accent hover:text-zinc-950 transition-colors text-xs uppercase tracking-widest"
                        >
                          Guardar Alias
                        </button>
                      </div>

                      <div className="space-y-3 pt-4 border-t border-white/5">
                        <label className="block text-xs font-bold text-google-text-secondary uppercase tracking-widest">Información General (Planes)</label>
                        <textarea
                          value={settings.info_general || ''}
                          onChange={(e) => setSettings({ ...settings, info_general: e.target.value })}
                          className="w-full h-24 px-4 py-3 google-input resize-none"
                          placeholder="Consulta por entrenamientos personalizados..."
                        />
                        <button
                          onClick={() => handleSaveSetting('info_general', settings.info_general)}
                          className="w-full py-2 bg-google-surface-variant text-white font-bold rounded-lg hover:bg-gym-accent hover:text-zinc-950 transition-colors text-xs uppercase tracking-widest"
                        >
                          Guardar Información
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="google-card p-8">
                    <h2 className="text-2xl font-black text-white mb-6 uppercase tracking-tight">Gestión de Planes</h2>
                    
                    <form onSubmit={handleSavePlan} className="space-y-4 mb-8 bg-google-surface-variant p-6 rounded-2xl border border-white/5">
                      <h3 className="text-sm font-black text-gym-accent uppercase tracking-widest mb-4">
                        {editingPlan ? 'Editar Plan' : 'Nuevo Plan'}
                      </h3>
                      <div className="space-y-4">
                        <input
                          type="text"
                          placeholder="Nombre del Plan (ej: 12 Clases)"
                          value={planForm.nombre}
                          onChange={e => setPlanForm({...planForm, nombre: e.target.value})}
                          className="w-full google-input"
                          required
                        />
                        <input
                          type="text"
                          placeholder="Descripción corta"
                          value={planForm.descripcion}
                          onChange={e => setPlanForm({...planForm, descripcion: e.target.value})}
                          className="w-full google-input"
                          required
                        />
                        <input
                          type="number"
                          placeholder="Precio ($)"
                          value={planForm.precio}
                          onChange={e => setPlanForm({...planForm, precio: parseFloat(e.target.value)})}
                          className="w-full google-input"
                          required
                        />
                        <div className="flex gap-2">
                          <button type="submit" className="flex-1 py-2 bg-gym-accent text-zinc-950 font-black rounded-xl text-xs uppercase tracking-widest">
                            {editingPlan ? 'Actualizar' : 'Crear Plan'}
                          </button>
                          {editingPlan && (
                            <button type="button" onClick={() => {setEditingPlan(null); setPlanForm({nombre:'', descripcion:'', precio:0});}} className="px-4 py-2 bg-google-surface text-white font-bold rounded-xl text-xs">
                              Cancelar
                            </button>
                          )}
                        </div>
                      </div>
                    </form>

                    <div className="space-y-3">
                      {planes.map(plan => (
                        <div key={plan.id} className="flex items-center justify-between p-4 bg-google-surface-variant rounded-xl border border-white/5 group">
                          <div>
                            <p className="font-black text-white text-sm uppercase">{plan.nombre}</p>
                            <p className="text-[10px] text-google-text-secondary">${plan.precio.toLocaleString()}</p>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => {setEditingPlan(plan); setPlanForm({nombre:plan.nombre, descripcion:plan.descripcion, precio:plan.precio});}} className="p-2 text-google-text-secondary hover:text-gym-accent">
                              <Edit className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDeletePlan(plan.id)} className="p-2 text-google-text-secondary hover:text-red-500">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Gyms (SuperAdmin Only) */}
            {activeTab === 'gyms' && user.rol === 'superadmin' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4">
                <div className="google-card p-8 h-fit">
                  <h2 className="text-2xl font-black text-white mb-6 uppercase tracking-tight">Nuevo Gimnasio</h2>
                  <form onSubmit={handleCreateGym} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-google-text-secondary uppercase tracking-widest mb-1.5">Nombre del Gimnasio</label>
                      <input
                        type="text"
                        placeholder="Ej: CrossFit Norte"
                        value={gymForm.nombre}
                        onChange={e => setGymForm({...gymForm, nombre: e.target.value})}
                        className="w-full google-input"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-google-text-secondary uppercase tracking-widest mb-1.5">Slug (Identificador único)</label>
                      <input
                        type="text"
                        placeholder="ej: box-norte"
                        value={gymForm.slug}
                        onChange={e => setGymForm({...gymForm, slug: e.target.value.toLowerCase().replace(/\s+/g, '-')})}
                        className="w-full google-input"
                        required
                      />
                      <p className="text-[10px] text-google-text-secondary mt-1">Este será el identificador en la URL.</p>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-google-text-secondary uppercase tracking-widest mb-1.5">Días de Prueba</label>
                      <input
                        type="number"
                        value={gymForm.trial_days}
                        onChange={e => setGymForm({...gymForm, trial_days: parseInt(e.target.value)})}
                        className="w-full google-input"
                        required
                        min="1"
                      />
                    </div>
                    <button type="submit" className="w-full bg-gym-accent text-zinc-950 py-3 rounded-xl font-bold text-sm hover:bg-[#32e612] transition-colors mt-2 shadow-[0_0_20px_rgba(57,255,20,0.2)]">
                      Crear Gimnasio
                    </button>
                  </form>
                </div>

                <div className="google-card p-8">
                  <h2 className="text-2xl font-black text-white mb-6 uppercase tracking-tight">Gimnasios Registrados</h2>
                  <div className="space-y-3">
                    {gyms.map(gym => (
                      <div key={gym.id} className="flex items-center justify-between p-4 bg-google-surface-variant rounded-xl border border-white/5">
                        <div>
                          <p className="font-black text-white text-sm uppercase">{gym.nombre}</p>
                          <p className="text-[10px] text-google-text-secondary">Slug: {gym.slug}</p>
                          {gym.trial_ends_at && (
                            <p className={`text-[9px] font-bold uppercase tracking-widest mt-1 ${new Date(gym.trial_ends_at) < new Date() ? 'text-red-500' : 'text-gym-accent'}`}>
                              {new Date(gym.trial_ends_at) < new Date() ? 'Prueba Expirada' : `Prueba hasta: ${format(new Date(gym.trial_ends_at), 'd MMM yyyy', { locale: es })}`}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${gym.estado === 'activo' ? 'bg-gym-accent/10 text-gym-accent' : 'bg-red-500/10 text-red-500'}`}>
                            {gym.estado}
                          </span>
                          <button 
                            onClick={() => handleToggleGymStatus(gym.id, gym.estado)}
                            className="p-2 text-google-text-secondary hover:text-white transition-colors"
                          >
                            {gym.estado === 'activo' ? <UserMinus className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

      </main>
    </div>
  );
}
