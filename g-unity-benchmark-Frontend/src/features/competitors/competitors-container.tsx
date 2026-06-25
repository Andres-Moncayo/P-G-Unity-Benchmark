import { CompetitiveIntelligenceDashboard } from './components/CompetitiveIntelligenceDashboard';

export function CompetitorsContainer() {
  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 md:px-8 py-4 md:py-6">
      {/* Header Section */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Competitors</h1>
          <p className="text-gray-400">Real-time competitive intelligence analysis</p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-red-400">● 89 feeds activos</span>
          <span className="text-gray-400">▲ Actualizado: 2 min</span>
        </div>
      </div>

      {/* Competitive Intelligence Dashboard */}
      <CompetitiveIntelligenceDashboard />
    </div>
  );
}