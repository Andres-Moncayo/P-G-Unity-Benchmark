# Monitorization Schema & Changes

Fecha: 2026-05-14

Este documento resume los cambios realizados en el módulo de monitorización
durante la migración a la estructura anidada y la optimización de consultas SQL.

## Resumen ejecutivo

- Se eliminaron la lógica local de categorización automática y las funciones
  auxiliares que concatenaban y analizaban texto para deducir `business_category`.
- El back-end ahora lee `business_category` directamente de la columna de la tabla
  (nombre de columna: `business_category`).
- Se optimizaron las consultas SQL para traer solo las columnas necesarias y
  aplicar filtros y paginación en la base de datos en lugar de filtrar en memoria.

## Cambios principales (archivos y funciones)

- `app/modules/monitorization/crud.py`
  - Eliminadas funciones:
    - `_business_text()` — ya no se concatena/sanitiza texto para detección.
    - `_detect_business_category()` — ya no hay keyword-matching server-side.
  - Modificaciones importantes:
    - `list_monitorization_posts()`
      - SELECT reducido a: `id, title, summary, url, COALESCE(date_post, created_at) AS date, sentiment, bug, platform, alert_type, created_at, COALESCE(business_category, 'General') AS business_category`.
      - Filtros (`sentiment`, `platform`, `bug`) aplicados en `WHERE`.
      - `LIMIT :limit OFFSET :offset` aplicado en SQL.
    - `get_monitorization_post_by_id()`
      - SELECT reducido con `COALESCE(business_category, 'General')`.
    - `list_posts_by_sentiment()`
      - SELECT reducido y WHERE `sentiment = :sentiment`, con `LIMIT` en SQL.
    - `list_business_category_posts()`
      - Ahora agrupa leyendo `business_category` desde el row dict en lugar de calcularla.
    - Conteos y métricas:
      - `get_monitored_bugs()` ahora usa `COUNT(id)` en SQL para evitar traer rows.
      - `count_monitored_posts()` usa `COUNT(DISTINCT LOWER(TRIM(platform)))` en SQL/ORM.
      - `count_non_official_monitored_posts()` usa agregados y selecciona solo metadata cuando es necesario.

## Razonamiento y beneficios

- Menor transferencia de datos: las consultas devuelven ~10 columnas en vez de filas completas
  con 15+ columnas y JSONs innecesarios.
- Filtrado y paginación procesados por PostgreSQL, lo que reduce CPU y memoria
  en la capa de aplicación.
- Backward compatible: la función `_serialize_monitorization_post()` conserva
  las keys que consume el frontend; si `business_category` no existe en la DB,
  se utiliza el fallback `'General'`.

## Instrucciones para el equipo LLM / scraper

La IA que extrae datos debe ahora calcular `business_category` y persistirlo
en la columna `business_category` de `analyzed_posts` o enviarlo en el payload
de los posts hacia el backend. Formato esperado:

```json
{
  "business_category": "Producto"  // uno de: Producto, Finanzas, Posicionamiento, Ecosistema, General
}
```

Reglas sugeridas (orden de prioridad):
1. Buscar keywords financieras → `Finanzas`.
2. Buscar keywords de posicionamiento/competencia → `Posicionamiento`.
3. Buscar keywords de ecosistema/comunidad → `Ecosistema`.
4. Buscar keywords de producto/bugs/releases → `Producto`.
5. Si no hay matches → `General`.

## Archivos verificados

- `app/modules/monitorization/crud.py` — cambios de selección y eliminación de detección
- `app/modules/monitorization/router.py` — utiliza las funciones optimizadas y la transformación existente
- Frontend revisado para consumo de `business_category` (no requirió cambios)

## Próximos pasos recomendados

1. Crear una migración Alembic para añadir/asegurar la columna `business_category` como enum `categoria_negocio` (con índice si se usará en WHERE).
2. Ejecutar pruebas de integración: levantar backend + frontend y verificar que `LiveMonitoringFeed` y demás componentes muestran `business_category` correctamente.
3. Añadir índice sobre `business_category` si se va a filtrar frecuentemente por categoría.
4. Una vez validado, remover columnas planas antiguas si aplica.

---

Si quieres, añado aquí un snippet SQL para la migración Alembic que crea la columna y añade índice GIN o B-Tree según convenga.

## Actualizacion 2026-05-14 (schema refresh)

Con la nueva version de `schema.sql` (tabla `analyzed_posts` con enums y sin `created_at` obligatorio), se realizaron ajustes adicionales para evitar errores de columnas inexistentes y mantener consultas minimas.

### Cambios aplicados

- `app/modules/monitorization/crud.py`
  - Se agrego `_analyzed_posts_select_parts(cols)` para construir SELECT dinamico minimo segun columnas reales disponibles.
  - Se elimino dependencia rigida de `created_at` en fallback SQL.
    - `date` ahora se calcula con fallback seguro segun columnas existentes.
  - Filtros SQL del fallback se adaptan al esquema actual:
    - sentimiento: `sentiment_label` (o `sentiment`/`sentimental` si existen)
    - plataforma: `source_platform` (o `platform` legacy)
    - bug: `bug_category` (o `bug` legacy)
  - Se mantuvo la idea de SELECT minimo: solo columnas necesarias para construir `MonitorizationPostDetailResponse` y lo consumido por frontend.
  - Se restauro `list_business_category_posts(...)` para soportar endpoint de categorias agrupadas.

- `app/modules/monitorization/router.py`
  - Se restauro endpoint `GET /monitorization/posts/categories` para evitar colision con `GET /monitorization/posts/{post_id}`.
  - El endpoint usa `crud_list_business_category_posts(...)` y retorna `MonitorizationBusinessCategoryDetailResponse`.

### Resultado de pruebas de endpoints (smoke test)

Se ejecutaron pruebas con `TestClient` sobre endpoints de monitorization y todos retornaron `200`:

- `GET /api/v1/monitorization/posts` -> `200`
- `GET /api/v1/monitorization/posts/categories` -> `200`
- `GET /api/v1/monitorization/posts/sentiment/negative` -> `200`
- `GET /api/v1/monitorization/posts/1` -> `200`
- `GET /api/v1/monitorization/monitored_forums` -> `200`
- `GET /api/v1/monitorization/monitored_bugs` -> `200`
- `GET /api/v1/monitorization/count_posts` -> `200`
- `GET /api/v1/monitorization/non_official_posts_count` -> `200`

Esto confirma compatibilidad funcional con la estructura actualizada de la tabla y mantiene la estrategia de consultas acotadas.
