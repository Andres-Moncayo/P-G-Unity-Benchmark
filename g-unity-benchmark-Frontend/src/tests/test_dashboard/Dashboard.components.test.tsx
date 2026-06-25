import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import GlobalSentimentCard from '../../features/dashboard/components/charts/GlobalSentimentCard';
import RealTimeAlertsMonitor from '../../features/dashboard/components/charts/RealTimeAlertsMonitor';

// Mock de FontAwesome para evitar problemas de SVG en jsdom
vi.mock('@fortawesome/react-fontawesome', () => ({
  FontAwesomeIcon: ({ icon }: { icon: unknown }) => <span data-testid="fa-icon">{String(icon)}</span>,
}));

// ─────────────────────────────────────────────────────────────────────────────
// GlobalSentimentCard Tests
// ─────────────────────────────────────────────────────────────────────────────
describe('TestGlobalSentimentCard — Componente GlobalSentimentCard', () => {
  // ─── Test 12 ───
  it('Test 12: renderiza los valores de NPS para Unity, Godot y Unreal/Industry', () => {
    render(
      <GlobalSentimentCard
        nps={{ unity: 42, godot: 68, industry: 55 }}
        churn={{ risk: 'medium', probability: 0.38 }}
      />
    );

    expect(screen.getByText('42%')).toBeInTheDocument();
    expect(screen.getByText('68%')).toBeInTheDocument();
    expect(screen.getByText('55%')).toBeInTheDocument();
    expect(screen.getByText('Unity')).toBeInTheDocument();
    expect(screen.getByText('Godot')).toBeInTheDocument();
    expect(screen.getByText('Unreal')).toBeInTheDocument();
  });

  // ─── Test 13 ───
  it('Test 13: muestra riesgo "low" con clase de color verde text-[#6EE7B7]', () => {
    render(
      <GlobalSentimentCard
        nps={{ unity: 42, godot: 68, industry: 55 }}
        churn={{ risk: 'low', probability: 0.10 }}
      />
    );

    const riskElement = screen.getByText('low');
    expect(riskElement).toHaveClass('text-[#6EE7B7]');
  });

  // ─── Test 14 ───
  it('Test 14: muestra riesgo "high" con clase de color rojo text-[#FCA5A5]', () => {
    render(
      <GlobalSentimentCard
        nps={{ unity: 42, godot: 68, industry: 55 }}
        churn={{ risk: 'high', probability: 0.80 }}
      />
    );

    const riskElement = screen.getByText('high');
    expect(riskElement).toHaveClass('text-[#FCA5A5]');
  });

  // ─── Test 15 ───
  it('Test 15: muestra riesgo "medium" con clase de color amarillo text-[#FCD34D]', () => {
    render(
      <GlobalSentimentCard
        nps={{ unity: 42, godot: 68, industry: 55 }}
        churn={{ risk: 'medium', probability: 0.38 }}
      />
    );

    const riskElement = screen.getByText('medium');
    expect(riskElement).toHaveClass('text-[#FCD34D]');
  });

  // ─── Test 16 ───
  it('Test 16: muestra la etiqueta "Churn Predictor" en el componente', () => {
    render(
      <GlobalSentimentCard
        nps={{ unity: 42, godot: 68, industry: 55 }}
        churn={{ risk: 'low', probability: 0.10 }}
      />
    );

    expect(screen.getByText('Churn Predictor')).toBeInTheDocument();
    expect(screen.getByText('NPS')).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// RealTimeAlertsMonitor Tests
// ─────────────────────────────────────────────────────────────────────────────
describe('TestRealTimeAlertsMonitor — Componente RealTimeAlertsMonitor', () => {
  const baseData = {
    feeds: 1240,
    forums: 380,
    news: 92,
    reports: 14,
    social: 870,
    alerts: [] as any[],
  };

  // ─── Test 17 ───
  it('Test 17: muestra los contadores de las 5 fuentes de datos', () => {
    render(<RealTimeAlertsMonitor data={baseData} />);

    expect(screen.getByText('1240')).toBeInTheDocument();
    expect(screen.getByText('380')).toBeInTheDocument();
    expect(screen.getByText('92')).toBeInTheDocument();
    expect(screen.getByText('14')).toBeInTheDocument();
    expect(screen.getByText('870')).toBeInTheDocument();
    expect(screen.getByText('Feeds')).toBeInTheDocument();
    expect(screen.getByText('Forums')).toBeInTheDocument();
    expect(screen.getByText('News')).toBeInTheDocument();
    expect(screen.getByText('Reports')).toBeInTheDocument();
    expect(screen.getByText('Social')).toBeInTheDocument();
  });

  // ─── Test 18 ───
  it('Test 18: renderiza el título y la fuente de cada alerta correctamente', () => {
    render(
      <RealTimeAlertsMonitor
        data={{
          ...baseData,
          alerts: [
            {
              id: 1,
              source: 'Reddit',
              time: '2h ago',
              category: 'Producto',
              sentiment: 'negative',
              title: 'Unity pricing backlash grows',
              tags: ['pricing'],
              live: true,
            },
          ],
        }}
      />
    );

    expect(screen.getByText('Unity pricing backlash grows')).toBeInTheDocument();
    // El componente usa CSS `uppercase`, pero el DOM contiene el string original en minúsculas
    expect(screen.getByText('Reddit')).toBeInTheDocument();
    expect(screen.getByText('▼ neg')).toBeInTheDocument();
    expect(screen.getByText('Producto')).toBeInTheDocument();
  });

  // ─── Test 19 ───
  it('Test 19: formatAlertTime() muestra "Reciente" cuando la time es "sin fecha"', () => {
    render(
      <RealTimeAlertsMonitor
        data={{
          ...baseData,
          alerts: [
            {
              id: 2,
              source: 'Forum',
              time: 'sin fecha',
              category: 'General',
              sentiment: 'positive',
              title: 'Prueba de tiempo',
              tags: [],
            },
          ],
        }}
      />
    );

    expect(screen.getByText('· Reciente')).toBeInTheDocument();
  });

  // ─── Test 20 ───
  it('Test 20: muestra alerta positiva con indicador "▲ pos"', () => {
    render(
      <RealTimeAlertsMonitor
        data={{
          ...baseData,
          alerts: [
            {
              id: 3,
              source: 'News',
              time: '1h ago',
              category: 'Finanzas',
              sentiment: 'positive',
              title: 'Unity Q2 results exceed expectations',
              tags: ['earnings'],
            },
          ],
        }}
      />
    );

    expect(screen.getByText('▲ pos')).toBeInTheDocument();
  });

  // ─── Test 21 ───
  it('Test 21: el footer muestra el conteo correcto de alertas', () => {
    render(
      <RealTimeAlertsMonitor
        data={{
          ...baseData,
          alerts: [
            {
              id: 1,
              source: 'Reddit',
              time: '1h ago',
              category: 'Producto',
              sentiment: 'negative',
              title: 'Test alert 1',
              tags: [],
            },
            {
              id: 2,
              source: 'News',
              time: '2h ago',
              category: 'General',
              sentiment: 'positive',
              title: 'Test alert 2',
              tags: [],
            },
          ],
        }}
      />
    );

    expect(screen.getByText(/Últimas 2 señales de la BD/)).toBeInTheDocument();
  });

  // ─── Test 22 ───
  it('Test 22: renderiza el título del monitor en el header', () => {
    render(<RealTimeAlertsMonitor data={baseData} />);

    expect(screen.getByText('Monitor de Inteligencia Real-Time')).toBeInTheDocument();
    expect(screen.getByText(/Monitored sources/)).toBeInTheDocument();
  });

  // ─── Test 23 ───
  it('Test 23: renderiza los tags de cada alerta con prefijo #', () => {
    render(
      <RealTimeAlertsMonitor
        data={{
          ...baseData,
          alerts: [
            {
              id: 4,
              source: 'Reddit',
              time: '3h ago',
              category: 'Producto',
              sentiment: 'negative',
              title: 'Alerta con tags',
              tags: ['unity', 'pricing', 'gamedev'],
            },
          ],
        }}
      />
    );

    expect(screen.getByText('#unity')).toBeInTheDocument();
    expect(screen.getByText('#pricing')).toBeInTheDocument();
    expect(screen.getByText('#gamedev')).toBeInTheDocument();
  });
});
