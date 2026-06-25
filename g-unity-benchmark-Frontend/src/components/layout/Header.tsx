import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars } from '@fortawesome/free-solid-svg-icons';

import { useNavigationStore } from '../../store/useNavigationStore';
import { HeaderAnalyticsControls } from './HeaderAnalyticsControls';
import { useHeaderDatabaseStatus, useHeaderLastUpdate, useHeaderSourcesCount } from './hooks/useHeaderLiveData';

/** Ancho fijo del slot Filter + Update para que el header no salte entre módulos. */
const HEADER_CONTROLS_SLOT_CLASS = 'hidden md:flex w-[288px] shrink-0 items-center justify-end';

export default function Header() {
  const { toggleMobileMenu, currentPage } = useNavigationStore();
  const isAnalytics = currentPage === 'analytics';
  const isMonitorization = currentPage === 'monitorization';
  const showAnalyticsControls = isAnalytics || isMonitorization;

  const { data: dbConnected, isPending, isError: isDbError, isFetched } = useHeaderDatabaseStatus();
  const { data: sourcesCount, isLoading: isSourcesLoading } = useHeaderSourcesCount();
  const { data: lastUpdate, isLoading: isLastUpdateLoading } = useHeaderLastUpdate();

  const isDbLoading = isPending && !isFetched;
  const isDatabaseConnected = dbConnected === true;
  const isDatabaseDisconnected = isDbError || dbConnected === false;

  const statusLabelClass = isDbLoading
    ? 'text-gray-400'
    : isDatabaseConnected
      ? 'text-unity-active'
      : 'text-unity-error';

  const statusTitle = isDbLoading
    ? 'Comprobando conexión a la base de datos…'
    : isDatabaseConnected
      ? 'Conectado a la base de datos'
      : 'Sin conexión a la base de datos';

  const sourcesLabel =
    isSourcesLoading || sourcesCount === undefined ? '—' : String(sourcesCount);
  const lastUpdateLabel =
    isLastUpdateLoading || !lastUpdate ? '—' : lastUpdate;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-unity-border bg-unity-card/80 backdrop-blur-md overflow-visible">
      <div className="px-6 py-3">
        <div className="flex items-center justify-between">
          <button
            onClick={toggleMobileMenu}
            className="relative z-10 flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-unity-text-secondary hover:bg-white/10 hover:text-white transition-colors md:hidden"
            aria-label="Toggle Navigation"
          >
            <FontAwesomeIcon icon={faBars} className="text-xl" />
          </button>

          <div className="ml-auto mr-0 flex h-10 items-center gap-6 lg:mr-1 lg:gap-8">
            <HeaderLiveDataIndicators
              withControlsOffset={showAnalyticsControls}
              statusTitle={statusTitle}
              statusLabelClass={statusLabelClass}
              sourcesLabel={sourcesLabel}
              lastUpdateLabel={lastUpdateLabel}
              isDatabaseConnected={isDatabaseConnected}
              isDatabaseDisconnected={isDatabaseDisconnected}
              isDbLoading={isDbLoading}
            />

            <div className={HEADER_CONTROLS_SLOT_CLASS} aria-hidden={!showAnalyticsControls}>
              {showAnalyticsControls ? <HeaderAnalyticsControls /> : null}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

type HeaderLiveDataIndicatorsProps = {
  withControlsOffset?: boolean;
  statusTitle: string;
  statusLabelClass: string;
  sourcesLabel: string;
  lastUpdateLabel: string;
  isDatabaseConnected: boolean;
  isDatabaseDisconnected: boolean;
  isDbLoading: boolean;
};

function HeaderLiveDataIndicators({
  withControlsOffset = false,
  statusTitle,
  statusLabelClass,
  sourcesLabel,
  lastUpdateLabel,
  isDatabaseConnected,
  isDatabaseDisconnected,
  isDbLoading,
}: HeaderLiveDataIndicatorsProps) {
  return (
    <div
      className={`hidden md:flex items-center gap-6 shrink-0 ${
        withControlsOffset ? 'mr-1 lg:mr-2' : ''
      }`}
    >
      <div
        className="flex items-center gap-2.5"
        title={statusTitle}
        aria-label={statusTitle}
      >
        <LiveDataStatusDot
          connected={isDatabaseConnected}
          disconnected={isDatabaseDisconnected}
          loading={isDbLoading}
        />
        <span className={`text-xs font-medium uppercase tracking-wider ${statusLabelClass}`}>
          Live Data
        </span>
      </div>

      <div className="text-xs text-unity-text-tertiary">
        <span className="font-bold text-white">{sourcesLabel}</span> posts
      </div>

      <div className="shrink-0 whitespace-nowrap text-xs text-unity-text-tertiary">
        Last update: <span className="text-white">{lastUpdateLabel}</span>
      </div>
    </div>
  );
}

type LiveDataStatusDotProps = {
  connected: boolean;
  disconnected: boolean;
  loading: boolean;
};

function LiveDataStatusDot({ connected, disconnected, loading }: LiveDataStatusDotProps) {
  if (loading) {
    return (
      <span
        className="relative inline-flex h-3.5 w-3.5 shrink-0 rounded-full bg-gray-500 animate-pulse"
        aria-hidden
      />
    );
  }

  if (connected) {
    return (
      <span className="relative inline-flex h-3.5 w-3.5 shrink-0" aria-hidden>
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00D084] opacity-60" />
        <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-[#00D084] shadow-[0_0_0_2px_rgba(0,208,132,0.25),0_0_14px_rgba(0,208,132,0.85)]" />
      </span>
    );
  }

  if (disconnected) {
    return (
      <span
        className="relative inline-flex h-3.5 w-3.5 shrink-0 rounded-full bg-[#FF5449] shadow-[0_0_0_2px_rgba(255,84,73,0.25),0_0_14px_rgba(255,84,73,0.85)]"
        aria-hidden
      />
    );
  }

  return (
    <span
      className="relative inline-flex h-3.5 w-3.5 shrink-0 rounded-full bg-gray-500"
      aria-hidden
    />
  );
}
