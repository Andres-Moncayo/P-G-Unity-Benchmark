import { useEffect, type ReactNode } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBolt,
  faXmark,
  faCopy,
  faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons';
import { cn } from '../../../utils/cn';
import { useServiceDraftStore } from '../../../store/useServiceDraftStore';

const SEVERITY_TEXT: Record<string, string> = {
  critical: 'text-[#FF4C4C]',
  high: 'text-[#FF6B6B]',
  medium: 'text-[#FFC107]',
  low: 'text-[#3DDC84]',
};

function Section({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('space-y-2', className)}>
      <h4 className="text-[10px] font-semibold uppercase tracking-widest text-[#94A3B8]">
        {title}
      </h4>
      {children}
    </section>
  );
}

export default function ServiceDraftModal() {
  const isOpen = useServiceDraftStore((s) => s.isOpen);
  const isLoading = useServiceDraftStore((s) => s.isLoading);
  const error = useServiceDraftStore((s) => s.error);
  const draft = useServiceDraftStore((s) => s.draft);
  const editedText = useServiceDraftStore((s) => s.editedText);
  const closeDraft = useServiceDraftStore((s) => s.closeDraft);
  const setEditedText = useServiceDraftStore((s) => s.setEditedText);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDraft();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, closeDraft]);

  if (!isOpen) return null;

  const sevClass =
    SEVERITY_TEXT[draft?.technical.severity ?? 'medium'] ?? 'text-[#94A3B8]';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(editedText);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="service-draft-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        aria-label="Cerrar"
        onClick={closeDraft}
      />

      <div className="relative z-10 flex max-h-[min(92vh,900px)] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-[#1E293B]/90 bg-gray-900/95 shadow-2xl shadow-black/50">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[#1E293B]/80 px-4 py-4 sm:px-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-md border border-[rgba(110,193,255,0.3)] bg-[rgba(110,193,255,0.08)]">
                <FontAwesomeIcon
                  icon={faBolt}
                  className="text-[14px] text-[rgba(110,193,255,0.9)]"
                />
              </span>
              <h2
                id="service-draft-title"
                className="text-[16px] font-semibold tracking-[0.03em] text-[#E2E8F0]"
              >
                Service Draft
              </h2>
            </div>
            <p className="mt-1 text-[12px] text-[#64748B]/80">
              Intelligent commercial proposal · Globant × Unity
            </p>
          </div>
          <button
            type="button"
            onClick={closeDraft}
            aria-label="Close"
            className="shrink-0 rounded-md border border-[#1E293B]/80 p-2 text-[#94A3B8] transition hover:border-[#334155] hover:text-[#E2E8F0]"
          >
            <FontAwesomeIcon icon={faXmark} className="text-[12px]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          {isLoading && (
            <div className="flex min-h-[280px] flex-col items-center justify-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1E293B] border-t-[rgba(110,193,255,0.8)]" />
              <p className="text-[13px] font-medium text-[#E2E8F0] animate-pulse">
                Generating draft from analyzed_posts…
              </p>
              <p className="text-[11px] text-[#64748B]/70">
                Layers: technical · studio mapping · business value
              </p>
            </div>
          )}

          {error && !isLoading && (
            <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-lg border border-[#FF4C4C]/30 bg-[#FF4C4C]/5 px-4 py-6 text-center">
              <FontAwesomeIcon
                icon={faTriangleExclamation}
                className="text-[22px] text-[#FF4C4C]"
              />
              <p className="text-[13px] font-semibold text-[#FCA5A5]">
                Error generating draft
              </p>
              <p className="text-[11px] text-[#64748B]/80 max-w-sm">{error}</p>
            </div>
          )}

          {draft && !isLoading && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    'text-[8px] px-1.5 py-px rounded font-semibold uppercase border bg-white/[0.02]',
                    sevClass,
                  )}
                >
                  {draft.technical.severity}
                </span>
                <span className="text-[8px] text-[#64748B]/60 bg-[#1E293B]/60 px-1.5 py-px rounded">
                  {draft.technical.category}
                </span>
                <span className="text-[8px] text-[#64748B]/60 font-mono">
                  Post #{draft.analyzed_post_id}
                </span>
                <span className="ml-auto text-[9px] text-[rgba(110,193,255,0.75)] font-medium">
                  {draft.studio_mapping.studio_name}
                </span>
              </div>

              <Section title="Resumen ejecutivo">
                <p className="text-[13px] leading-relaxed text-[#CBD5E1]">
                  {draft.executive_summary}
                </p>
              </Section>

              <div className="grid gap-4 sm:grid-cols-2">
                <Section title="Impacto técnico">
                  <p className="text-[12px] leading-relaxed text-[#64748B]/80">
                    {draft.technical_impact}
                  </p>
                  <ul className="mt-2 space-y-1">
                    {draft.technical.technical_signals.slice(0, 4).map((s) => (
                      <li
                        key={s}
                        className="text-[10px] text-[#94A3B8] before:content-['·'] before:mr-1"
                      >
                        {s}
                      </li>
                    ))}
                  </ul>
                </Section>

                <Section title="Impacto de negocio">
                  <p className="text-[12px] leading-relaxed text-[#64748B]/80">
                    {draft.business_impact}
                  </p>
                  <p className="mt-2 text-[11px] font-mono text-[#FCA5A5]/90">
                    {draft.business_value.revenue_shrinkage_label}
                  </p>
                </Section>
              </div>

              <Section title="Estructura sugerida de Pod">
                <div className="grid gap-2 sm:grid-cols-2">
                  {draft.suggested_pod.map((role) => (
                    <div
                      key={role.title}
                      className="rounded-lg border border-[#1E293B]/80 bg-white/[0.02] p-2.5"
                    >
                      <p className="text-[12px] font-semibold text-[#E2E8F0]">
                        {role.title}
                      </p>
                      <p className="mt-0.5 text-[10px] text-[#64748B]/70">
                        {role.focus}
                      </p>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-[#64748B]/60 italic">
                  {draft.studio_mapping.rationale}
                </p>
              </Section>

              <Section title="Estimación ROI">
                <div className="grid gap-2 sm:grid-cols-2">
                  {[
                    ['Impacto económico', draft.roi.economic_impact],
                    ['Riesgo mitigado', draft.roi.risk_mitigated],
                    ['Valor potencial', draft.roi.potential_value],
                    ['Justificación', draft.roi.justification],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-lg border border-[#1E293B]/80 bg-white/[0.02] p-2.5"
                    >
                      <p className="text-[9px] font-semibold uppercase tracking-wide text-[#64748B]/60">
                        {label}
                      </p>
                      <p className="mt-1 text-[11px] leading-snug text-[#94A3B8]">
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
              </Section>

              <Section title="Borrador editable">
                <textarea
                  value={editedText}
                  onChange={(e) => setEditedText(e.target.value)}
                  rows={12}
                  className="w-full resize-y rounded-lg border border-[#1E293B]/80 bg-[#0A0B0D] px-3 py-2.5 font-mono text-[11px] leading-relaxed text-[#CBD5E1] outline-none transition focus:border-[rgba(110,193,255,0.4)]"
                  spellCheck={false}
                />
                {typeof draft.meta?.calculation_note === "string" && (
                  <p className="text-[9px] text-[#64748B]/50">
                    {draft.meta.calculation_note}
                  </p>
                )}
              </Section>
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-[#1E293B]/80 px-4 py-3 sm:px-5">
          <button
            type="button"
            onClick={closeDraft}
            className="rounded-sm border border-[#1E293B]/80 px-3 py-1.5 text-[12px] font-medium text-[#94A3B8] transition hover:border-[#334155] hover:text-[#E2E8F0]"
          >
            Cerrar
          </button>
          {draft && (
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 rounded-sm border border-[rgba(110,193,255,0.3)] bg-[rgba(110,193,255,0.08)] px-3 py-1.5 text-[12px] font-medium text-[rgba(110,193,255,0.9)] transition hover:bg-[rgba(110,193,255,0.12)]"
            >
              <FontAwesomeIcon icon={faCopy} className="text-[11px]" />
              Copiar borrador
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
