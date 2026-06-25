# 🏗️ Manual de Arquitectura: "Feature-First" y Gestión de Estado Dual

Este documento sirve como referencia oficial para entender cómo organizamos los archivos, carpetas y estados dentro de la aplicación. Mantener esta consistencia es la clave para que la base de código pueda crecer en el tiempo manteniéndose predecible y fácil de debuguear (nivel Staff Engineer).

---

## 📂 Organización "Feature-First" (Basada en Funcionalidades)

En lugar de tener carpetas gigantes con todos los `components`, todos los `hooks` y todas las `rutas` mezcladas de todo el proyecto, **agrupamos el código según la funcionalidad a la que pertenece**.

Toda funcionalidad vive dentro de `src/features/[nombre-del-feature]/`.

### Estructura de un Feature ideal (Ej. `dashboard` o `companies`):
```text
src/features/dashboard/
├── components/          # Componentes visuales únicos de esta feature (Ej: DashboardContainer, AdminPanel)
├── hooks/               # Hooks de React Query o lógica de negocio específica (Ej: useDashboardData)
├── services/            # Funciones que llaman a la API (Ej: dashboardService.ts y mockData.ts)
├── types/               # Schemas de Zod e interfaces exclusivas de este feature (Ej: index.ts)
└── index.ts             # El "Barrel File" que expone hacia afuera SOLO lo necesario.
```

### 🛢️ El Patrón "Barrel Export" (`index.ts`)
Cada feature se comporta como una "Micro-librería" independiente. El resto de la aplicación (como `App.tsx`) NO debe escudriñar dentro de los componentes internos de un feature. 

Solo exportamos la puerta de entrada principal.
```typescript
// En src/features/dashboard/index.ts
export { default as Dashboard } from './components/Dashboard';

// Si App.tsx lo necesita, lo importa limpiamente así:
// import { Dashboard } from './features/dashboard';
```

---

## 🌍 Capa Compartida (Shared Layer)

Todo código que NO pertenece exclusivamente a una funcionalidad, vive en la raíz de `src/`:

- `src/components/ui/` 👉 Componentes Atómicos repetitivos: Botones, Inputs, Modales base, creados encima de Radix UI o Tailwind puro.
- `src/components/layout/` 👉 Estructura general: Sidebar, Header.
- `src/hooks/` 👉 Hooks globales útiles (ej. `useMediaQuery`, `useLocalStorage`).
- `src/utils/` 👉 Funciones matemáticas puras, formateadores de fecha, utilidades como `cn()`.

---

## ⚖️ Gestión de Estado "Dual"

Uno de los mayores errores modernos es poner todo dentro del mismo árbol de estado global (Redux, Context, Zustand). Nosotros dividimos estrictamente las responsabilidades:

### 1. Estado del Servidor (Server State) 👉 *TanStack Query (@tanstack/react-query)*
**Regla:** Si los datos provienen o van hacia la Base de Datos / Backend, NO se usan en variables globales. Van directo a React Query.
- Se encarga de hacer el fetching.
- Mantiene la memoria caché.
- Provee de forma declarativa los estados de carga visual (`isLoading`) y errores (`isError`).
- Retenta automáticamente si el Wifi parpadea.

### 2. Estado Visual Local y Global (Client UI State) 👉 *Zustand*
**Regla:** Solo guardamos en Zustand información de interfaz temporal que vive unicamente en el navegador del usuario.
- Modales abiertos/cerrados.
- El módulo de navegación activo (`useNavigationStore.ts` donde guardamos qué sección, ej `currentPage: 'dashboard'`).
- Preferencias de tema oscuro/claro (Dark Mode).
- Sesión del cliente en caché (ej. si el menú lateral está colapsado o expandido).

**✅ Ejemplo Práctico de Estado Global (Zustand)**
```typescript
import { create } from 'zustand';

interface NavigationState {
  currentPage: string;
  setPage: (page: string) => void;
}

export const useNavigationStore = create<NavigationState>((set) => ({
  currentPage: 'dashboard',
  setPage: (page) => set({ currentPage: page }),
}));
```

Al seguir este patrón dual impedimos que nuestra aplicación colapse por sincronizaciones fallidas entre lo que el usuario ve de UI y la data real del servidor.
