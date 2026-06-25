import { useState } from 'react';
import { cn } from '../../utils/cn';
import logoSolo from '../../assets/images/logo-solo.png';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChartBar, faPeopleGroup, faGear, faArrowLeft,
  faRightFromBracket, faGlobe, faMoon, faSun, faShieldHalved,
} from '@fortawesome/free-solid-svg-icons';
import { NexusAILogo } from '../../features/chat-ia/components/NexusAILogo';
import { useNavigationStore, type AppPage } from '../../store/useNavigationStore';
import { useSettingsStore } from '../../store/useSettingsStore';

interface NavItem {
  label: string;
  page: AppPage;
  icon?: IconDefinition;
  iconClass?: string;
}

// ─── Normal Navigation Sidebar ──────────────────────────────────────────────

function NormalSidebar({ isExpanded }: { isExpanded: boolean }) {
  const { currentPage, navigate, closeMobileMenu } = useNavigationStore();
  const { user } = useSettingsStore(); 

  const isAdmin = user?.role === 'admin' || user?.role === 'Admin';

  const navItems: NavItem[] = [
    { label: 'Command Center', page: 'dashboard', icon: faChartBar, iconClass: 'text-xl' },
    { label: 'Monitorización Live', page: 'monitorization', icon: faGlobe, iconClass: 'text-xl' },
    { label: 'Competitors', page: 'competitors', icon: faChartBar, iconClass: 'text-xl' },
    { label: 'Analytics', page: 'analytics', icon: faPeopleGroup, iconClass: 'text-sm' },
    { label: 'Nexus AI', page: 'chat-ia' },
    { label: 'Settings', page: 'settings', icon: faGear, iconClass: 'text-xl' },
  ];

  return (
    <div className="relative z-10 flex flex-col h-full gap-4 py-5 overflow-y-auto overflow-x-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden bg-gray-900 ">

      {/* Logo + Brand - Fade In Animation */}
      <div className={cn('flex items-center min-w-0 transition-all duration-300 animate-fade-in', isExpanded ? 'gap-4 px-4' : 'justify-center px-0')}>
        <div className="relative group flex h-10 w-10 flex-none items-center justify-center rounded-[12px] bg-gray-900  text-white shadow-lg overflow-hidden transition-all duration-500 hover:border-gray-500/80 hover:shadow-[0_0_15px_rgba(255,255,255,0.3)] ">
          <div className="absolute inset-0  opacity-50 group-hover:opacity-100 transition-opacity duration-500" />
          <img src={logoSolo} alt="Strategic Intel" className="relative z-10 h-full w-full object-contain p-1.5 drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" />
        </div>
        <div className={cn('min-w-0 transition-all duration-300 overflow-hidden', isExpanded ? 'opacity-100 translate-x-0 delay-100 max-w-[200px]' : 'opacity-0 w-0 max-w-0 -translate-x-4 pointer-events-none')}>
          <strong className="block text-sm font-semibold text-[#F1F5F9] whitespace-nowrap tracking-wide">Unity Nexus</strong>
          <p className="text-[11px] text-[#64748B] uppercase tracking-wider font-medium whitespace-nowrap">Command Center</p>
        </div>
      </div>

      {/* Navigation with Staggered Cascading Animations */}
      <nav className="grid gap-2 px-3 mt-4">
        {navItems.map((item, index) => {
          const isActive = currentPage === item.page;
          return (
            <button
              key={item.page}
              onClick={() => {
                navigate(item.page);
                closeMobileMenu();
              }}
              className={cn(
                'group relative flex items-center rounded-xl py-2.5 text-left text-sm font-medium transition-all duration-300 overflow-hidden animate-fade-in-up',
                isExpanded ? 'gap-3 px-3' : 'justify-center px-0',
                isActive
                  ? 'bg-gray-900/10 text-[#F1F5F9] border border-gray-100/30 '
                  : 'text-[#64748B] hover:bg-[#1E293B]/50 hover:text-[#F1F5F9] border border-transparent'
              )}
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-1/2 bg-gray-500 rounded-r-full shadow-[0_0_10px_rgba(0,173,239,0.8)]" />
              )}
              
              <span
                className={cn(
                  'inline-flex h-8 w-8 flex-none items-center justify-center rounded-lg transition-transform duration-300 group-hover:scale-110 [&>svg]:text-inherit',
                  isActive
                    ? 'text-gray-100'
                    : 'bg-gray-800/80 text-[#64748B] group-hover:text-[#F1F5F9]',
                )}
              >
                {item.page === 'chat-ia' ? (
                  <NexusAILogo variant="nav" className="text-inherit" />
                ) : item.icon ? (
                  <FontAwesomeIcon icon={item.icon} className={item.iconClass ?? 'text-xl'} />
                ) : null}
              </span>
              <span className={cn('block whitespace-nowrap transition-all duration-300 overflow-hidden', isExpanded ? 'opacity-100 translate-x-0 delay-75 max-w-[200px]' : 'opacity-0 w-0 max-w-0 -translate-x-4')}>
                {item.label}
              </span>

              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-[#7DD3FC]/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            </button>
          );
        })}
      </nav>

      {/* ── CUENTA — pinned to bottom ── */}
      <div className="mt-auto px-3 pb-4 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
        <button
          onClick={() => {
            navigate('profile' as any); // Cast a any temporalmente para evitar error de TS
            closeMobileMenu();
          }}
          className={cn(
            'group relative flex items-center rounded-xl border py-2 w-full text-left transition-all duration-300 overflow-hidden cursor-pointer',
            isExpanded ? 'gap-3 px-3' : 'justify-center px-0',
            isAdmin
              ? 'border-[#00ADEF]/30 bg-[#0F172A] hover:bg-[#1E293B] hover:border-gray-500/50 shadow-[0_0_15px_rgba(0,173,239,0.1)]'
              : 'border-[#334155]/60 bg-[#0F172A] hover:bg-[#1E293B]'
          )}
        >
          <div className={cn(
            'flex h-8 w-8 flex-none items-center justify-center rounded-lg text-white text-[11px] font-bold shadow-md transition-all duration-500 group-hover:scale-105',
            isAdmin
              ? 'bg-gradient-to-br from-[#00ADEF] to-[#0A5CF5] shadow-[0_0_10px_rgba(0,173,239,0.4)]'
              : 'bg-[#1E293B] border border-[#334155]'
          )}>
            {isAdmin ? (
              <FontAwesomeIcon icon={faShieldHalved} className="text-sm" />
            ) : (
              (user?.email || 'US').substring(0, 2).toUpperCase()
            )}
          </div>
          <div className={cn('min-w-0 transition-all duration-300 overflow-hidden', isExpanded ? 'opacity-100 translate-x-0 delay-100 max-w-[200px]' : 'opacity-0 w-0 max-w-0 -translate-x-4 pointer-events-none')}>
            <strong className="block text-[#F1F5F9] whitespace-nowrap text-sm font-medium">
              {user?.email || 'Usuario'}
            </strong>
            <span className={cn('text-[11px] whitespace-nowrap uppercase tracking-wider font-semibold transition-colors duration-300', isAdmin ? 'text-[#7DD3FC]' : 'text-[#64748B]')}>
              {isAdmin ? 'Top Management' : 'Analyst'}
            </span>
          </div>
        </button>
      </div>

    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function SectionLabel({ label, isExpanded }: { label: string; isExpanded: boolean }) {
  return (
    <div className={cn('transition-all duration-300 overflow-hidden', isExpanded ? 'px-4 mb-2 opacity-100 max-h-8 delay-75' : 'px-0 mb-0 opacity-0 max-h-0')}>
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#475569]">{label}</p>
    </div>
  );
}

function Divider({ isExpanded }: { isExpanded: boolean }) {
  return (
    <div className={cn('h-px bg-[#1E293B] transition-all duration-300', isExpanded ? 'mx-4 my-3 opacity-100' : 'mx-0 my-0 opacity-0')} />
  );
}

// ─── Settings Sidebar ────────────────────────────────────────────────────────
function SettingsSidebar({ isExpanded }: { isExpanded: boolean }) {
  const { navigate, closeMobileMenu } = useNavigationStore();
  const { language, toggleLanguage, theme, setTheme, user, logout } = useSettingsStore();

  const isAdmin = user?.role === 'admin' || user?.role === 'Admin';

  const labelClass = cn(
    'block whitespace-nowrap transition-all duration-300 overflow-hidden',
    isExpanded ? 'opacity-100 translate-x-0 delay-75 max-w-[200px]' : 'opacity-0 w-0 max-w-0 -translate-x-4'
  );

  const baseButtonClass = cn(
    'group relative flex items-center rounded-xl py-2.5 mx-3 text-left text-sm font-medium transition-all duration-300 overflow-hidden border border-transparent hover:bg-[#1E293B]/50 hover:border-[#334155]/50',
    isExpanded ? 'gap-3 px-3' : 'justify-center px-0'
  );

  return (
    <div className="relative z-10 flex flex-col h-full gap-2 py-5 overflow-y-auto overflow-x-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      
      {/* ── Logo + Brand ── */}
      <div className={cn('flex items-center min-w-0 transition-all duration-300 animate-fade-in mb-4', isExpanded ? 'gap-4 px-4' : 'justify-center px-0')}>
        <div className="relative flex h-10 w-10 flex-none items-center justify-center rounded-[12px] bg-[#0F172A] border border-[#334155] text-white shadow-lg overflow-hidden">
          <img src={logoSolo} alt="Strategic Intel" className="relative z-10 h-full w-full object-contain p-1.5 opacity-70" />
        </div>
        <div className={cn('min-w-0 transition-all duration-300 overflow-hidden', isExpanded ? 'opacity-100 translate-x-0 delay-100 max-w-[200px]' : 'opacity-0 w-0 max-w-0 -translate-x-4 pointer-events-none')}>
          <strong className="block text-sm font-semibold text-[#F1F5F9] whitespace-nowrap">Settings</strong>
          <p className="text-[11px] text-[#64748B] uppercase tracking-wider font-medium whitespace-nowrap">System Config</p>
        </div>
      </div>

      <nav className="flex flex-col gap-1">
        {/* ── Volver ── */}
        <button
          onClick={() => {
            navigate('dashboard');
            closeMobileMenu();
          }}
          className={cn(baseButtonClass, 'text-[#94A3B8] hover:text-[#F1F5F9] mb-4')}
        >
          <span className="inline-flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-[#1E293B]/40 group-hover:bg-[#334155]/40 transition-colors">
            <FontAwesomeIcon icon={faArrowLeft} className="text-[14px]" />
          </span>
          <span className={labelClass}>Back to Dashboard</span>
        </button>

        {/* ── IDIOMA ── */}
        <SectionLabel label="Localization" isExpanded={isExpanded} />
        <button
          onClick={toggleLanguage}
          className={cn(baseButtonClass, 'text-[#94A3B8] hover:text-[#F1F5F9]')}
        >
          <span className="inline-flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-[#1E293B]/40">
            <FontAwesomeIcon icon={faGlobe} className="text-[14px]" />
          </span>
          <div className={cn('flex items-center gap-2 min-w-0 transition-all duration-300 overflow-hidden', isExpanded ? 'opacity-100 translate-x-0 delay-75 max-w-[200px]' : 'opacity-0 w-0 max-w-0 -translate-x-4')}>
            <span className="whitespace-nowrap block">{language === 'en' ? 'English' : 'Español'}</span>
            <span className="rounded-[4px] bg-[#00ADEF]/10 border border-[#00ADEF]/20 px-1.5 py-0.5 text-[9px] font-bold text-[#7DD3FC] whitespace-nowrap">
              {language === 'en' ? 'EN' : 'ES'}
            </span>
          </div>
        </button>

        <Divider isExpanded={isExpanded} />

        {/* ── APARIENCIA ── */}
        <SectionLabel label="Appearance" isExpanded={isExpanded} />
        <button 
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className={cn(
            baseButtonClass, 
            'transition-all duration-300',
            theme === 'dark' ? 'text-[#94A3B8] hover:text-[#F1F5F9]' : 'text-[#64748B] hover:text-[#0F172A]'
          )}
        >
          <span className={cn(
            "inline-flex h-8 w-8 flex-none items-center justify-center rounded-lg transition-colors duration-300",
            theme === 'dark' ? "bg-[#1E293B]/40" : "bg-[#00ADEF]/10 text-[#00ADEF]"
          )}>
            <FontAwesomeIcon icon={theme === 'dark' ? faSun : faMoon} className="text-[14px]" />
          </span>
          
          <span className={labelClass}>
            {theme === 'dark' ? 'Light Theme' : 'Dark Theme'}
          </span>
        </button>

        <Divider isExpanded={isExpanded} />

        {/* ── SESIÓN ── */}
        <SectionLabel label="Session" isExpanded={isExpanded} />
        <button 
          onClick={logout} 
          className={cn(baseButtonClass, 'text-[#FCA5A5] hover:bg-[#FCA5A5]/10 hover:border-[#FCA5A5]/20 group/logout')}
        >
          <span className="inline-flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-[#FCA5A5]/10 group-hover/logout:bg-[#FCA5A5]/20 transition-colors">
            <FontAwesomeIcon icon={faRightFromBracket} className="text-[14px]" />
          </span>
          <span className={labelClass}>Sign Out</span>
        </button>
      </nav>

      {/* ── CUENTA ── */}
      <div className="mt-auto px-3 pb-4">
        <button
          onClick={() => {
            navigate('profile' as any); // Cast a any temporalmente
            closeMobileMenu();
          }}
          className={cn(
            'group relative flex items-center rounded-xl border py-2 w-full text-left transition-all duration-300 overflow-hidden cursor-pointer',
            isExpanded ? 'gap-3 px-3' : 'justify-center px-0',
            isAdmin
              ? 'border-[#00ADEF]/30 bg-[#0F172A] hover:bg-[#1E293B] shadow-[0_0_15px_rgba(0,173,239,0.1)]'
              : 'border-[#334155]/60 bg-[#0F172A] hover:bg-[#1E293B]'
          )}
        >
          <div className={cn(
            'flex h-8 w-8 flex-none items-center justify-center rounded-lg text-white text-[11px] font-bold shadow-md transition-all duration-500 group-hover:scale-105',
            isAdmin
              ? 'bg-gradient-to-br from-[#00ADEF] to-[#0A5CF5]'
              : 'bg-[#1E293B] border border-[#334155]'
          )}>
            {isAdmin ? (
              <FontAwesomeIcon icon={faShieldHalved} className="text-sm" />
            ) : (
              (user?.email || 'US').substring(0, 2).toUpperCase()
            )}
          </div>
          <div className={cn('min-w-0 transition-all duration-300 overflow-hidden', isExpanded ? 'opacity-100 translate-x-0 delay-100 max-w-[200px]' : 'opacity-0 w-0 max-w-0 -translate-x-4 pointer-events-none')}>
            <strong className="block text-[#F1F5F9] whitespace-nowrap text-sm font-medium">
              {user?.email || 'Usuario'}
            </strong>
            <span className={cn('text-[11px] whitespace-nowrap uppercase tracking-wider font-semibold transition-colors duration-300', isAdmin ? 'text-[#7DD3FC]' : 'text-[#64748B]')}>
              {isAdmin ? 'Top Management' : 'Analyst'}
            </span>
          </div>
        </button>
      </div>

    </div>
  );
}

// ─── Root Sidebar Shell ──────────────────────────────────────────────────────

export default function Sidebar() {
  const { currentPage, isMobileMenuOpen, closeMobileMenu } = useNavigationStore();
  const [isExpanded, setIsExpanded] = useState(false);

  const isSettings = currentPage === 'settings';

  return (
    <>
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[45] md:hidden animate-fade-in"
          onClick={closeMobileMenu}
        />
      )}

      <div className="fixed left-0 top-0 bottom-0 w-4 z-50 hidden md:block" onMouseEnter={() => setIsExpanded(true)} />

      <aside
        className={cn(
          'fixed left-0 top-0 bottom-0 flex flex-col border-r border-gray-800/50 bg-gray-900/95 backdrop-blur-2xl overflow-hidden z-[50] shadow-2xl shadow-black',
          'transition-all duration-400 cubic-bezier(0.4, 0, 0.2, 1)',
          isExpanded ? 'md:w-[260px]' : 'md:w-[88px]',
          'w-[260px]', 
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
      >
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-gray-500 to-transparent opacity-50" />
        
        {isSettings ? (
          <SettingsSidebar isExpanded={isExpanded || isMobileMenuOpen} />
        ) : (
          <NormalSidebar isExpanded={isExpanded || isMobileMenuOpen} />
        )}
      </aside>
    </>
  );
}