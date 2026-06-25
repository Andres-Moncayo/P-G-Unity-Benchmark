export interface DashboardData {
  opportunityIndex: {
    score: number;
    trend: "up" | "down" | "stable";
    change: string;
    previousQuarter?: string;
    opportunities: Array<{
      area: string;
      priority: "high" | "medium" | "low";
      description: string;
    }>;
  };
  marketShare: {
    unity: number;
    unreal: number;
    godot: number;
    gamemaker: number;
    cryengine: number;
    o3de: number;
    history: Array<{
      month: string;
      unity: number;
      unreal: number;
      godot: number;
    }>;
  };
  revenuePerEmployee: {
    current: string;
    benchmark: string;
    delta: string;
    trend: "up" | "down" | "stable";
    previousQuarter?: string;
    competitors: Array<{ name: string; value: string; color: string }>;
    history: Array<{
      label: string;
      unityK: number;
      epicK: number;
      godotK: number;
    }>;
  };
  churnPredictor: {
    risk: string;
    probability: number;
    triggers: string[];
  };
  npsComparison: {
    unity: number;
    godot: number;
    industry: number;
    unreal: number;
  };
  adoptionIndex: {
    base: 100;
    unity: Array<{ month: string; value: number }>;
    unreal: Array<{ month: string; value: number }>;
    godot: Array<{ month: string; value: number }>;
  };
  developerSatisfaction: {
    dimensions: Array<{
      name: string;
      unity: number;
      unreal: number;
      godot: number;
    }>;
  };
  realTimeMonitoring: {
    feeds: number;
    forums: number;
    news: number;
    reports: number;
    social: number;
    alerts: Array<{
      id: number;
      source: string;
      time: string;
      category: string;
      sentiment: "positive" | "negative";
      title: string;
      tags: string[];
      live?: boolean;
    }>;
  };
  strategicAlerts: Array<{
    category: "posicionamiento" | "finanzas" | "producto";
    severity: "critical" | "high" | "medium";
    title: string;
    description: string;
  }>;
  executiveDashboard: {
    liveData: boolean;
    sources: number;
    lastUpdate: string;
    marketShare: number;
    change: string;
    criticalAlerts: number;
    pulseCompetitive: Array<{
      name: string;
      change: string;
      value: string;
      trend: "up" | "down";
    }>;
  };
  execSummary: {
    label: string;
    text: string;
    color: string;
  }[];

  // New dashboard feature data
  technicalFriction: {
    categories: Array<{
      id: number;
      name: string;
      severity: "critical" | "high" | "medium" | "low";
      activeIssues: number;
      affectedDevices: string;
      avgResolutionTime: string;
      issues: Array<{
        id: number;
        title: string;
        severity: "critical" | "high" | "medium" | "low";
        devices: number;
        trend: "escalating" | "improving" | "stable";
        firstSeen: string;
        description: string;
      }>;
    }>;
  };

  liveMonitoringFeed: {
    sources: Array<{
      id: string;
      name: string;
      count: number;
      sentiment: "positive" | "negative" | "neutral";
    }>;
    feeds: Array<{
      id: number;
      source: string;
      timestamp: string;
      sourceType: "forum" | "news" | "social" | "reports";
      sentiment: "positive" | "negative" | "neutral";
      category: string;
      title: string;
      summary: string;
      urgency: "high" | "normal" | "low";
      reach: string;
      engagement: "high" | "medium" | "low";
      tags: string[];
    }>;
  };

  analyticsInsights: Array<{
    id: number;
    title: string;
    description: string;
    severity: "critical" | "high" | "medium" | "low";
    category: string;
    impact: number;
    trend: "up" | "down" | "stable";
    confidence: number;
    recommendation: string;
    lastUpdated: string;
  }>;
}

