import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faEnvelope, 
  faLock, 
  faEye, 
  faEyeSlash,
  faCircleExclamation,
  faArrowLeft,
  faCheckCircle,
  faClock
} from '@fortawesome/free-solid-svg-icons';
import logoSolo from '../../../assets/images/logo-solo.png'; 
import { useLogin } from '../hooks/useLogin';
import { authService } from '../../../services/authService';
import { useSettingsStore } from '../../../store/useSettingsStore';
import { DEMO_TOKEN, DEMO_USER, enableOfflineMode } from '../../../config/offlineMode';

interface LoginScreenProps {
  onLoadingChange?: (loading: boolean) => void;
}

export function LoginScreen({ onLoadingChange }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [expiredMsg, setExpiredMsg] = useState(false);
  
  // ─── ESTADOS PARA RECUPERAR CONTRASEÑA Y CRONÓMETRO ───
  const [isResetMode, setIsResetMode] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showSuccessBadge, setShowSuccessBadge] = useState(false); 
  const [hasSentReset, setHasSentReset] = useState(false); 
  const [countdown, setCountdown] = useState(0); 
  
  // Estados para errores
  const [errors, setErrors] = useState({ email: '', password: '' });
  const [backendError, setBackendError] = useState(false);
  
  const { mutate: doLogin, isPending, isError } = useLogin();

  const loginAsGuest = () => {
    enableOfflineMode();
    useSettingsStore.getState().login(
      {
        ...DEMO_USER,
        role: 'guest',
        email: 'invitado@unity.local',
        name: 'Invitado',
        full_name: 'Invitado',
      },
      DEMO_TOKEN
    );
  };

  // --- LÓGICA DE AUTO-OCULTADO DE ERRORES ---
  useEffect(() => {
    if (errors.email || errors.password || backendError || isError) {
      const timer = setTimeout(() => {
        setErrors({ email: '', password: '' });
        setBackendError(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [errors, backendError, isError]);

  // --- LÓGICA DEL CRONÓMETRO ---
  useEffect(() => {
    if (countdown > 0) {
      const timerId = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timerId); 
    }
  }, [countdown]);

  // --- LÓGICA DE AVISO DE EXPIRACIÓN ---
  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    if (queryParams.get('expired') === 'true') {
      setExpiredMsg(true);
      // Limpiamos la URL para que no se quede ahí para siempre
      window.history.replaceState({}, document.title, '/login');
      
      // Que la alerta bonita dure 8 segundos y desaparezca suavemente
      setTimeout(() => setExpiredMsg(false), 8000);
    }
  }, []);

  // Formateador de tiempo para que se vea como "02:00"
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleCancelReset = () => {
    setIsResetMode(false);
    setErrors({email: '', password: ''});
    setShowSuccessBadge(false);
    setCountdown(0);
    setHasSentReset(false);
    setPassword('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors = { email: '', password: '' };
    let hasError = false;

    if (!email) {
      newErrors.email = 'El correo es obligatorio';
      hasError = true;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Formato de correo inválido';
      hasError = true;
    }

    if (isResetMode) {
      if (hasError) {
        return setErrors(newErrors);
      }
      
      try {
        setIsResetting(true);
        
        await authService.recoverPassword(email);
        
        setShowSuccessBadge(true);
        setHasSentReset(true);
        
        setTimeout(() => {
          setShowSuccessBadge(false);
          setCountdown(120); 
        }, 2000);

      } catch (error: any) {
        setErrors({ ...errors, email: error.message || 'Error al conectar con el servidor' });
      } finally {
        setIsResetting(false);
      }

    } else {
      // ─── LÓGICA DE LOGIN NORMAL ───
      if (!password) {
        newErrors.password = 'La contraseña es obligatoria';
        hasError = true;
      }

      if (hasError) {
        setErrors(newErrors);
      } else {
        setBackendError(false);
        onLoadingChange?.(true);
        doLogin({ email, password }, {
          onError: () => {
            setBackendError(true);
          },
          onSettled: () => {
            onLoadingChange?.(false);
          },
        });
      }
    }
  };

  return (
    <div className="relative z-10 flex w-full max-w-md flex-col items-center justify-center gap-8 rounded-[30px] border border-[#3A3A3A]/60 bg-[#0F0F0F]/80 p-8 md:p-12 backdrop-blur-xl shadow-2xl transition-all duration-500">
      
      {/* CABECERA Y LOGO */}
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-[20px] bg-[#1A1A1A] border border-[#3A3A3A] shadow-[0_0_20px_rgba(255,255,255,0.05)] transition-transform hover:scale-105">
          <img src={logoSolo} alt="Logo G-Unity" className="h-8 w-8 object-contain" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white tracking-wide transition-all">
            {isResetMode ? 'Recuperar Acceso' : 'Unity - Nexus'}
          </h1>
          <p className="text-[13px] text-[#888888] mt-1 transition-all">
            {isResetMode 
              ? 'Te enviaremos las instrucciones a tu correo' 
              : 'Plataforma de Inteligencia Competitiva'}
          </p>
        </div>
      </div>

      {/* --- FORMULARIO --- */}
      <form onSubmit={handleSubmit} noValidate className="flex w-full flex-col gap-5">
        
        {/* INPUT DE CORREO */}
        <div className="flex flex-col gap-1">
          <div className="relative flex items-center">
            <FontAwesomeIcon icon={faEnvelope} className="absolute left-4 text-[#888] text-sm" />
            <input 
              type="email" 
              placeholder="Correo corporativo" 
              value={email}
              disabled={countdown > 0 || isResetting || showSuccessBadge} 
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors({ ...errors, email: '' }); 
              }}
              className={`w-full rounded-xl border ${errors.email ? 'border-red-500/50' : 'border-[#3A3A3A] focus:border-white'} bg-[#1A1A1A] py-3 pl-10 pr-4 text-sm text-white placeholder-[#555] focus:outline-none transition-all duration-500 disabled:opacity-50`}
            />
          </div>
          <div className={`overflow-hidden transition-all duration-500 ${errors.email ? 'max-h-10 opacity-100' : 'max-h-0 opacity-0'}`}>
            <span className="text-red-400 text-xs flex items-center gap-1 mt-1 pl-1 font-medium">
              <FontAwesomeIcon icon={faCircleExclamation} /> {errors.email}
            </span>
          </div>
        </div>

        {/* INPUT DE CONTRASEÑA */}
        <div className={`flex flex-col gap-1 overflow-hidden transition-all duration-500 ${isResetMode ? 'max-h-0 opacity-0' : 'max-h-[100px] opacity-100'}`}>
          <div className="relative flex items-center">
            <FontAwesomeIcon icon={faLock} className="absolute left-4 text-[#888] text-sm" />
            <input 
              type={showPassword ? "text" : "password"} 
              placeholder="Contraseña C-Level" 
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors({ ...errors, password: '' });
              }}
              className={`w-full rounded-xl border ${errors.password ? 'border-red-500/50' : 'border-[#3A3A3A] focus:border-white'} bg-[#1A1A1A] py-3 pl-10 pr-10 text-sm text-white placeholder-[#555] focus:outline-none transition-all duration-500`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 text-[#888] hover:text-white transition-colors cursor-pointer"
            >
              <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} className="text-sm" />
            </button>
          </div>
          <div className={`overflow-hidden transition-all duration-500 ${errors.password ? 'max-h-10 opacity-100' : 'max-h-0 opacity-0'}`}>
            <span className="text-red-400 text-xs flex items-center gap-1 mt-1 pl-1 font-medium">
              <FontAwesomeIcon icon={faCircleExclamation} /> {errors.password}
            </span>
          </div>
        </div>
        
        {/* ENLACE DE OLVIDASTE CONTRASEÑA */}
        {!isResetMode && (
          <div className="flex justify-end -mt-3">
            <button 
              type="button" 
              onClick={() => { setIsResetMode(true); setErrors({email: '', password: ''}); }}
              className="text-[12px] text-[#888] hover:text-white transition-colors"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>
        )}

        {/* BOTÓN SUBMIT DINÁMICO MULTI-ESTADO */}
        <button 
          type="submit" 
          disabled={isPending || isResetting || showSuccessBadge || countdown > 0}
          className={`mt-2 w-full rounded-xl px-4 py-3 text-sm font-bold shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-all flex items-center justify-center gap-2 ${
            showSuccessBadge
              ? 'bg-[#3DDC84] text-black hover:bg-[#3DDC84]' 
              : countdown > 0
              ? 'bg-[#1A1A1A] text-[#888] border border-[#3A3A3A]' 
              : 'bg-white text-black hover:bg-gray-200 hover:shadow-[0_0_25px_rgba(255,255,255,0.25)]' 
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isResetMode ? (
            showSuccessBadge ? (
              <><FontAwesomeIcon icon={faCheckCircle} /> Enlace enviado</>
            ) : countdown > 0 ? (
              <><FontAwesomeIcon icon={faClock} /> Reenviar en {formatTime(countdown)}</>
            ) : isResetting ? (
              'Enviando...'
            ) : hasSentReset ? (
              'Reenviar enlace de acceso'
            ) : (
              'Enviar enlace de acceso'
            )
          ) : (
            isPending ? 'Verificando...' : 'Desbloquear Panel'
          )}
        </button>

        {!isResetMode && (
          <button
            type="button"
            onClick={loginAsGuest}
            className="mt-3 w-full rounded-xl border border-white/20 bg-transparent px-4 py-3 text-sm font-semibold text-white transition hover:border-white hover:bg-white/10"
          >
            Entrar como Invitado
          </button>
        )}

        {/* ENLACE DE VOLVER AL LOGIN */}
        {isResetMode && (
          <button 
            type="button" 
            onClick={handleCancelReset}
            className="mt-2 text-[13px] text-[#888] hover:text-white transition-colors flex items-center justify-center gap-2"
          >
            <FontAwesomeIcon icon={faArrowLeft} /> Volver al login
          </button>
        )}

        {/* ERROR DEL BACKEND */}
        <div className={`overflow-hidden transition-all duration-700 ${backendError && !isResetMode ? 'max-h-20 opacity-100 mt-2' : 'max-h-0 opacity-0'}`}>
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-center shadow-[0_0_15px_rgba(239,68,68,0.15)]">
            <p className="text-[13px] text-red-400 font-medium">
              Credenciales incorrectas o acceso denegado.
            </p>
          </div>
        </div>

        {/* AVISO DE SESIÓN EXPIRADA (EL NUEVO BLOQUE) */}
        <div className={`overflow-hidden transition-all duration-700 ${expiredMsg ? 'max-h-20 opacity-100 mt-2' : 'max-h-0 opacity-0'}`}>
          <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3 text-center shadow-[0_0_15px_rgba(59,130,246,0.15)]">
            <p className="text-[13px] text-blue-400 font-medium flex items-center justify-center gap-2">
              <FontAwesomeIcon icon={faClock} />
              Tu sesión expiró por seguridad. Vuelve a ingresar.
            </p>
          </div>
        </div>

      </form>
    </div>
  );
}