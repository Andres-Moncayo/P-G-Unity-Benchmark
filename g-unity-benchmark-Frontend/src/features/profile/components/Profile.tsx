import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faUser, faEnvelope, faShieldHalved, faLock, 
  faArrowLeft, faCheckCircle, faEye, faEyeSlash
} from '@fortawesome/free-solid-svg-icons';
import { useSettingsStore } from '../../../store/useSettingsStore';
import { useNavigationStore } from '../../../store/useNavigationStore';
import { authService } from '../../../services/authService';

export function Profile() {
  const { user, updateUser } = useSettingsStore();
  const { navigate } = useNavigationStore();
  
  // ─── ESTADOS 100% ALINEADOS A TU TABLA 'users' ───
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const isAdmin = user?.role === 'admin' || user?.role === 'Admin';

  const handleSave = async () => {
    setErrorMsg('');
    
    if (newPassword && newPassword !== confirmPassword) {
      return setErrorMsg('New passwords do not match');
    }

    try {
      setIsSaving(true);
      
      // 1. Send only what the backend supports and save the response
      const res: any = await authService.updateProfile({ 
        full_name: fullName || undefined, 
        new_password: newPassword || undefined 
      });

      // 2. LIVE UPDATE: Inject the new name in the vault
      updateUser({
        full_name: res.full_name,
      });

      setSaveSuccess(true);
      
      // Clear password fields
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error: any) {
      setErrorMsg(error.message || 'Error updating profile');
    } finally {
      setIsSaving(false);
    }
  };

  const cardClass = "bg-[#0F0F0F]/80 border border-[#3A3A3A]/60 backdrop-blur-xl rounded-[24px] p-6 shadow-2xl";
  const labelClass = "block text-xs font-medium text-[#888] uppercase tracking-wider mb-2 ml-1";
  const inputBaseClass = "w-full bg-[#1A1A1A] border border-[#3A3A3A] rounded-xl py-3 px-4 text-sm text-white placeholder-[#555] focus:outline-none focus:border-white transition-all";

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-8 animate-fade-in max-w-4xl mx-auto w-full">
      <header className="flex items-center gap-4">
        <button 
          onClick={() => navigate('dashboard')}
          className="h-10 w-10 flex items-center justify-center rounded-full bg-[#1A1A1A] border border-[#3A3A3A] text-[#888] hover:text-white transition-all"
        >
          <FontAwesomeIcon icon={faArrowLeft} />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">My Profile</h1>
          <p className="text-sm text-[#64748B]">Manage your personal information and security</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* COLUMNA IZQUIERDA: RESUMEN */}
        <div className="md:col-span-1 flex flex-col gap-6">
          <div className={`${cardClass} flex flex-col items-center text-center`}>
            <div className={`h-24 w-24 rounded-3xl flex items-center justify-center text-white text-3xl font-bold shadow-2xl mb-4 transition-transform hover:scale-105 duration-500 ${
              isAdmin ? "bg-gradient-to-br from-[#00ADEF] to-[#0A5CF5]" : "bg-[#1E293B] border border-[#334155]"
            }`}>
              {isAdmin ? <FontAwesomeIcon icon={faShieldHalved} /> : (user?.email || 'U').substring(0, 2).toUpperCase()}
            </div>
            
            <h2 className="text-xl font-bold text-white mb-1">{fullName || user?.email.split('@')[0]}</h2>
            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
              isAdmin ? "bg-[#00ADEF]/10 text-[#00ADEF] border border-[#00ADEF]/20" : "bg-gray-800 text-gray-400"
            }`}>
              {isAdmin ? 'Platform Admin' : 'Analyst'}
            </span>
          </div>

          {errorMsg && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-center">
              <p className="text-[13px] text-red-400 font-medium">{errorMsg}</p>
            </div>
          )}
        </div>

        {/* COLUMNA DERECHA: FORMULARIO */}
        <div className="md:col-span-2 flex flex-col gap-6">
          
          {/* SECCIÓN: INFORMACIÓN GENERAL */}
          <div className={cardClass}>
            <h3 className="text-lg font-bold text-white mb-6">General Information</h3>
            <div className="grid grid-cols-1 gap-5">
              <div>
                <label className={labelClass}>Email Address (Not Editable)</label>
                <div className="relative">
                  <FontAwesomeIcon icon={faEnvelope} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#555]" />
                  <input type="text" readOnly value={user?.email || ''} className={`${inputBaseClass} pl-11 opacity-60 cursor-not-allowed`} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Full Name</label>
                <div className="relative">
                  <FontAwesomeIcon icon={faUser} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#555]" />
                  <input 
                    type="text" 
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name" 
                    className={`${inputBaseClass} pl-11`} 
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECCIÓN: SEGURIDAD */}
          <div className={cardClass}>
            <h3 className="text-lg font-bold text-white mb-6">Security</h3>
            <div className="space-y-5">
              
              {/* Contraseña Actual */}
              <div>
                <label className={labelClass}>Current Password</label>
                <div className="relative">
                  <FontAwesomeIcon icon={faLock} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#555]" />
                  <input 
                    type={showCurrent ? "text" : "password"} 
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Required to save changes" 
                    className={`${inputBaseClass} pl-11 pr-11`} 
                  />
                  <button 
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#555] hover:text-white transition-colors"
                  >
                    <FontAwesomeIcon icon={showCurrent ? faEyeSlash : faEye} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Nueva Contraseña */}
                <div>
                  <label className={labelClass}>New Password</label>
                  <div className="relative">
                    <input 
                      type={showNew ? "text" : "password"} 
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Optional" 
                      className={`${inputBaseClass} pr-11`} 
                    />
                    <button 
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#555] hover:text-white transition-colors"
                    >
                      <FontAwesomeIcon icon={showNew ? faEyeSlash : faEye} />
                    </button>
                  </div>
                </div>

                {/* Confirmar Nueva */}
                <div>
                  <label className={labelClass}>Confirm New Password</label>
                  <div className="relative">
                    <input 
                      type={showConfirm ? "text" : "password"} 
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Optional" 
                      className={`${inputBaseClass} pr-11`} 
                    />
                    <button 
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#555] hover:text-white transition-colors"
                    >
                      <FontAwesomeIcon icon={showConfirm ? faEyeSlash : faEye} />
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className={`px-8 py-3 rounded-xl font-bold text-sm transition-all shadow-lg flex items-center gap-2 ${
                saveSuccess ? "bg-[#3DDC84] text-black" : "bg-white text-black hover:bg-gray-200"
              }`}
            >
              {isSaving ? "Saving..." : saveSuccess ? <><FontAwesomeIcon icon={faCheckCircle} /> Changes Saved</> : "Update Profile"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}