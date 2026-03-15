export type UserRole = 'superadmin' | 'admin' | 'coach' | 'alumno';

export type UserStatus = 'activo' | 'suspendido';

export type GymStatus = 'active' | 'inactive' | 'trial';

export interface UserProfile {
  id: string;
  nombre: string;
  email: string;
  rol: UserRole;
  estado: UserStatus;
  gym_id: string | null;
  telefono?: string;
  created_at?: string;
}

export interface Gym {
  id: string;
  nombre: string;
  slug: string;
  estado: GymStatus;
  trial_ends_at?: string;
  created_at: string;
}

export interface AuthContextType {
  user: UserProfile | null;
  gym: Gym | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (data: any) => Promise<void>;
  refreshProfile: () => Promise<void>;
}
