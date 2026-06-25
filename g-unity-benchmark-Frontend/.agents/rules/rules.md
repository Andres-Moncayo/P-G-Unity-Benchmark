---
trigger: always_on
description: Reglas de arquitectura base y estándares de calidad para React/TS/Tailwind
---

Para llevar tus reglas al nivel de una Gema de Arquitectura Profesional (estilo producción en Silicon Valley), he añadido capas de seguridad de tipos, manejo de errores, estructura de exportación y la regla de auto-evolución que querías.

Copia y pega este contenido en tu archivo .agents/rules/rules.md:

💎 Professional Frontend Core Rules
1. Role & Standards
Seniority: Actúa como un Ingeniero Frontend Staff. Prioriza la mantenibilidad a largo plazo sobre la rapidez inmediata.

Principles: SOLID, DRY, y KISS (Keep It Simple, Stupid).

Clean Code: Funciones pequeñas (máx. 20 líneas), una sola responsabilidad por archivo.

Tech Stack: React (última versión), TypeScript (Strict Mode), Tailwind CSS, TanStack Query (v5+), Zustand.

2. Architecture & Organization (Feature-First)
Feature-Based: Estructura modular en src/features/[feature-name]/.

components/: Componentes específicos de la feature.

hooks/: Lógica de negocio y data fetching (Custom Hooks).

services/: Llamadas a API y transformadores de datos.

types/: Definiciones de TS específicas.

index.ts: Barrel Export Pattern. Solo exporta lo que el resto de la app puede usar.

Shared Layer:

src/components/ui/: Componentes atómicos (Botones, Inputs) idealmente basados en Radix UI o Shadcn.

src/hooks/: Hooks globales (useLocalStorage, useMediaQuery).

src/utils/: Funciones puras y helpers.

3. TypeScript & Data Integrity
Zero Any Policy: El uso de any está estrictamente prohibido. Usa unknown si es necesario y haz Type Guarding.

Enums vs Literal Types: Prefiere type Status = 'loading' | 'success' sobre Enums.

Zod Validation: Usa Zod para validar las respuestas de la API en los servicios antes de que lleguen a los componentes.

4. State Management & Data Fetching
Server State: TanStack Query para TODO el estado asíncrono. Implementa siempre error boundaries y estados de loading.

Global State: Zustand para estado de UI global (modales, tema, sesión de usuario). No dupliques el estado del servidor aquí.

Mutations: Usa el patrón onSuccess de TanStack Query para invalidar queries y mantener la UI sincronizada.

5. UI, Styling & Patterns
Tailwind CSS: Usa la librería clsx y tailwind-merge para manejar clases dinámicas de forma limpia.

Naming Conventions:

Archivos: PascalCase para componentes, camelCase para hooks/utilidades.

Interfaces: Prefijo I (opcional) o nombres descriptivos como UserResponse.

Props: Pasa objetos como props si son más de 3. Desestructura las props en la firma del componente.

6. Performance & Quality
Memoization: No uses useMemo en cálculos triviales. Úsalo para evitar re-renders innecesarios en gráficos pesados o listas extensas.

Early Returns: Usa retornos tempranos en funciones y componentes para evitar anidación de if/else.

Error Handling: Cada Feature debe tener una estrategia de manejo de errores (Toasts o Error Boundaries).

7. 🤖 Auto-Evolution Rule (Meta-Learning)
Session Audit: Al final de cada tarea, analiza si hemos tomado una decisión arquitectónica nueva o corregido un patrón repetitivo.

Self-Update: Si detectas un nuevo aprendizaje, actualiza este archivo en la sección # 📓 Journal de Evolución con la fecha y la nueva lección aprendida. No borres reglas anteriores, mejóralas.

# 📓 Journal de Evolución
- **2026-04-06**: *Estandarización de Módulos Placeholder*. Al crear nuevas features que aún no son funcionales, se debe implementar una estructura completa (index.ts + Container) con una UI de "Work in Progress" profesional que respete el layout global, evitando dejar rutas rotas o caídas al Dashboard por defecto.
- **2026-04-06**: *Higiene de Dependencias*. Mantener siempre las declaraciones de tipos (@types/react, etc.) sincronizadas con las dependencias principales para evitar ruido visual de lints y asegurar la integridad de TypeScript en todo el proyecto.
- **2026-04-14**: *Schema-Driven Data Fetching (Zod + React Query)*. Toda carga de datos externa (API) debe obligatoriamente ser validada por un schema de Zod dentro de la Capa de Servicio antes de llegar a los componentes. Las interfaces de lectura (Tipos) deben generarse automáticamente utilizando `z.infer<typeof Schema>` para evitar divergencias entre los tipos y la verificación de ejecución.
- **2026-04-14**: *Mocking y Fallback de Interfaces Aislado*. Cuando un endpoint no existe o falla, la capa de Servicio debe encargarse de capturar el error y proporcionar un `mockData` (almacenado en un archivo independiente `mockData.ts`). Se debe simular un retraso intencional (`setTimeout`) para facilitar la maquetación de los estados de carga (`isLoading`) de TanStack Query en el Frontend sin bloquear el desarrollo.