# 🚀 Guía de Arquitectura: Data Fetching basado en Features (Nivel Senior/Staff)

Esta guía documenta el paso a paso que realizamos para migrar nuestra aplicación hacia una arquitectura robusta, escalable y segura, siguiendo estrictamente las reglas profesionales usando el módulo de `Dashboard` como ejemplo práctico. En esta versión **hemos incluido los códigos fuente íntegros** de cada archivo modificado para tu referencia.

## 🛠️ Tecnologías que estamos utilizando:
1. **React + TypeScript (Strict Mode):** Base sólida tipada.
2. **@tanstack/react-query (TanStack Query v5+):** Para manejar estados de servidor, cachés y estados visuales asíncronos (`isLoading`, `isError`).
3. **Zod:** Librería de validación para garantizar la estructura y los tipos de datos en la frontera entre nuestro cliente y el backend (evitando _crashes_ de UI).



---



## 🛑 Paso 1: Configurar el Proveedor Global (QueryClient)
Necesitamos instanciar un proveedor de TanStack Query para que todo el árbol de React pueda consumir la memoria caché que manejará nuestras promesas asíncronas.

- **Ruta del archivo:** `src/main.tsx`
- **¿Qué hicimos?:** Importamos `QueryClient` y `QueryClientProvider` para rodear nuestro `<App />`. Le ajustamos parámetros globales, como el límite de re-intentos (`retry: 1`).

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './styles/global.css';

// Instanciamos el cliente de consultas
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1, // Si falla, re-intenta 1 vez
      refetchOnWindowFocus: false, // No hacer fetch cada vez que cambias de pestaña
    },
  },
});

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render( // Configuración del proveedor de consultas
  <React.StrictMode>
    <QueryClientProvider client={queryClient}> 
      <App /> 
    </QueryClientProvider>
  </React.StrictMode>
);
```



---



## 🌐 Paso 2: Construir nuestro Cliente Base (Transporte de Backend)
Para respetar la regla de no repetición de código (DRY) no debemos usar `fetch` a pelo en todos lados, sino encapsularlo en una función `apiClient`.

- **Ruta del archivo:** `src/services/apiClient.ts`
- **¿Qué hicimos?:** Creamos una pieza reutilizable que automatiza la configuración base.

```typescript
// Motor o la herramienta de transporte de datos entre el frontend y el backend

const BASE_URL = 'https://api.tu-servidor.com/v1'; // Poner API Real

export async function apiClient<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    // Si el estatus es 4xx o 5xx, lanzamos el error para que TanStack Query lo atrape
    throw new Error(`Error en la petición: ${response.status} ${response.statusText}`);
  }

  return response.json();
}
```



---



## 🛡️ Paso 3: Tipados y Validación en Tiempo de Ejecución (Modelado con Zod)
Entrando ya al módulo de la feature (`Dashboard`), necesitamos dictaminar cómo es obligatoriamente el formato dictado por la base de datos y tiparlo dinámicamente.

- **Ruta del archivo:** `src/features/dashboard/types/index.ts`
- **¿Qué hicimos?:** Reemplazamos todos los `export interface` de TypeScript por validadores `z.object()`. Luego inferiremos automáticamente las interfaces de tipo TS usando la utilidad `z.infer`. Aquí tienes el código completo y final del archivo de tipos:

```typescript
import { z } from 'zod';

export const TopCardItemSchema = z.object({
  title: z.string(),
  value: z.string(),
  change: z.string(),
  subtitle: z.string(),
});
export type TopCardItem = z.infer<typeof TopCardItemSchema>;

export const UpdateItemDataSchema = z.object({
  source: z.string(),
  title: z.string(),
  tags: z.array(z.string()),
  time: z.string(),
});
export type UpdateItemData = z.infer<typeof UpdateItemDataSchema>;

export const StackItemSchema = z.object({
  label: z.string(),
  value: z.string(),
});
export type StackItem = z.infer<typeof StackItemSchema>;

export const CommunityItemSchema = z.object({
  label: z.string(),
  value: z.string(),
});
export type CommunityItem = z.infer<typeof CommunityItemSchema>;

export const SlaItemSchema = z.object({
  label: z.string(),
  value: z.string(),
});
export type SlaItem = z.infer<typeof SlaItemSchema>;

export const ExecSummaryItemSchema = z.object({
  label: z.string(),
  text: z.string(),
  color: z.string(),
});
export type ExecSummaryItem = z.infer<typeof ExecSummaryItemSchema>;

