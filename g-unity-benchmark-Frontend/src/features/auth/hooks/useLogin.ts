import { useMutation } from '@tanstack/react-query';
import { authService } from '../../../services/authService';
import { useSettingsStore } from '../../../store/useSettingsStore';

export const useLogin = () => {
  const setSession = useSettingsStore((state) => state.login);

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) => 
      authService.login(email, password),

    onSuccess: (data) => {
      // 1. Mapeamos los datos REALES que vienen del backend (FastAPI / LoginResponse)
      const realUser = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.full_name, // Mantenemos 'name' por compatibilidad
        role: data.user.role?.slug || 'user',
        full_name: data.user.full_name // 🔥 CRÍTICO: El que usa nuestra pantalla de Perfil
      };

      // 2. Guardamos la sesión real en Zustand (usa data.access_token o data.accessToken según devuelva tu backend)
      setSession(realUser, data.access_token);
    },

    onError: (error: any) => {
      console.error('❌ Error de inicio de sesión:', error.message);
    }
  });
};