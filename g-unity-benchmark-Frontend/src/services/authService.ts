import { apiClient } from './apiClient';

// ─── DTOs (Contratos de Tipado basados en schemas.py) ───

export interface RoleResponse {
  id: number;
  name: string;
  slug: string;
  description?: string;
}

export interface UserResponse {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  role?: RoleResponse;
  created_at?: string;
  last_login_at?: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  user: UserResponse;
}

// ─── SERVICIO DE AUTENTICACIÓN ───

export const authService = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);

    // Inyectamos el contrato LoginResponse en el cliente API
    const response = await apiClient<LoginResponse>(
      '/identity/auth/login', 
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
      }
    );

    // Devolvemos la respuesta íntegra que ahora incluye el token y el objeto user
    return response;
  },

  recoverPassword: async (email: string): Promise<void> => {
    return apiClient('/identity/password-recovery', { 
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  updateProfile: async (data: { full_name?: string; new_password?: string }): Promise<UserResponse> => {
    return apiClient<UserResponse>('/identity/auth/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }
};