export const FeaturedContentItemSchema = z.object({
  label: z.string(),
  value: z.string(),
});
export type FeaturedContentItem = z.infer<typeof FeaturedContentItemSchema>;

export const RecentActivityItemSchema = z.object({
  label: z.string(),
  color: z.string(),
});
export type RecentActivityItem = z.infer<typeof RecentActivityItemSchema>;

export const DashboardResponseSchema = z.object({
  topCards: z.array(TopCardItemSchema),
  updateItems: z.array(UpdateItemDataSchema),
  stackItems: z.array(StackItemSchema),
  communityItems: z.array(CommunityItemSchema),
  slaItems: z.array(SlaItemSchema),
  execSummary: z.array(ExecSummaryItemSchema),
  featuredContent: z.array(FeaturedContentItemSchema),
  recentActivities: z.array(RecentActivityItemSchema),
});
export type DashboardResponse = z.infer<typeof DashboardResponseSchema>;
```



---



## 🎭 Paso 4: Extraer y Simular Datos Locales (Mocking)
Puesto que nuestro backend aún no está listo, separamos un inmenso objeto de tipo `DashboardResponse` al que nombramos `mockData.ts` para que se encuentre aislado.

- **Ruta del archivo:** `src/features/dashboard/services/mockData.ts`
- **¿Qué hicimos?:** Agregamos puramente la salida de datos quemados a una constante para mantener la limpieza en el gestor de estados visuales final.

```typescript
import { DashboardResponse } from '../types';

export const dashboardMockData: DashboardResponse = {
  topCards: [
    { title: 'Actividad del Mercado', value: '142', change: '+12.5%', subtitle: 'vs semana anterior' },
    { title: 'Menciones Técnicas', value: '89', change: '+8.3%', subtitle: 'vs semana anterior' },
    { title: 'Crecimiento Community', value: '2.4K', change: '+15.7%', subtitle: 'vs semana anterior' },
    { title: 'Tasa de Engagement', value: '94%', change: '-2.1%', subtitle: 'vs semana anterior' },
  ],
  updateItems: [
    {
      source: 'Website',
      title: 'Q1 2026 Industry Report: 92% of Fortune 500 companies now adopt TypeScript as primary language for enterprise applications.',
      tags: ['TypeScript', 'Enterprise'],
      time: '1h ago',
    },
    {
      source: 'Website',
      title: 'Major cloud providers announce unified GraphQL gateway support. Expected to reduce API integration time by 60% across platforms.',
      tags: ['GraphQL', 'Cloud'],
      time: '3h ago',
    },
    {
      source: 'LinkedIn',
      title: 'Industry benchmark update: Average SLA commitments now at 99.95% uptime with sub-50ms response times for tier-1 services.',
      tags: ['Performance', 'SLA'],
      time: '5h ago',
    },
    {
      source: 'Website',
      title: 'React 19 adoption reaches 45% among surveyed B2B platforms. Server Components leading the modernization wave.',
      tags: ['React'],
      time: '8h ago',
    },
    {
      source: 'Website',
      title: 'Security audit reveals 88% of competitive platforms now implement OAuth 2.0 with PKCE for enhanced authentication.',
      tags: ['Security', 'API'],
      time: '12h ago',
    },
    {
      source: 'LinkedIn',
      title: 'Market analysis: AI-powered analytics features now standard in 78% of competitive intelligence platforms.',
      tags: ['AI/ML', 'Analytics'],
      time: '1d ago',
    },
  ],
  stackItems: [
    { label: 'React', value: '85%' },
    { label: 'TypeScript', value: '92%' },
    { label: 'Node.js', value: '78%' },
    { label: 'GraphQL', value: '45%' },
  ],
  communityItems: [
    { label: 'Crecimiento Redes Sociales', value: '+15.7%' },
    { label: 'Engagement Desarrolladores', value: '+22.3%' },
    { label: 'Participación Eventos', value: '+18.5%' },
  ],
  slaItems: [
    { label: 'Uptime Promedio', value: '99.9%' },
    { label: 'Tiempo de Respuesta', value: '<2 horas' },
    { label: 'Tiempo de Carga', value: '-40%' },
    { label: 'Reducción Bundle', value: '-30%' },
  ],
  execSummary: [
    {
      label: 'Liderazgo Tecnológico',
      text: 'Los competidores están invirtiendo fuertemente en ecosistemas React y TypeScript, con una tasa de adopción del 92% entre los principales actores. La adopción de API GraphQL ha aumentado un 45% en el último trimestre.',
      color: 'bg-[#35b4ff]',
    },
    {
      label: 'Engagement Comunitario',
      text: 'La actividad en redes sociales muestra un crecimiento del 15.7% en el tamaño de la comunidad, con particular fortaleza en contenido enfocado en desarrolladores y webinars educativos.',
      color: 'bg-[#3ddb9b]',
    },
    {
      label: 'Enfoque en Performance',
      text: 'Los principales competidores están priorizando la optimización de rendimiento, con una mejora promedio del 40% en tiempos de carga e inversiones en infraestructura cloud-native.',
      color: 'bg-[#35b4ff]',
    },
    {
      label: 'Soporte & SLA',
      text: 'El estándar de la industria está moviéndose hacia cobertura 24/7 con garantías de uptime del 99.9%. Los clientes enterprise están recibiendo gestión de cuentas dedicada.',
      color: 'bg-[#3ddb9b]',
    },
  ],
  featuredContent: [
    { label: 'Tutoriales técnicos', value: '1.2K interacciones' },
    { label: 'Actualizaciones de producto', value: '980 interacciones' },
    { label: 'Casos de estudio', value: '745 interacciones' },
  ],
  recentActivities: [
    { label: '10 empresas actualizaron su stack tecnológico', color: 'bg-[#3DDC84]' },
    { label: '23 nuevas noticias en la comunidad', color: 'bg-[#00ADEF]' },
    { label: '5 eventos programados esta semana', color: 'bg-[#FFC107]' },
  ],
};
```



---



## 📞 Paso 5: La Lógica del Servicio e Intercepción (Service Layer)
Asegura la integración principal de la capa de API para traer los datos del flujo asíncrono y los validamos.

- **Ruta del archivo:** `src/features/dashboard/services/dashboardService.ts`
- **¿Qué hicimos?:** Diseñamos `getDashboardData`. Este invoca `apiClient`.  Si ocurre un fallo general o se cae por validación cruzada con Zod (`.parse()`), lanzaremos un atrapador `catch` inteligente que inyecta nuestro `mockData`.

```typescript
import { apiClient } from '../../../services/apiClient';
import { DashboardResponseSchema, DashboardResponse } from '../types';
import { dashboardMockData } from './mockData';

