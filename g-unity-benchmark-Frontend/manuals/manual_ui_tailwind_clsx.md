# 🎨 Manual de UI Dinámica y Prácticas Responsive (Tailwind CSS)

En nuestra aplicación construimos interfaces sumamente dinámicas que reaccionan a condiciones de negocio (como el "Hover" del Sidebar o los menús cambiantes) y que fluyen perfectamente en distintas resoluciones. Para lograr esto sin escribir "código espagueti" o CSS ininteligible, seguimos ciertos patrones clave.

## 🛠️ Herramientas de Base

Usamos una triada invencible para el estilizado:
1. **Tailwind CSS:** Motor de clases de utilidad para diseñar directamente en el markup, manteniéndonos consistentes con el diseño de base (ej: `bg-[#0F0F0F]`).
2. **clsx:** Permite evaluar condicionalmente si aplicar una clase u otra dependiendo de un valor lógico.
3. **tailwind-merge:** Sobrescribe clases redundantes de Tailwind pacíficamente. Si mandamos `p-4` y más adelante dinámicamente aplicamos `p-8`, tailwind-merge elimina de la cadena final el `p-4` para que solo quede `p-8` (arreglando el histórico bug de priorización de CSS).

### 🧩 La Utilidad Maestra: `cn()`
Para mezclar la potencia de ambas librerías, implementamos la función utilitaria `cn` (que vive en `src/utils/cn.ts`):

```typescript
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

---

## 🪄 Manejo Dinámico de Estilos (Ejemplo Real)

Al evitar ternarios anidados gigantescos y variables horribles de CSS puro, utilizamos `cn` para orquestar la visualización:

```tsx
// Ejemplo del componente Sidebar que se expande o contrae
import { cn } from '../../utils/cn';

export default function NavItem({ isExpanded, isActive }) {
  return (
    <div
      className={cn(
        // 1. Clases base que siempre están
        "flex flex-row items-center rounded-xl p-3 transition-all duration-300",
        
        // 2. Colores condicionales según el estado activo del módulo
        isActive
          ? "bg-[#00ADEF]/20 text-[#00ADEF]"
          : "text-[#B0B0B0] hover:bg-[#1A1A1A] hover:text-white",

        // 3. Estilos de layout dinámicos dependiendo de si el panel completo se expandió
        isExpanded ? "w-full justify-start" : "w-[48px] justify-center"
      )}
    >
      <Icon />
      {/* Texto que solo se renderiza/muestra si el menú está abierto */}
      {isExpanded && <span className="ml-3 font-medium">Dashboard</span>}
    </div>
  )
}
```

Este código garantiza legibilidad y previsibilidad en cada pintado del DOM de React.

---

## 📱 Estrategia "Mobile-First" y Layout Responsive

Tailwind sigue la metodología *Mobile First*. Esto quiere decir que las clases sin ningún prefijo se aplicarán inicialmente desde los teléfonos más pequeños hacia arriba, y los prefijos actúan como **Puntos de Intersección (Breakpoints)** que sobrescriben el diseño cuando las pantallas crecen.

* `sm:` (Móviles horizontales o tablets muy pequeñas, 640px)
* `md:` (Tablets portátiles, ej. iPad, 768px)
* `lg:` (Laptops, 1024px)
* `xl:` (Monitores de escritorio, 1280px)

### Aplicación en Layouts (Grillas Inteligentes)
Usamos **CSS Grid** como nuestro principal pilar de diseño bidimensional, permitiendo que la interfaz respire y se acumule adecuadamente.

**Ejemplo de Grid del Dashboard:**
```tsx
<section className="grid gap-5 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
  <Card />
  <Card />
  <Card />
  <Card />
</section>
```
**¿Cómo se lee esto?**
1. Por defecto (teléfonos): `grid-cols-1` (Todo apilado en una sola columna vertical).
2. Cuando crezca a Tablet (`md`): Cámbiate y acomódate en 2 columnas (`md:grid-cols-2`).
3. Cuando llegue a Laptops pequeñas (`lg`): Pon 3 columnas (`lg:grid-cols-3`).
4. Escritorios grandes (`xl`): Entra perfectamente en 4 columnas en línea (`xl:grid-cols-4`).

Con el manejo de Grids Responsive logramos una adaptabilidad perfecta sin tener que escribir pesadas y redundantes `@media-queries` para cada pantalla nueva.
