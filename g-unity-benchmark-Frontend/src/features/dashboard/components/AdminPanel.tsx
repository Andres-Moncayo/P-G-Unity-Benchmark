import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faUsers, faUserPen, faShieldHalved, faPlus, 
  faEllipsisVertical, faCircleCheck, faClock, faPen, faTrash, faBan
} from '@fortawesome/free-solid-svg-icons';
import { cn } from '../../../utils/cn';
import { useUsers } from '../../settings/hooks/useUsers';
import { UserModal } from '../../settings/components/UserModal';
import { User } from '../../../services/userService';

// 1. Tipado explícito para que TypeScript sepa que acepta cualquier string (Adiós error 'any')
const ROLE_COLORS: Record<string, string> = {
  Admin:    'bg-[#00ADEF]/15 text-[#00ADEF]',
  Invitado: 'bg-[#888]/15 text-[#888]',
};

// 2. Función helper actualizada (Adiós error de getUserDisplayInfo)
const getUserDisplayInfo = (user: any, roleText: string) => {
  // Leemos full_name del backend
  const name = user.full_name || user.email.split('@')[0];
  const initials = name.substring(0, 2).toUpperCase();
  const color = (roleText === 'Admin' || roleText === 'admin' || roleText === 'Administrador') 
    ? 'from-[#0f76ff] to-[#08e2c4]' 
    : 'from-[#9b5de5] to-[#f15bb5]';
  return { name, initials, color };
};