export const getDashboardData = async (): Promise<DashboardResponse> => {
  try {
    // 1. Intentamos obtener datos reales usando el cliente API.
    // Usamos unknown para obligar a Zod a validar la forma de los datos.
    const data = await apiClient<unknown>('/dashboard/metrics');
    
    // 2. Pasamos la respuesta por Zod para verificar integridad de tipos
    return DashboardResponseSchema.parse(data);
  } catch (error) {
    console.warn('⚠️ API no disponible o error al conectar. Se usarán datos de mock (Fallback). Detalle del error:', error);
    
    // Fallback: Simulamos un delay de red de 1 seg para que el Skeleton/Loading sea visible en UI y devolvemos los Mocks
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    const parsedMockData = DashboardResponseSchema.parse(dashboardMockData);
    return parsedMockData;
  }
};
```

---

## 🎣 Paso 6: Convertir el Hook estático en Asíncrono
Conectamos la librería Tanstack hacia la React Application Layer.

- **Ruta del archivo:** `src/features/dashboard/hooks/useDashboardData.ts`
- **¿Qué hicimos?:** Implementamos directamente `useQuery`. Esto delegó a Tanstack todo lo necesario y expuso los estados de red.

```typescript
import { useQuery } from '@tanstack/react-query';
import { getDashboardData } from '../services/dashboardService';

export function useDashboardData() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboardData,
  });
}
```



---



## 🎨 Paso 7: Blindar El Componente y Sus Pantallas Intermedias (Early Returns)
El último eslabón son las UI. En este código garantizamos que si todavía no existe un estado resuelto (`isSuccess`), este proteja todo el diseño de React para que las sentencias `.map` no rompan si `data` es inválido.

- **Ruta del archivo:** `src/features/dashboard/components/Dashboard.tsx`
- **¿Qué hicimos?:** Recepción de `isLoading, isError, data`. Aplicamos flujos de control `if()` que devuelven directamente representaciones visuales ("Pantallas de carga y de Errores") cuando ocurra sin afectar ni al **Header** ni al **Sidebar**. Finalmente destructuramos todos los arreglos para pintarlos de manera segura a lo largo del template.

```tsx
import { useDashboardData } from '../hooks/useDashboardData';

import Sidebar from '../../../components/layout/Sidebar';
import Header from '../../../components/layout/Header';
import { cn } from '../../../utils/cn';

