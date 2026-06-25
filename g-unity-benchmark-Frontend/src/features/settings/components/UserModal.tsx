import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faXmark, faEnvelope, faLock, faUser, faEye, faEyeSlash,
  faShieldHalved, faCircleCheck, faClock 
} from '@fortawesome/free-solid-svg-icons';
import { User } from '../../../services/userService';
import { Card } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { Alert } from '../../../components/ui/Alert';
import logoSolo from '../../../assets/images/logo-solo.png'; 

interface Props {
  isOpen: boolean; 
  onClose: () => void; 
  onSubmit: (data: any) => Promise<void>; 
  userToEdit?: User | null; 
  mode: 'create' | 'edit';
}

export function UserModal({ isOpen, onClose, onSubmit, userToEdit, mode }: Props) {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [roleSlug, setRoleSlug] = useState('admin');
  const [isActive, setIsActive] = useState(true);
  const [password, setPassword] = useState('');
  
  const [errorMsg, setErrorMsg] = useState(''); 
  const [inputErrors, setInputErrors] = useState<Record<string, string>>({}); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false); 

  // --- LÓGICA DE AUTO-OCULTADO DE ERRORES (Igual que en el Login) ---
  useEffect(() => {
    if (Object.keys(inputErrors).length > 0 || errorMsg) {
      const timer = setTimeout(() => {
        setInputErrors({});
        setErrorMsg('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [inputErrors, errorMsg]);

  useEffect(() => {
    if (mode === 'edit' && userToEdit) {
      setEmail(userToEdit.email || '');
      setFullName((userToEdit as any).full_name || '');
      const currentRoleSlug = typeof userToEdit.role === 'object' ? (userToEdit.role as any).slug : 'admin';
      setRoleSlug(currentRoleSlug);
      setIsActive((userToEdit as any).is_active !== false);
      setPassword('');
    } else {
      setEmail(''); setFullName(''); setRoleSlug('admin'); setIsActive(true); setPassword('');
    }
    setErrorMsg('');
    setInputErrors({});
    setShowPassword(false);
  }, [mode, userToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(''); 
    setInputErrors({});

    let hasErrors = false;
    const newErrors: Record<string, string> = {};

    if (!fullName) { newErrors.fullName = 'Full name is required'; hasErrors = true; }
    
    if (!email) { 
      newErrors.email = 'Email is required'; 
      hasErrors = true; 
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Invalid email format';
      hasErrors = true;
    }
    
    if (mode === 'create') {
      if (!password) { newErrors.password = 'Password is required'; hasErrors = true; }
      else if (password.length < 8 || !/\d/.test(password) || !/[a-zA-Z]/.test(password)) {
        newErrors.password = 'Minimum 8 chars, 1 letter, 1 number'; 
        hasErrors = true;
      }
    }

    if (hasErrors) {
      setInputErrors(newErrors);
      return; 
    }

    const payload: any = { email, full_name: fullName, role_slug: roleSlug, is_active: isActive };
    if (mode === 'create') payload.password = password;

    try {
      setIsSubmitting(true);
      await onSubmit(payload);
    } catch (error: any) {
      setErrorMsg(error.message || 'Server connection error.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── CLASES DE ESTILO (Clonadas directamente de LoginScreen) ───
  const inputBaseClass = "w-full rounded-xl border bg-[#1A1A1A] py-3 pl-10 pr-4 text-sm text-white placeholder-[#555] focus:outline-none transition-all duration-500";
  const selectBaseClass = "w-full rounded-xl border bg-[#1A1A1A] py-3 pl-10 pr-4 text-sm text-white focus:outline-none transition-all duration-500 appearance-none cursor-pointer";
  const iconLeftClass = "absolute left-4 text-[#888] text-sm";
  const borderNormal = "border-[#3A3A3A] focus:border-white";
  const borderError = "border-red-500/50";
  
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Fondo borroso (Overlay) */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-fade-in" 
        onClick={!isSubmitting ? onClose : undefined} 
      />
      
      {/* Contenedor del Modal: Mismo look que LoginScreen (Fondo oscurecido, bordes redondeados) */}
      <div className="relative z-10 flex w-full max-w-md flex-col gap-6 rounded-[30px] border border-[#3A3A3A]/60 bg-[#0F0F0F]/95 p-8 backdrop-blur-xl shadow-2xl animate-fade-in-up">
        
        {/* CABECERA Y LOGO (Mismo diseño de LoginScreen) */}
        <div className="flex flex-col items-center gap-3 text-center mb-2 relative">
          <button onClick={onClose} disabled={isSubmitting} className="absolute -right-2 -top-2 h-8 w-8 flex items-center justify-center rounded-full text-[#64748B] hover:text-white hover:bg-[#1A1A1A] disabled:opacity-50 transition-colors">
            <FontAwesomeIcon icon={faXmark} className="text-xl" />
          </button>

          <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-[20px] bg-[#1A1A1A] border border-[#3A3A3A] shadow-[0_0_20px_rgba(255,255,255,0.05)]">
            <img src={logoSolo} alt="Logo" className="h-8 w-8 object-contain" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-wide">{mode === 'create' ? 'Create User' : 'Edit User'}</h1>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate className="flex w-full flex-col gap-5">
          
          {/* CAMPO: NOMBRE COMPLETO */}
          <div className="flex flex-col gap-1">
            <div className="relative flex items-center">
              <FontAwesomeIcon icon={faUser} className={iconLeftClass} />
              <input 
                type="text" required disabled={isSubmitting} 
                value={fullName} onChange={(e) => {
                  setFullName(e.target.value);
                  if (inputErrors.fullName) setInputErrors({ ...inputErrors, fullName: '' });
                }} 
                className={`${inputBaseClass} ${inputErrors.fullName ? borderError : borderNormal}`} 
                placeholder="Full Name" 
              />
            </div>
            {/* Animación de error idéntica a login */}
            <div className={`overflow-hidden transition-all duration-500 ${inputErrors.fullName ? "max-h-10 opacity-100" : "max-h-0 opacity-0"}`}>
              <span className="text-red-400 text-xs flex items-center gap-1 mt-1 pl-1 font-medium">
                {inputErrors.fullName}
              </span>
            </div>
          </div>

          {/* CAMPO: EMAIL CORPORATIVO */}
          <div className="flex flex-col gap-1">
            <div className="relative flex items-center">
              <FontAwesomeIcon icon={faEnvelope} className={iconLeftClass} />
              <input 
                type="email" required disabled={isSubmitting} 
                value={email} onChange={(e) => {
                  setEmail(e.target.value);
                  if (inputErrors.email) setInputErrors({ ...inputErrors, email: '' });
                }} 
                className={`${inputBaseClass} ${inputErrors.email ? borderError : borderNormal}`} 
                placeholder="company@email.com" 
              />
            </div>
            <div className={`overflow-hidden transition-all duration-500 ${inputErrors.email ? "max-h-10 opacity-100" : "max-h-0 opacity-0"}`}>
              <span className="text-red-400 text-xs flex items-center gap-1 mt-1 pl-1 font-medium">
                {inputErrors.email}
              </span>
            </div>
          </div>
          
          {/* CAMPO: CONTRASEÑA */}
          {mode === 'create' && (
            <div className="flex flex-col gap-1">
              <div className="relative flex items-center">
                <FontAwesomeIcon icon={faLock} className={iconLeftClass} />
                <input 
                  type={showPassword ? "text" : "password"} 
                  required disabled={isSubmitting} 
                  value={password} onChange={(e) => {
                    setPassword(e.target.value);
                    if (inputErrors.password) setInputErrors({ ...inputErrors, password: '' });
                  }} 
                  className={`${inputBaseClass} pr-10 ${inputErrors.password ? borderError : borderNormal}`} 
                  placeholder="Temporary Password" 
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 text-[#888] hover:text-white transition-colors cursor-pointer"
                >
                  <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} className="text-sm" />
                </button>
              </div>
              <div className={`overflow-hidden transition-all duration-500 ${inputErrors.password ? "max-h-10 opacity-100" : "max-h-0 opacity-0"}`}>
                <span className="text-red-400 text-xs flex items-center gap-1 mt-1 pl-1 font-medium">
                  {inputErrors.password}
                </span>
              </div>
            </div>
          )}
          
          {/* FILA DE ROL Y ESTADO */}
          <div className="grid grid-cols-2 gap-4">
            <div className="relative flex items-center">
              <FontAwesomeIcon icon={faShieldHalved} className={iconLeftClass} />
              <select 
                value={roleSlug} disabled={isSubmitting} 
                onChange={(e) => setRoleSlug(e.target.value)} 
                className={`${selectBaseClass} ${borderNormal}`}
              >
                <option value="admin">Administrator</option>
                <option value="developer">Developer</option>
                <option value="analyst">Analyst</option>
              </select>
            </div>
            
            <div className="relative flex items-center">
              <FontAwesomeIcon icon={isActive ? faCircleCheck : faClock} className={iconLeftClass} />
              <select 
                value={isActive ? 'true' : 'false'} disabled={isSubmitting} 
                onChange={(e) => setIsActive(e.target.value === 'true')} 
                className={`${selectBaseClass} ${borderNormal}`}
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
          </div>

          {/* BOTONES DE ACCIÓN (Idénticos al Login) */}
          <div className="flex flex-col gap-3 mt-2">
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full rounded-xl bg-white px-4 py-3 text-sm font-bold text-black shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:bg-gray-200 hover:shadow-[0_0_25px_rgba(255,255,255,0.25)] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? 'Processing...' : mode === 'create' ? 'Create User' : 'Update User'}
            </button>
            <button 
                type="button" 
                disabled={isSubmitting} 
                onClick={onClose} 
                className="w-full text-[#888888] hover:text-white py-2 text-sm font-medium transition-colors"
            >
              Cancel
            </button>
          </div>

          {/* ERROR DEL BACKEND CON DESAPARICIÓN SUAVE (Igual al Login) */}
          <div className={`overflow-hidden transition-all duration-700 ${errorMsg ? "max-h-20 opacity-100" : "max-h-0 opacity-0"}`}>
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-center shadow-[0_0_15px_rgba(239,68,68,0.15)]">
              <p className="text-[13px] text-red-400 font-medium">{errorMsg}</p>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
}