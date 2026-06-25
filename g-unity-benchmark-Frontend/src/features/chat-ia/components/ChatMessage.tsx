import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faLightbulb,
  faChartLine,
  faBolt,
  faLink,
  faCircleExclamation,
  faRotateRight,
  faChevronDown,
  faChevronUp,
  faShieldHalved,
  faThumbsUp,
  faThumbsDown,
} from '@fortawesome/free-solid-svg-icons';
import { NexusAILogo } from './NexusAILogo';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ChartType, VisualData } from '../hooks/useBackendChat';

export type ChatMessageKind = 'normal' | 'error';
export type ChatFeedbackValue = 'positive' | 'negative';

interface ChatMessageSource {
  title: string;
  url: string;
}

interface ChatMessageProps {
  sender: 'ai' | 'user';
  message: string;
  time: string;
  kind?: ChatMessageKind;
  insights?: string[];
  recommendations?: string[];
  visualData?: VisualData;
  sources?: ChatMessageSource[];
  confidence?: number;
  onRetry?: () => void;
  onFeedback?: (value: ChatFeedbackValue) => void;
  feedback?: ChatFeedbackValue | null;
  feedbackBusy?: boolean;
  /** Si es true, el texto del mensaje se revela con efecto typewriter */
  streaming?: boolean;
  /** Notifica cuando termina la animación de escritura (útil para auto-scroll) */
  onStreamProgress?: () => void;
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Hook que revela progresivamente un string carácter a carácter
 * con duración escalada al largo del texto. Respeta prefers-reduced-motion.
 */
function useTypewriter(text: string, enabled: boolean, onProgress?: () => void): { displayed: string; done: boolean } {
  const [state, setState] = useState<{ displayed: string; done: boolean }>(() => ({
    displayed: enabled ? '' : text,
    done: !enabled,
  }));
  const rafRef = useRef<number | null>(null);
  const onProgressRef = useRef(onProgress);
  onProgressRef.current = onProgress;

  useEffect(() => {
    if (!enabled || prefersReducedMotion() || !text) {
      setState({ displayed: text, done: true });
      return;
    }

    setState({ displayed: '', done: false });
    const totalLen = text.length;
    // Velocidad: ~14 ms por carácter, mínimo 600 ms, máximo 2800 ms.
    const durationMs = Math.min(2800, Math.max(600, totalLen * 14));
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / durationMs);
      // easing suave (ease-out-quad) para que termine progresivamente, no brusco
      const eased = 1 - (1 - progress) * (1 - progress);
      const visibleChars = Math.floor(eased * totalLen);
      setState({ displayed: text.slice(0, visibleChars), done: false });
      onProgressRef.current?.();
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setState({ displayed: text, done: true });
        onProgressRef.current?.();
      }
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [text, enabled]);

  return state;
}

const PIE_COLORS = ['#00ADEF', '#7C3AED', '#3DDC84', '#FFC107', '#FF5449', '#9EB1FF'];

function safeHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function MiniChart({ visualData }: { visualData: VisualData }) {
  const rows = useMemo(
    () =>
      visualData.labels.map((label, index) => ({
        label,
        value: Number.isFinite(visualData.values[index]) ? visualData.values[index] : 0,
      })),
    [visualData.labels, visualData.values],
  );

  const tooltipFormatter = ((value: unknown): [string, string] => [
    `${value ?? ''}${visualData.unit}`,
    'Value',
  ]) as never;

  const containerClass = 'rounded-lg border border-[#2A2A2A]/70 bg-black/20 p-3';
  const header = (
    <h4 className="mb-2 flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-wider text-[#00ADEF]">
      <FontAwesomeIcon icon={faChartLine} className="text-[10px]" /> {visualData.title}
    </h4>
  );

  const chartByType: Record<ChartType, ReactElement | null> = {
    none: null,
    bar: (
      <BarChart data={rows} margin={{ top: 4, right: 4, bottom: 4, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
        <XAxis dataKey="label" tick={{ fill: '#9CA3AF', fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={36} />
        <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} />
        <Tooltip
          formatter={tooltipFormatter}
          contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: 8, color: '#E5E7EB' }}
          labelStyle={{ color: '#E5E7EB' }}
        />
        <Bar dataKey="value" fill="#00ADEF" radius={[4, 4, 0, 0]} />
      </BarChart>
    ),
    line: (
      <LineChart data={rows} margin={{ top: 4, right: 8, bottom: 4, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
        <XAxis dataKey="label" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
        <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} />
        <Tooltip
          formatter={tooltipFormatter}
          contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: 8, color: '#E5E7EB' }}
          labelStyle={{ color: '#E5E7EB' }}
        />
        <Line type="monotone" dataKey="value" stroke="#00ADEF" strokeWidth={2.5} dot={{ r: 3, fill: '#00ADEF' }} />
      </LineChart>
    ),
    pie: (
      <PieChart>
        <Tooltip
          formatter={
            ((value: unknown, _name: unknown, item: unknown): [string, string] => {
              const label = (item as { payload?: { label?: string } } | undefined)?.payload?.label ?? '';
              return [`${value ?? ''}${visualData.unit}`, label];
            }) as never
          }
          contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: 8, color: '#E5E7EB' }}
        />
        <Pie data={rows} dataKey="value" nameKey="label" outerRadius={60} innerRadius={30} paddingAngle={2}>
          {rows.map((_, idx) => (
            <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
          ))}
        </Pie>
      </PieChart>
    ),
  };

  const chart = chartByType[visualData.chartType];
  if (!chart) return null;

  return (
    <div className={containerClass}>
      {header}
      <div className="h-28">
        <ResponsiveContainer width="100%" height="100%">{chart}</ResponsiveContainer>
      </div>
      {visualData.chartType === 'pie' && (
        <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-400">
          {rows.map((row, idx) => (
            <li key={row.label} className="inline-flex items-center gap-1">
              <span
                className="inline-block h-2 w-2 rounded-sm"
                style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
              />
              {row.label}: <span className="text-gray-200">{row.value}{visualData.unit}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SourcesAuditTrail({ sources }: { sources: ChatMessageSource[] }) {
  const [open, setOpen] = useState(sources.length <= 3);
  if (!sources.length) return null;

  return (
    <div className="pt-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-[#8AA4B3] transition hover:text-[#00ADEF]"
        aria-expanded={open}
      >
        <FontAwesomeIcon icon={faShieldHalved} className="text-[9px]" />
        Consulted sources ({sources.length})
        <FontAwesomeIcon icon={open ? faChevronUp : faChevronDown} className="text-[8px]" />
      </button>
      {open && (
        <ol className="mt-1.5 space-y-1 text-[12px] leading-relaxed text-gray-300">
          {sources.map((src, idx) => (
            <li key={`${src.url}-${idx}`} className="flex items-start gap-2">
              <span className="tabular-nums text-[#8AA4B3]">{String(idx + 1).padStart(2, '0')}.</span>
              <span className="min-w-0 flex-1 break-words">
                <a
                  href={src.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[#00ADEF] hover:underline"
                  title={src.url}
                >
                  <FontAwesomeIcon icon={faLink} className="text-[9px]" />
                  {src.title}
                </a>
                <span className="ml-1 text-gray-500">— {safeHostname(src.url)}</span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export function ChatMessage({
  sender,
  message,
  time,
  kind = 'normal',
  insights,
  recommendations,
  visualData,
  sources,
  confidence,
  onRetry,
  onFeedback,
  feedback,
  feedbackBusy,
  streaming = false,
  onStreamProgress,
}: ChatMessageProps) {
  const isUser = sender === 'user';
  const isError = kind === 'error';
  // El typewriter solo aplica al cuerpo del mensaje del asistente (no usuario, no error).
  const shouldStream = !isUser && !isError && streaming;
  const { displayed: streamedText, done: streamDone } = useTypewriter(message, shouldStream, onStreamProgress);
  // Mensajes del usuario y errores se muestran completos siempre.
  const bodyText = isUser || isError ? message : streamedText;
  // Los bloques enriquecidos (insights, chart, recommendations, sources, feedback)
  // solo aparecen una vez que termina el typewriter, con fade-in.
  const showRichBlocks = !shouldStream || streamDone;

  useLayoutEffect(() => {
    if (showRichBlocks) {
      onStreamProgress?.();
    }
  }, [showRichBlocks, onStreamProgress, visualData, insights, recommendations, sources]);

  // ── Mensaje del usuario: alineado a la derecha, pill sutil ──
  if (isUser) {
    return (
      <article className="group flex animate-fadeIn justify-end">
        <div className="flex max-w-[85%] flex-col items-end gap-1 sm:max-w-[75%]">
          <div className="rounded-2xl rounded-tr-md bg-[#00ADEF]/10 px-4 py-2.5 text-[15px] leading-7 text-gray-50">
            <p className="whitespace-pre-wrap break-words">{message}</p>
          </div>
          <span className="px-1 text-[10px] text-gray-600 opacity-0 transition-opacity group-hover:opacity-100">
            {time}
          </span>
        </div>
      </article>
    );
  }

  // ── Mensaje del asistente / error: alineado a la izquierda con avatar ──
  const avatarClass = isError ? 'bg-red-500/10 text-red-400' : 'bg-[#00ADEF]/10 text-gray-100 p-0';

  return (
    <article className="group flex animate-fadeIn items-start gap-3">
      <span
        className={`mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full ${avatarClass}`}
        aria-hidden={!isError}
        aria-label={isError ? undefined : 'Nexus AI'}
      >
        {isError ? (
          <FontAwesomeIcon icon={faCircleExclamation} className="text-[11px]" />
        ) : (
          <NexusAILogo size="xs" variant="plain" tone="light" title="Nexus AI" />
        )}
      </span>

      <div className="flex min-w-0 flex-1 max-w-[85%] flex-col items-start gap-1 sm:max-w-[75%]">
        <div
          className={`w-full rounded-2xl rounded-tl-md px-4 py-3 ${
            isError ? 'border border-red-500/20 bg-red-500/[0.06]' : 'bg-white/[0.04]'
          }`}
        >
          {isError && (
            <p className="mb-1 text-[10.5px] font-semibold uppercase tracking-wider text-red-300">
              Response error
            </p>
          )}

          <div
            className={`prose prose-invert max-w-none text-[15px] leading-7 text-[#D8D8D8] [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_p]:my-2 [&_ul]:my-2 [&_ol]:my-2 [&_li]:my-0 [&_a]:text-[#00ADEF] [&_a]:no-underline hover:[&_a]:underline [&_strong]:text-white [&_code]:rounded [&_code]:bg-black/40 [&_code]:px-1 ${
              shouldStream && !streamDone ? 'streaming-cursor' : ''
            }`}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{bodyText || '\u200B'}</ReactMarkdown>
          </div>

          {isError && onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-2.5 inline-flex items-center gap-2 rounded-md border border-red-400/30 px-2.5 py-1 text-[12px] text-red-200 transition hover:border-red-400/60 hover:bg-red-500/10"
            >
              <FontAwesomeIcon icon={faRotateRight} className="text-[10px]" />
              Retry
            </button>
          )}

          {!isError && showRichBlocks && (
            <div className="mt-3 flex flex-col gap-3 animate-fadeIn">
              {insights && insights.length > 0 && (
                <div>
                  <h4 className="mb-1.5 flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-wider text-[#3DDC84]">
                    <FontAwesomeIcon icon={faLightbulb} className="text-[10px]" /> Key Insights
                  </h4>
                  <ul className="space-y-1 text-[14.5px] leading-7 text-[#B8B8B8]">
                    {insights.map((insight, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="mt-2 inline-block h-1 w-1 flex-shrink-0 rounded-full bg-[#3DDC84]" />
                        <span>{insight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {visualData && <MiniChart visualData={visualData} />}

              {recommendations && recommendations.length > 0 && (
                <div>
                  <h4 className="mb-1.5 flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-wider text-[#FFC107]">
                    <FontAwesomeIcon icon={faBolt} className="text-[10px]" /> Action Items
                  </h4>
                  <ul className="space-y-1 text-[14.5px] leading-7 text-[#E5C778]">
                    {recommendations.map((rec, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="mt-2 inline-block h-1 w-1 flex-shrink-0 rounded-full bg-[#FFC107]" />
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {sources && sources.length > 0 && <SourcesAuditTrail sources={sources} />}

              {(typeof confidence === 'number' || onFeedback) && (
                <div className="flex items-center justify-between gap-2 pt-1 text-[12px]">
                  {typeof confidence === 'number' ? (
                    <span className="text-[#8AA4B3]">
                      Confidence: <span className="text-gray-200">{(confidence * 100).toFixed(0)}%</span>
                    </span>
                  ) : (
                    <span />
                  )}
                  {onFeedback && (
                    <div className="flex items-center gap-1 opacity-60 transition-opacity group-hover:opacity-100">
                      <button
                        type="button"
                        disabled={feedbackBusy || feedback === 'positive'}
                        onClick={() => onFeedback('positive')}
                        aria-label="Mark response as helpful"
                        className={`rounded-md px-1.5 py-1 transition ${
                          feedback === 'positive'
                            ? 'bg-[#3DDC84]/10 text-[#3DDC84]'
                            : 'text-gray-500 hover:bg-white/10 hover:text-[#3DDC84]'
                        } disabled:cursor-not-allowed disabled:opacity-60`}
                      >
                        <FontAwesomeIcon icon={faThumbsUp} className="text-[11px]" />
                      </button>
                      <button
                        type="button"
                        disabled={feedbackBusy || feedback === 'negative'}
                        onClick={() => onFeedback('negative')}
                        aria-label="Mark response as not helpful"
                        className={`rounded-md px-1.5 py-1 transition ${
                          feedback === 'negative'
                            ? 'bg-red-500/10 text-red-300'
                            : 'text-gray-500 hover:bg-white/10 hover:text-red-300'
                        } disabled:cursor-not-allowed disabled:opacity-60`}
                      >
                        <FontAwesomeIcon icon={faThumbsDown} className="text-[11px]" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <span className="px-1 text-[10px] text-gray-600 opacity-0 transition-opacity group-hover:opacity-100">
          {time}
        </span>
      </div>
    </article>
  );
}
