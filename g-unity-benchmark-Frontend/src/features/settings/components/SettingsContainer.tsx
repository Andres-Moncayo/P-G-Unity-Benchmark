import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShieldHalved, faLock } from '@fortawesome/free-solid-svg-icons';
import { useSettingsStore } from '../../../store/useSettingsStore';
import AdminPanel from '../../dashboard/components/AdminPanel';

export default function SettingsContainer() {

  const user = useSettingsStore((state) => state.user);
  const role = user?.role || 'guest'; 
  const isAdmin = role === 'admin';

  if (isAdmin) {
    return <AdminPanel />;
  }

  return (
    <div className="flex flex-col gap-6 px-4 md:px-8 py-4 md:py-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-4xl font-semibold text-white">Ajustes</h1>
        <p className="text-sm text-[#B0B0B0]">
          Manage your account and platform preferences.
        </p>
      </header>

      {/* Access denied panel */}
      <section className="mt-4 flex flex-col items-center justify-center rounded-[30px] border border-[#3A3A3A]/60 bg-[#0F0F0F] p-8 md:p-16 text-center gap-6">

        {/* Icon stack */}
        <div className="relative flex items-center justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-[24px] bg-[#FF6B6B]/10 border border-[#FF6B6B]/20 shadow-[0_0_40px_rgba(255,107,107,0.12)]">
            <FontAwesomeIcon icon={faShieldHalved} className="text-4xl text-[#FF6B6B]" />
          </div>
          <div className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-[#1A1A1A] border border-[#3A3A3A]">
            <FontAwesomeIcon icon={faLock} className="text-sm text-[#888]" />
          </div>
        </div>

        {/* Text */}
        <div className="flex flex-col gap-2 max-w-sm">
          <h2 className="text-2xl font-semibold text-white">Acceso restringido</h2>
          <p className="text-[#888888] text-sm leading-6">
            Esta sección está reservada para administradores.
            <br />
            Si crees que deberías tener acceso, contacta a tu administrador de sistema.
          </p>
        </div>

        {/* Role badge */}
        <div className="flex items-center gap-2 rounded-full border border-[#3A3A3A] bg-[#1A1A1A] px-4 py-2">
          <span className="h-2 w-2 rounded-full bg-[#FF6B6B] animate-pulse" />
          <span className="text-xs text-[#888] font-medium">
            Rol actual: <span className="text-[#B0B0B0]">Invitado</span>
          </span>
        </div>

        {/* Hint */}
        <p className="text-[11px] text-[#555] max-w-xs">
          Las opciones de tu cuenta están disponibles en el panel lateral izquierdo.
        </p>

      </section>
    </div>
  );
}