import statArrow from '../../../assets/images/stats-arrow.png';
import whiteFlash from '../../../assets/images/white-flash.png';
import rayoIcon from '../../../assets/images/rayo.png';

export default function Dashboard() {
  const { data, isLoading, isError, error } = useDashboardData();

  if (isLoading) {
    return (
      <div className="min-h-screen dark:bg-black text-white">
        <Sidebar />
        <div className="ml-0 md:ml-[88px] flex min-h-screen flex-col">
          <Header />
          <main className="flex-1 flex items-center justify-center">
            <p className="text-[#888888] animate-pulse">Cargando métricas del dashboard...</p>
          </main>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen dark:bg-black text-white">
        <Sidebar />
        <div className="ml-0 md:ml-[88px] flex min-h-screen flex-col">
          <Header />
          <main className="flex-1 flex items-center justify-center">
            <div className="text-red-500 bg-red-500/10 border border-red-500/20 p-4 rounded-xl">
              <p className="font-semibold">Error al cargar el dashboard</p>
              <p className="text-sm opacity-80">{error?.message}</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const {
    topCards,
    updateItems,
    stackItems,
    communityItems,
    slaItems,
    execSummary,
    featuredContent,
    recentActivities,
  } = data;

  return (
    <div className="min-h-screen dark:bg-black text-white">
      <Sidebar />
      <div className="ml-0 md:ml-[88px] flex min-h-screen flex-col">
        <Header />
        <main className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-4 sm:px-6 md:px-8 py-4 md:py-6 overflow-x-hidden">
          <header className="flex flex-col gap-2">
            <h1 className="text-3xl md:text-4xl font-semibold text-white">Dashboard</h1>
            <p className="text-sm text-[#B0B0B0]">Visión general de inteligencia competitiva</p>
          </header>

          {/*Competitive intelligence overview*/} 

          <section className="grid gap-5 xl:grid-cols-4 lg:grid-cols-2">
            {topCards.map((card) => (
                <article
                  key={card.title}
                  className="rounded-[28px] border border-[#3A3A3A] bg-[#0F0F0F] p-6 shadow-lg shadow-gray-500/50"
                >
                <div className="mb-4 flex items-center justify-between gap-4 text-sm text-[#B0B0B0]">
                  <span>{card.title}</span>
                  <span
                    className={cn(
                      'font-semibold',
                      card.change.startsWith('-') ? 'text-[#FF4C4C]' : 'text-[#3DDC84]'
                    )}
                  >
                    {card.change}
                  </span>
                </div>
                <strong className="block text-3xl text-white">{card.value}</strong>
                <small className="text-sm text-[#888888]">{card.subtitle}</small>
              </article>
            ))}
          </section>

          {/*Official Updates First Row*/}

          <section className="grid gap-5">
            <div className="flex flex-col gap-2">
              <div>
                <h2 className="text-xl font-semibold text-white">Actualizaciones Oficiales</h2>
                <p className="text-sm text-[#B0B0B0]">Noticias y reportes oficiales de la industria</p>
              </div>
            </div>
            <div className="grid gap-5 xl:grid-cols-3 lg:grid-cols-2">
              {updateItems.map((item) => (
                <article key={item.title} className="rounded-[30px] border border-[#3A3A3A] bg-[#0F0F0F] p-6">
                  <div className="mb-5 flex items-center justify-between gap-4">
                    <span className="rounded-full bg-[#00ADEF]/20 px-3 py-1 text-xs font-medium text-[#00ADEF]">
                      {item.source}
                    </span>
                    <span className="text-xs text-[#888888]">{item.time}</span>
                  </div>
                  <p className="mb-4 text-sm leading-7 text-[#FFFFFF]">{item.title}</p>
                  <div className="flex flex-wrap gap-2">
                    {item.tags.map((tag) => (
                      <span key={tag} className="rounded-full bg-[#00ADEF]/15 px-3 py-1 text-xs text-[#00ADEF]">
                        {tag}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>

          {/*key indicators panel*/}

          <div className="flex flex-col gap-2">
              <div>
                <h2 className="text-xl font-semibold text-white">Indicadores Clave</h2>
                <p className="text-sm text-[#B0B0B0]">Monitorea los datos más relevantes en tiempo real.</p>
              </div>
            </div>
          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            <article className="rounded-[30px] border border-[#3A3A3A] bg-[#0F0F0F] p-6">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#B0B0B0]">Stack Tecnológico</p>
              <h3 className="mt-3 text-xl font-semibold text-white">Tendencias de adopción</h3>
              <div className="mt-6 space-y-4">
                {stackItems.map((item) => (
                  <div key={item.label} className="flex items-center justify-between text-sm text-[#B0B0B0]">
                    <span>{item.label}</span>
                    <span className="font-semibold text-[#00ADEF]">{item.value}</span>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-[30px] border border-[#3A3A3A] bg-[#0F0F0F] p-6">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#B0B0B0]">Métricas Community</p>
              <h3 className="mt-3 text-xl font-semibold text-white">Engagement</h3>
              <div className="mt-6 space-y-4">
                {communityItems.map((item) => (
                  <div key={item.label} className="flex items-center justify-between text-sm text-[#B0B0B0]">
                    <span>{item.label}</span>
                    <span className="font-semibold text-[#3DDC84]">{item.value}</span>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-[30px] border border-[#3A3A3A] bg-[#0F0F0F] p-6">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#B0B0B0]">Performance & SLA</p>
              <h3 className="mt-3 text-xl font-semibold text-white">Métricas clave</h3>
              <div className="mt-6 space-y-4">
                {slaItems.map((item) => (
                  <div key={item.label} className="flex items-center justify-between text-sm text-[#B0B0B0]">
                    <span>{item.label}</span>
                    <strong className="text-sm text-[#00ADEF]">{item.value}</strong>
                  </div>
                ))}
              </div>
            </article>
          </section>

          {/*AI Summary and Featured Content*/}

          <section className="rounded-[30px] border border-[#3A3A3A] bg-[#0F0F0F] p-7">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex h-11 w-11 flex-none items-center justify-center rounded-[18px] bg-[#00ADEF] shadow-md shadow-[#00ADEF]/20">
                <img src={whiteFlash} alt="AI Executive Summary" className="h-6 w-6 object-contain" />
              </div>
              <div className="min-w-0">
                <h2 className="text-2xl font-semibold text-white">AI Executive Summary</h2>
                <p className="text-sm text-[#B0B0B0]">Generado desde 142 puntos de datos</p>
              </div>
            </div>

            <ul className="mt-6 space-y-5">
              {execSummary.map((item) => (
                <li key={item.label} className="flex gap-4">
                  <span
                    className={cn("mt-1 inline-flex h-2.5 w-2.5 rounded-full", item.color)}
                  />
                  <p className="text-sm leading-7 text-[#FFFFFF]">
                    <span className="font-semibold text-white">{item.label}:</span>{' '}
                    <span className="text-[#B0B0B0]">{item.text}</span>
                  </p>
                </li>
              ))}
            </ul>
          </section>

          {/*Featured Content*/}
          
          <section className="grid gap-5 lg:grid-cols-[1.5fr_1fr] xl:grid-cols-[1.7fr_1fr]">
            <article className="rounded-[30px] border border-[#3A3A3A] bg-[#0F0F0F] p-6">
              <div className="flex items-center gap-4">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-[18px] shadow-md shadow-[#0a7dff]/20 bg-[#0a7dff]/16"
                >
                  <img src={statArrow} alt="Contenido Destacado" className="h-7 w-7 object-contain" />
                </div>
                <h3 className="text-xl font-semibold text-white">Contenido Destacado</h3>
              </div>
              <div className="mt-6 space-y-4 text-sm text-[#B0B0B0]">
                {featuredContent.map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <span>{item.label}</span>
                    <strong className="text-white">{item.value}</strong>
                  </div>
                ))}
              </div>
            </article>

            {/*Recent activities*/}

            <article className="rounded-[30px] border border-[#3A3A3A] bg-[#0F0F0F] p-6">
              <div className="flex items-center gap-4">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-[18px] shadow-md shadow-[#ffbf00]/20 bg-[#ffbf00]/15"
                >
                  <img src={rayoIcon} alt="Actividad Reciente" className="h-7 w-7 object-contain" />
                </div>
                <h3 className="text-xl font-semibold text-white">Actividad Reciente</h3>
              </div>
              <ul className="mt-6 space-y-4 text-sm text-[#FFFFFF]">
                {recentActivities.map((item) => (
                  <li key={item.label} className="flex items-center gap-3">
                    <span
                      className={cn("inline-flex h-2.5 w-2.5 rounded-full", item.color)}
                    />
                    <span>{item.label}</span>
                  </li>
                ))}
              </ul>
            </article>
          </section>
        </main>
      </div>
    </div>
  );
}
```

¡Excelente trabajo incorporando la Arquitectura Clean moderna en tu infraestructura! 🎉
