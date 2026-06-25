import { apiClient } from "../../../services/apiClient";
import { DashboardData } from "../hooks/useMockChat";
import {
  RealTimeMonitorResponseSchema,
  NpsChurnResponseSchema,
} from "../../../services/schemas";

export const getDashboardData = async (): Promise<DashboardData> => {
  // Construimos estructura de datos vacía inicial (sin mock data fallbacks)
  const dashboardData: DashboardData = {
    opportunityIndex: {
      score: 0,
      trend: "stable",
      change: "0%",
      opportunities: [],
    },
    marketShare: {
      unity: 0,
      unreal: 0,
      godot: 0,
      gamemaker: 0,
      cryengine: 0,
      o3de: 0,
      history: [],
    },
    revenuePerEmployee: {
      current: "$0K",
      benchmark: "$0K",
      delta: "0%",
      trend: "stable",
      competitors: [],
      history: [],
    },
    churnPredictor: {
      risk: "low",
      probability: 0,
      triggers: [],
    },
    npsComparison: {
      unity: 0,
      godot: 0,
      unreal: 0,
      industry: 0,
    },
    adoptionIndex: {
      base: 100,
      unity: [],
      unreal: [],
      godot: [],
    },
    developerSatisfaction: {
      dimensions: [],
    },
    realTimeMonitoring: {
      feeds: 0,
      forums: 0,
      news: 0,
      reports: 0,
      social: 0,
      alerts: [],
    },
    strategicAlerts: [],
    executiveDashboard: {
      liveData: false,
      sources: 0,
      lastUpdate: "",
      marketShare: 0,
      change: "",
      criticalAlerts: 0,
      pulseCompetitive: [],
    },
    execSummary: [],
    technicalFriction: {
      categories: [],
    },
    liveMonitoringFeed: {
      sources: [],
      feeds: [],
    },
    analyticsInsights: [],
  };

  // Realizamos peticiones en paralelo a los endpoints reales del backend.
  // Al usar Promise.all, si alguna falla (caída del backend o de PostgreSQL),
  // se arrojará el error inmediatamente, lo cual es capturado por React Query.
  const [
    kpisValue,
    realtimeValue,
    npsChurnValue,
    satUnityVal,
    satUnrealVal,
    satGodotVal,
  ] = await Promise.all([
    apiClient<any>("/dashboard/kpis"),
    apiClient<unknown>("/dashboard/realtime-monitor?limit=8"),
    apiClient<unknown>("/dashboard/nps-churn"),
    apiClient<any>("/dashboard/developer-satisfaction?engine=unity"),
    apiClient<any>("/dashboard/developer-satisfaction?engine=unreal"),
    apiClient<any>("/dashboard/developer-satisfaction?engine=godot"),
  ]);

  // Mezclamos los KPIs reales si la petición fue exitosa
  if (kpisValue) {
    const {
      meta,
      opportunity_index,
      market_share_shift,
      revenue_per_employee,
    } = kpisValue;
    const previousQuarterLabel = meta?.previous_quarter ?? "";

    if (opportunity_index && opportunity_index.value !== undefined) {
      dashboardData.opportunityIndex = {
        ...dashboardData.opportunityIndex,
        score: Math.round(opportunity_index.value),
        change: `${opportunity_index.quarter_over_quarter_pct >= 0 ? "+" : ""}${opportunity_index.quarter_over_quarter_pct}%`,
        trend: opportunity_index.quarter_over_quarter_pct >= 0 ? "up" : "down",
        previousQuarter: previousQuarterLabel,
      };

      if (opportunity_index.history && opportunity_index.history.length > 0) {
        dashboardData.adoptionIndex = {
          ...dashboardData.adoptionIndex,
          unity: opportunity_index.history.map((h: any) => ({
            month: h.month,
            value: h.unity,
          })),
          unreal: opportunity_index.history.map((h: any) => ({
            month: h.month,
            value: h.unreal,
          })),
          godot: opportunity_index.history.map((h: any) => ({
            month: h.month,
            value: h.godot,
          })),
        };
      }
    }

    if (market_share_shift && market_share_shift.share_of_voice) {
      dashboardData.marketShare = {
        ...dashboardData.marketShare,
        unity:
          Math.round(
            market_share_shift.share_of_voice.unity_share * 100 * 10,
          ) / 10,
        unreal:
          Math.round(
            market_share_shift.share_of_voice.competitor_share * 100 * 10,
          ) / 10,
        godot: 0,
        gamemaker: 0,
        cryengine: 0,
        o3de: 0,
        history: market_share_shift.history || [],
      };
    }

    if (revenue_per_employee && revenue_per_employee.value !== undefined) {
      dashboardData.revenuePerEmployee = {
        ...dashboardData.revenuePerEmployee,
        current: `$${Math.round(revenue_per_employee.value)}K`,
        delta: `${revenue_per_employee.quarter_over_quarter_pct >= 0 ? "+" : ""}${revenue_per_employee.quarter_over_quarter_pct}%`,
        trend:
          revenue_per_employee.quarter_over_quarter_pct >= 0 ? "up" : "down",
        previousQuarter: previousQuarterLabel,
        competitors: revenue_per_employee.competitors || [],
        history: revenue_per_employee.history || [],
      };
    }
  }

  // Mezclamos RealTime Monitor si la petición fue exitosa
  if (realtimeValue) {
    const parsed = RealTimeMonitorResponseSchema.safeParse(realtimeValue);
    if (parsed.success) {
      const data = parsed.data;
      dashboardData.realTimeMonitoring = {
        ...dashboardData.realTimeMonitoring,
        // Usamos ?? para que el 0 real del backend no caiga a valores por defecto
        feeds: data.feeds ?? 0,
        forums: data.forums ?? 0,
        news: data.news ?? 0,
        reports: data.reports ?? 0,
        social: data.social ?? 0,
        alerts: (data.alerts as any) || [],
        ...(data.total_posts != null ? { total_posts: data.total_posts } : {}),
        ...(data.alerts_total != null ? { alerts_total: data.alerts_total } : {}),
      } as DashboardData["realTimeMonitoring"] & {
        total_posts?: number;
        alerts_total?: number;
      };
    } else {
      console.warn(
        "Zod validation failed for RealTime Monitor:",
        parsed.error,
      );
    }
  }

  // Mapeamos NPS + Churn Predictor
  if (npsChurnValue) {
    const parsed = NpsChurnResponseSchema.safeParse(npsChurnValue);
    if (parsed.success) {
      const { nps, churn } = parsed.data;
      dashboardData.npsComparison = {
        unity: nps.unity ?? 0,
        godot: nps.godot ?? 0,
        unreal: nps.unreal ?? 0,
        industry: nps.industry ?? 0,
      };
      if (churn) {
        dashboardData.churnPredictor = {
          ...dashboardData.churnPredictor,
          risk: churn.risk,
          probability: churn.probability,
        };
      }
    } else {
      console.warn("Zod validation failed for NPS Churn:", parsed.error);
    }
  }

  // Mapeamos Developer Satisfaction
  const axisMapping = {
    technical_support: "Technical Support",
    ease_of_use: "Ease of Use",
    performance: "Performance",
    documentation: "Documentation",
    community: "Community",
    price_value: "Price / Value",
  };

  if (satUnityVal && satUnityVal.scores) {
    dashboardData.developerSatisfaction.dimensions = Object.keys(
      axisMapping,
    ).map((key) => {
      return {
        name: axisMapping[key as keyof typeof axisMapping],
        unity: satUnityVal.scores[key] || 0,
        unreal: satUnrealVal?.scores?.[key] || 0,
        godot: satGodotVal?.scores?.[key] || 0,
      };
    });
  }

  return dashboardData;
};