export const mockDashboardData: DashboardData = {
  opportunityIndex: {
    score: 74,
    trend: "up",
    change: "+8 pts",
    opportunities: [
      {
        area: "Rendering Mobile",
        priority: "high",
        description: "DX12/URP optimization",
      },
      {
        area: "AI Integration",
        priority: "medium",
        description: "ML Tools pipeline",
      },
      {
        area: "Cloud Build",
        priority: "low",
        description: "CI/CD improvements",
      },
    ],
  },
  marketShare: {
    unity: 29.5,
    unreal: 38.2,
    godot: 13.8,
    gamemaker: 7.3,
    cryengine: 4.1,
    o3de: 3.9,
    history: [
      { month: "Q1 23", unity: 34.5, unreal: 36.1, godot: 10.8 },
      { month: "Q2 23", unity: 33.8, unreal: 36.8, godot: 11.2 },
      { month: "Q3 23", unity: 32.9, unreal: 37.2, godot: 12.1 },
      { month: "Q4 23", unity: 31.8, unreal: 37.5, godot: 13.2 },
      { month: "Q1 24", unity: 30.8, unreal: 37.8, godot: 13.5 },
      { month: "Q2 24", unity: 30.2, unreal: 38.0, godot: 13.6 },
      { month: "Q3 24", unity: 29.8, unreal: 38.1, godot: 13.7 },
      { month: "Q4 24", unity: 29.5, unreal: 38.2, godot: 13.8 },
    ],
  },
  revenuePerEmployee: {
    current: "$371K",
    benchmark: "$450K",
    delta: "-12.3%",
    trend: "down",
    competitors: [
      { name: "Epic/Unreal", value: "$892K", color: "#8B5CF6" },
      { name: "Godot Fdn", value: "$180K", color: "#10B981" },
      { name: "Unity", value: "$371K", color: "#06B6D4" },
    ],
    history: [
      { label: "Q1 24", unityK: 412, epicK: 820, godotK: 148 },
      { label: "Q2 24", unityK: 398, epicK: 835, godotK: 152 },
      { label: "Q3 24", unityK: 385, epicK: 858, godotK: 168 },
      { label: "Q4 24", unityK: 378, epicK: 872, godotK: 175 },
      { label: "Q1 25", unityK: 371, epicK: 892, godotK: 180 },
    ],
  },
  churnPredictor: {
    risk: "Medium",
    probability: 0.35,
    triggers: ["Pricing concerns", "Competitor feature parity"],
  },
  npsComparison: {
    unity: 31,
    godot: 89,
    industry: 45,
    unreal: 72,
  },
  adoptionIndex: {
    base: 100,
    unity: [
      { month: "Q1 23", value: 91 },
      { month: "Q2 23", value: 89 },
      { month: "Q3 23", value: 87 },
      { month: "Q4 23", value: 85 },
      { month: "Q1 24", value: 82 },
      { month: "Q2 24", value: 79 },
      { month: "Q3 24", value: 76 },
      { month: "Q4 24", value: 74 },
    ],
    unreal: [
      { month: "Q1 23", value: 74 },
      { month: "Q2 23", value: 75 },
      { month: "Q3 23", value: 76 },
      { month: "Q4 23", value: 77 },
      { month: "Q1 24", value: 78 },
      { month: "Q2 24", value: 79 },
      { month: "Q3 24", value: 80 },
      { month: "Q4 24", value: 81 },
    ],
    godot: [
      { month: "Q1 23", value: 68 },
      { month: "Q2 23", value: 72 },
      { month: "Q3 23", value: 78 },
      { month: "Q4 23", value: 85 },
      { month: "Q1 24", value: 88 },
      { month: "Q2 24", value: 91 },
      { month: "Q3 24", value: 94 },
      { month: "Q4 24", value: 96 },
    ],
  },
  developerSatisfaction: {
    dimensions: [
      { name: "Facilidad de Uso", unity: 72, unreal: 58, godot: 89 },
      { name: "Rendimiento", unity: 65, unreal: 91, godot: 74 },
      { name: "Documentación", unity: 78, unreal: 82, godot: 85 },
      { name: "Comunidad", unity: 85, unreal: 79, godot: 92 },
      { name: "Precio/Valor", unity: 42, unreal: 88, godot: 95 },
      { name: "Soporte Técnico", unity: 61, unreal: 74, godot: 77 },
    ],
  },
  realTimeMonitoring: {
    feeds: 47,
    forums: 1420,
    news: 234,
    reports: 47,
    social: 892,
    alerts: [
      {
        id: 83,
        source: "Reddit r/gamedev",
        time: "ahora mismo",
        category: "Producto",
        sentiment: "positive",
        title:
          "Unity anuncia Unity 6.1 con mejoras en rendering y reducción de build times",
        tags: ["Unity", "Update", "Producto"],
        live: true,
      },
      {
        id: 88,
        source: "GameDeveloper.com",
        time: "ahora mismo",
        category: "Finanzas",
        sentiment: "negative",
        title:
          "Epic Games reporta crecimiento de 23% en adopción de Unreal Engine 5 en estudios indie",
        tags: ["Unreal", "Indie", "Adopción"],
        live: true,
      },
      {
        id: 94,
        source: "GameDeveloper.com",
        time: "hace 12 min",
        category: "Posicionamiento",
        sentiment: "negative",
        title: "Godot superó el índice de Unity en Sep 2023 post-Runtime Fee",
        tags: ["Godot", "Migración", "Unity"],
      },
      {
        id: 99,
        source: "GDC Report 2024",
        time: "hace 1 h",
        category: "Posicionamiento",
        sentiment: "negative",
        title: "61% de devs consideran cambiar de motor en 2025",
        tags: ["GDC", "Tendencia", "Mercado"],
      },
    ],
  },
  strategicAlerts: [
    {
      category: "posicionamiento",
      severity: "critical",
      title: "Godot adoptó a 89K+ nuevos devs en Q4 2024",
      description: "Principal vector de fuga desde Unity indie",
    },
    {
      category: "finanzas",
      severity: "critical",
      title: "Epic Games redujo threshold de royalty a $500K",
      description: "Atacando directamente segmento mid-market de Unity Pro",
    },
    {
      category: "producto",
      severity: "high",
      title: "Unity NPS cayó de 49 a 31 puntos en 6 meses",
      description: "Riesgo de churn institucional elevado",
    },
  ],
  executiveDashboard: {
    liveData: true,
    sources: 47,
    lastUpdate: "14:03:03",
    marketShare: 29.5,
    change: "-5.7% MoM",
    criticalAlerts: 7,
    pulseCompetitive: [
      { name: "Unreal", change: "+2.1pp", value: "38.2%", trend: "up" },
      { name: "Unity", change: "-5.7pp", value: "29.5%", trend: "down" },
      { name: "Godot", change: "+4.9pp", value: "13.8%", trend: "up" },
      { name: "GameMaker", change: "+0.5pp", value: "7.3%", trend: "up" },
      { name: "CryEngine", change: "-0.8pp", value: "4.1%", trend: "down" },
      { name: "O3DE", change: "+1.1pp", value: "3.9%", trend: "up" },
    ],
  },
  execSummary: [
    {
      label: "Critical Risk",
      text: "Unity's market share declining 5.7pp in 12 months",
      color: "bg-[#FF4C4C]",
    },
    {
      label: "Opportunity",
      text: "Rendering Mobile: DX12/URP pod for optimization services",
      color: "bg-[#FF9800]",
    },
    {
      label: "Recommendation",
      text: "Deploy specialized team for Unity 6 mobile rendering",
      color: "bg-[#3DDC84]",
    },
  ],

  // Enhanced data for new dashboard features
  technicalFriction: {
    categories: [
      {
        id: 1,
        name: "Permisos runtime fee",
        severity: "critical",
        activeIssues: 142,
        affectedDevices: "45K+",
        avgResolutionTime: "72h",
        issues: [
          {
            id: 1,
            title: "Permiso denegado para Analytics SDK",
            severity: "critical",
            devices: 15234,
            trend: "escalating",
            firstSeen: "2024-12-28 14:23",
            description:
              "Usuarios reportan denegación de permisos para Analytics SDK en Android 14+",
          },
          {
            id: 2,
            title: "Runtime fee manifesto permissions",
            severity: "critical",
            devices: 8921,
            trend: "stable",
            firstSeen: "2024-12-20 09:15",
            description:
              "Error al solicitar permisos para runtime fee manifest en iOS 18.2+",
          },
        ],
      },
      {
        id: 2,
        name: "Engine Performance",
        severity: "high",
        activeIssues: 89,
        affectedDevices: "32K+",
        avgResolutionTime: "48h",
        issues: [
          {
            id: 3,
            title: "Renderizado URP en dispositivos móviles",
            severity: "high",
            devices: 8921,
            trend: "improving",
            firstSeen: "2024-12-18 16:45",
            description: "Degradación de rendimiento en rendering URP con DX12",
          },
        ],
      },
      {
        id: 3,
        name: "Cloud Build",
        severity: "medium",
        activeIssues: 34,
        affectedDevices: "12K+",
        avgResolutionTime: "24h",
        issues: [
          {
            id: 4,
            title: "Timeout en builds iOS > 2GB",
            severity: "medium",
            devices: 3421,
            trend: "stable",
            firstSeen: "2024-12-15 11:30",
            description:
              "Builds de iOS mayores a 2GB experimentan timeouts en Cloud Build",
          },
        ],
      },
    ],
  },

  liveMonitoringFeed: {
    sources: [
      {
        id: "forum",
        name: "Forums",
        count: 1420,
        sentiment: "neutral",
      },
      {
        id: "news",
        name: "News",
        count: 234,
        sentiment: "negative",
      },
      {
        id: "social",
        name: "Social",
        count: 892,
        sentiment: "negative",
      },
      {
        id: "reports",
        name: "Reports",
        count: 47,
        sentiment: "neutral",
      },
    ],
    feeds: [
      {
        id: 1,
        source: "Reddit r/gamedev",
        timestamp: "2025-01-03 14:23:00",
        sourceType: "forum",
        sentiment: "positive",
        category: "Product",
        title: "Unity 6.1 release mejora rendimiento mobile 300%",
        summary: "Update a DX12/URP reduce build times en dispositivos móviles",
        urgency: "normal",
        reach: "4.2K",
        engagement: "high",
        tags: ["unity", "dx12", "urp", "mobile"],
      },
      {
        id: 2,
        source: "GameDeveloper.com",
        timestamp: "2025-01-03 13:45:00",
        sourceType: "news",
        sentiment: "negative",
        category: "Competitive",
        title: "Unreal Engine 5.5 adoption increases 23% YoY",
        summary: "Epic Games reports una adopción récord en estudios indie",
        urgency: "high",
        reach: "12K",
        engagement: "high",
        tags: ["unreal", "indie", "adoption"],
      },
      {
        id: 3,
        source: "Twitter",
        timestamp: "2025-01-03 12:15:00",
        sourceType: "social",
        sentiment: "negative",
        category: "Reputation",
        title: "Community backlash on runtime fee enforcement",
        summary: "Developers expressing frustration with enforcement policies",
        urgency: "high",
        reach: "8.5K",
        engagement: "medium",
        tags: ["runtime-fee", "community", "policy"],
      },
    ],
  },

  analyticsInsights: [
    {
      id: 1,
      title: "Mobile Rendering Friction soaring",
      description:
        "DX12/URP integration issues Android 14+ causing 45% increase in support tickets",
      severity: "critical",
      category: "Product Quality",
      impact: 89,
      trend: "up",
      confidence: 94,
      recommendation:
        "Deploy dedicated porting team for DX12/URP mobile optimization",
      lastUpdated: "2025-01-03 14:23",
    },
    {
      id: 2,
      title: "Runtime fee churn accelerating",
      description:
        "61% of developers considering engine change in 2025, Unity primary target",
      severity: "critical",
      category: "Customer Retention",
      impact: 95,
      trend: "up",
      confidence: 89,
      recommendation:
        "Revise runtime fee structure and introduce developer-first pricing tiers",
      lastUpdated: "2025-01-03 13:45",
    },
    {
      id: 3,
      title: "Godot adoption trending",
      description:
        "Post-runtime fee adoption surges 55% YoY, particularly in indie/educational segments",
      severity: "high",
      category: "Market Position",
      impact: 78,
      trend: "up",
      confidence: 92,
      recommendation:
        "Develop Unity Lite competitive offering for indie/educational markets",
      lastUpdated: "2025-01-03 12:30",
    },
  ],
};
