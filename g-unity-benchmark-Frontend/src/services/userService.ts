import { apiClient } from './apiClient';

// ─── DTOs (Contratos de Tipado) ───

// Definimos la estructura exacta que manda tu backend para el rol
export interface Role {
  id: number;
  name: string;
  slug: string;
  description?: string;
}

// Definimos la estructura exacta del usuario (espejo de schemas.py)
export interface User {
  id: string;
  email: string;
  full_name: string;   // <-- Antes tenías 'name'
  is_active: boolean;  // <-- Antes tenías 'status: any'
  role?: Role;         // <-- Antes tenías 'role: any'
  created_at?: string;
  last_login_at?: string;
}

// ─── SERVICIO DE USUARIOS ───

export const userService = {
  getUsers: async (): Promise<User[]> => 
    apiClient('/identity/users'),
  
  // Usamos un tipo que permite los datos del usuario + los campos extra necesarios para crear
  createUser: async (userData: Partial<User> & { password?: string; role_slug?: string }) => 
    apiClient('/identity/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),
  
  // Para actualizar, permitimos datos parciales + el slug del rol si se quiere cambiar
  updateUser: async (id: string, userData: Partial<User> & { role_slug?: string }) => 
    apiClient(`/identity/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(userData),
    }),
  
  deleteUser: async (id: string) => 
    apiClient(`/identity/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active: false }),
    })
};