export default function AdminPanel() {
  const { users, isLoading, createUser, updateUser, deleteUser } = useUsers();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  // ─── NUEVOS CONTADORES PARA LAS TARJETAS ESTADÍSTICAS ───
  const activeUsersCount = users.filter(user => (user as any).is_active === true).length;
  const inactiveUsersCount = users.filter(user => (user as any).is_active === false).length;

  const handleOpenCreate = () => { setModalMode('create'); setSelectedUser(null); setIsModalOpen(true); };
  
  const handleOpenEdit = (user: User) => { 
    setModalMode('edit'); 
    setSelectedUser(user); 
    setIsModalOpen(true); 
    setOpenDropdownId(null); 
  };

  const handleModalSubmit = async (data: Partial<User>) => {
    if (modalMode === 'create') {
      await createUser(data);
    } else if (selectedUser) {
      await updateUser({ id: selectedUser.id, data });
    }
    setIsModalOpen(false);
  };

  const handleToggleStatus = async (user: User) => {
    // 1. Leemos el estado actual
    const isActive = (user as any).is_active === true;
    
    // 2. Cerramos el menú desplegable al instante para dar sensación de rapidez
    setOpenDropdownId(null); 
    
    // 3. Enviamos la orden al backend sin preguntar
    await updateUser({ 
      id: user.id, 
      data: { is_active: !isActive } 
    }); 
  };

  if (isLoading) return <div className="text-white p-8 animate-pulse text-xl">Cargando base de datos...</div>;

  return (
    <div className="flex flex-col gap-6 px-4 sm:px-8 py-4 overflow-x-hidden">
      <header className="flex justify-between items-center flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00ADEF]/15 text-[#00ADEF]">
            <FontAwesomeIcon icon={faShieldHalved} />
          </div>
          <h1 className="text-3xl font-semibold text-white">Panel de Admin</h1>
        </div>
        <button onClick={handleOpenCreate} className="flex items-center gap-2 rounded-xl bg-[#00ADEF] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#00ADEF]/90 transition-all">
          <FontAwesomeIcon icon={faPlus} /> Nuevo usuario
        </button>
      </header>

      {/* ─── SECCIÓN DE TARJETAS ESTADÍSTICAS (ACTUALIZADO A 3 COLUMNAS) ─── */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* Tarjeta 1: Total Usuarios */}
        <div className="rounded-[24px] border border-[#3A3A3A] bg-[#0F0F0F] p-5 flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#00ADEF]/10 border border-[#00ADEF]/20 text-[#00ADEF]">
            <FontAwesomeIcon icon={faUsers} className="text-lg" />
          </div>
          <div>
            <strong className="block text-2xl font-bold text-white">{users.length}</strong>
            <span className="text-xs text-[#888]">Total usuarios</span>
          </div>
        </div>

        {/* Tarjeta 2: Usuarios Activos */}
        <div className="rounded-[24px] border border-[#3A3A3A] bg-[#0F0F0F] p-5 flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#3DDC84]/10 border border-[#3DDC84]/20 text-[#3DDC84]">
            <span className="h-2 w-2 rounded-full bg-[#3DDC84]" />
          </div>
          <div>
            <strong className="block text-2xl font-bold text-white">{activeUsersCount}</strong>
            <span className="text-xs text-[#888]">Usuarios Activos</span>
          </div>
        </div>

        {/* Tarjeta 3: Usuarios Inactivos / Pendientes */}
        <div className="rounded-[24px] border border-[#3A3A3A] bg-[#0F0F0F] p-5 flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#FF9F1C]/10 border border-[#FF9F1C]/20 text-[#FF9F1C]">
            <span className="h-2 w-2 rounded-full bg-[#FF9F1C] animate-pulse" />
          </div>
          <div>
            <strong className="block text-2xl font-bold text-white">{inactiveUsersCount}</strong>
            <span className="text-xs text-[#888]">Usuarios Inactivos</span>
          </div>
        </div>

      </section>

      <section className="rounded-[28px] border border-[#3A3A3A] bg-[#0F0F0F] overflow-visible">
        <div className="p-5 border-b border-[#1E1E1E] text-white font-semibold flex items-center gap-2">
          <FontAwesomeIcon icon={faUserPen} className="text-[#B0B0B0]"/> 
          Usuarios registrados
        </div>
        
        <div className="overflow-x-auto min-h-[250px]">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-[#1E1E1E] text-[#555] uppercase tracking-wider text-[10px] font-semibold">
                <th className="px-6 py-4">Usuario</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Rol</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => {
                // Filtro para extraer los datos como vienen de Pydantic
                const roleObj = user.role as any;
                const roleName = roleObj ? String(roleObj.name) : 'Usuario normal';
                
                // Leemos el booleano directamente de is_active
                const isActive = (user as any).is_active === true;
                
                const { name, initials, color } = getUserDisplayInfo(user, roleName);

                return (
                  <tr key={user.id} className="border-b border-[#1A1A1A] hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={cn('flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-gradient-to-br text-white text-xs font-bold shadow-lg', color)}>
                          {initials}
                        </div>
                        <span className="font-medium text-white whitespace-nowrap">{name}</span>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 text-[#B0B0B0]">{user.email}</td>
                    
                    <td className="px-6 py-4">
                      <span className={cn('rounded-full px-3 py-1 text-xs font-semibold', ROLE_COLORS[roleName] || ROLE_COLORS.Invitado)}>
                        {roleName}
                      </span>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={cn('h-1.5 w-1.5 rounded-full', isActive ? 'bg-[#3DDC84]' : 'bg-[#FF9F1C] animate-pulse')} />
                        <span className={cn('text-xs font-medium', isActive ? 'text-[#3DDC84]' : 'text-[#FF9F1C]')}>
                          {isActive ? 'Activo' : 'Pendiente'}
                        </span>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 relative text-right">
                      <button 
                        onClick={() => setOpenDropdownId(openDropdownId === user.id ? null : user.id)} 
                        className="text-[#555] hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
                      >
                        <FontAwesomeIcon icon={faEllipsisVertical} />
                      </button>
                      
                      {openDropdownId === user.id && (
                        <div className="absolute right-12 top-8 w-32 bg-[#1A1A1A] border border-[#3A3A3A] rounded-xl shadow-xl z-50 overflow-hidden animate-fade-in-up">
                          <button onClick={() => handleOpenEdit(user)} className="w-full text-left px-4 py-2.5 text-sm text-[#F1F5F9] hover:bg-[#333] flex items-center gap-2">
                            <FontAwesomeIcon icon={faPen} className="text-[#00ADEF]" /> Editar
                          </button>
                          <button 
                            onClick={() => handleToggleStatus(user)} 
                            className={cn(
                              "w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition-colors",
                              isActive 
                                ? "text-[#FCA5A5] hover:bg-[#FCA5A5]/10" // Rojo para suspender
                                : "text-[#3DDC84] hover:bg-[#3DDC84]/10" // Verde para reactivar
                            )}
                          >
                            <FontAwesomeIcon icon={isActive ? faBan : faCircleCheck} /> 
                            {isActive ? 'Suspender' : 'Reactivar'}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      
      <UserModal 
        isOpen={isModalOpen} 
        mode={modalMode} 
        userToEdit={selectedUser} 
        onClose={() => setIsModalOpen(false)} 
        onSubmit={handleModalSubmit} 
      />
    </div>
  );
}