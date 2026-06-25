# Logica de Busqueda y Procesamiento de IA

Este documento resume como funciona la capa de IA que busca informacion, la procesa con Gemini y la persiste en PostgreSQL.

## Flujo General

1. El endpoint de IA recibe una solicitud, por ejemplo `/api/v1/ia-posts/addpostUnity`.
2. `SearchService` construye varias consultas para ampliar cobertura.
3. Tavily se llama en paralelo con `search_depth="advanced"`.
4. Los resultados se convierten en contexto de texto para Gemini.
5. `LLMService` analiza cada fuente y devuelve una lista de `PostAnalysis`.
6. Cada analisis se guarda en PostgreSQL en `analyzed_posts`.
7. La ruta responde con el payload estructurado generado por Gemini.

## Que busca Tavily

La logica esta en [app/services/search.py](app/services/search.py).

### Principales fuentes y patrones

La busqueda prioriza estos sitios y comunidades:

- `reddit.com/r/unity`
- `reddit.com/r/unrealengine`
- `reddit.com/r/godot`
- `reddit.com/r/Unity3D`
- `reddit.com/r/godotengine`
- `reddit.com/r/gamedev`
- `discord.com`
- `forum.unity.com`
- `discussions.unity.com`
- `forums.unrealengine.com`
- `unrealengine.com/community`
- `forum.godotengine.org`
- `godotengine.org/community`
- `godotengine.org`

### Como construye las consultas

`_competitive_query_variants(query)` genera variantes por motor y por tema de negocio. Por ejemplo:

- pricing y licensing
- migration y adoption
- enterprise y studio adoption
- support y features
- performance y cost comparison

Ademas, `_search_single_query()` manda a Tavily un payload con:

- `search_depth="advanced"`
- `include_raw_content=True` cuando Tavily lo devuelve en la respuesta
- `max_results` limitado entre 1 y 20

### Por que se hace asi

Se busca maximizar cobertura sin perder tiempo de respuesta. En vez de una sola busqueda, se consultan varias variantes en paralelo con `asyncio.gather()`.

## Como se procesan los resultados

### 1. Normalizacion del contexto

Cada resultado se transforma en texto con:

- titulo
- URL
- snippet

Si Tavily devuelve `raw_content`, tambien se agrega para que Gemini tenga mas contexto.

### 2. Analisis con Gemini

La logica esta en [app/services/llm.py](app/services/llm.py).

`LLMService.analyze_posts_structured()`:

- recibe la query, el contexto y el historial
- arma un prompt de sistema con reglas estrictas
- obliga a devolver un JSON plano
- valida la respuesta con Pydantic

### 3. Estructura plana esperada

El analisis se serializa como `PostAnalysis`, con campos top-level para:

- fuente del post
- engagement
- sentimiento
- analisis tecnico
- riesgo de negocio
- inteligencia competitiva
- NPS
- contexto de mercado
- alertas

No se usan objetos anidados ni `JSONB`.

## Persistencia en base de datos

La logica esta en [app/modules/ia_posts/crud.py](app/modules/ia_posts/crud.py) y [app/modules/ia_posts/models.py](app/modules/ia_posts/models.py).

### Modelo de almacenamiento

La tabla `analyzed_posts` guarda una columna por cada campo relevante del contrato plano.

### Campos tipo lista

Se usan arrays nativos de PostgreSQL para:

- `technical_affected_platforms`
- `nps_key_factors`

### Identificadores

- `record_id` es la llave primaria interna
- `id` es el identificador logico que viene del analisis IA

## Rutas involucradas

La ruta principal que usa esta logica esta en [app/modules/ia_posts/router.py](app/modules/ia_posts/router.py).

Endpoints principales:

- `GET /api/v1/ia-posts/posts`
- `POST /api/v1/ia-posts/addpostUnity`
- `POST /api/v1/ia-posts/addpostUnrealEngine`
- `POST /api/v1/ia-posts/addpostGodot`

## Que hace cada endpoint de analisis

1. Crea una conversacion temporal en PostgreSQL.
2. Busca fuentes relevantes con Tavily.
3. Construye el contexto para Gemini.
4. Genera un `MessageResponse` con una lista de `PostAnalysis`.
5. Guarda cada post analizado en `analyzed_posts`.
6. Devuelve el resultado al cliente.

## Validacion realizada

Se probaron estas rutas en una instancia real de la API:

- `GET /health`
- `GET /api/v1/ia-posts/posts`
- `POST /api/v1/ia-posts/addpostUnity`
- `POST /api/v1/ia-posts/addpostUnrealEngine`
- `POST /api/v1/ia-posts/addpostGodot`

Resultado observado:

- las rutas de lectura respondieron correctamente
- los tres endpoints de analisis devolvieron payloads estructurados
- los resultados quedaron persistidos en PostgreSQL

## Resumen tecnico

La idea central del refactor es esta:

- Tavily aporta fuentes externas y contexto largo
- Gemini convierte esas fuentes en un JSON plano, analitico y consistente
- PostgreSQL guarda cada campo como columna directa
- FastAPI expone todo sin romper las rutas existentes

## Archivos clave

- [app/services/search.py](app/services/search.py)
- [app/services/llm.py](app/services/llm.py)
- [app/modules/ia_posts/schemas.py](app/modules/ia_posts/schemas.py)
- [app/modules/ia_posts/models.py](app/modules/ia_posts/models.py)
- [app/modules/ia_posts/crud.py](app/modules/ia_posts/crud.py)
- [app/modules/ia_posts/router.py](app/modules/ia_posts/router.py)
