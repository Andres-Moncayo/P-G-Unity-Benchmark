"""
Servicio de búsqueda web con Tavily (HTTP directo con httpx).

``SearchService`` encapsula la llamada POST a ``https://api.tavily.com/search``.
No usa el SDK de Tavily: solo requiere ``httpx`` y la clave
``TAVILY_API_KEY`` (expuesta vía ``app.core.config``).

El método ``search_competitive_news`` refuerza la consulta con términos específicos
para priorizar resultados en comunidades (Reddit, Discord, foros oficiales) sin
limitar exclusivamente a dominios base, permitiendo que Tavily encuentre subreddits
y canales relevantes (ej: reddit.com/r/unity, discord.com/servers, etc).
"""

from __future__ import annotations

from typing import Any, Final

import httpx

from core.config import settings

TAVILY_SEARCH_URL: Final[str] = "https://api.tavily.com/search"

# Sitios objetivo usados por las variantes de búsqueda competitiva.
MONITORED_SEARCH_DOMAINS: Final[tuple[str, ...]] = (
    "reddit.com",
    "forum.unity.com",
    "discussions.unity.com",
    "forums.unrealengine.com",
    "unrealengine.com",
    "forum.godotengine.org",
    "godotengine.org",
)


class SearchServiceError(Exception):
    """Error de red, HTTP o formato inesperado en la respuesta de Tavily."""


class SearchService:
    """
    Cliente async para Tavily Search.

    Se puede instanciar por request o como singleton; ``httpx.AsyncClient`` se
    crea por llamada para evitar fugas de conexiones si el ciclo de vida no se
    gestiona en otro sitio.
    """

    def __init__(self, *, api_key: str | None = None, timeout: float = 30.0) -> None:
        self._api_key = api_key if api_key is not None else settings.TAVILY_API_KEY
        self._timeout = timeout

    @staticmethod
    def get_monitored_search_domains() -> list[str]:
        """Lista de dominios monitoreados por el servicio de búsqueda."""
        return list(MONITORED_SEARCH_DOMAINS)

    @staticmethod
    def count_monitored_search_domains() -> int:
        """Cantidad de dominios monitoreados por el servicio de búsqueda."""
        return len(MONITORED_SEARCH_DOMAINS)

    def _competitive_query(self, query: str) -> str:
        """
        Construye una query reforzada que prioriza comunidades específicas.
        
        En lugar de filtrar exclusivamente por dominio (que limita subreddits),
        se añaden términos que sesgan hacia comunidades relevantes:
        - Reddit: subreddits /r/unity, /r/unrealengine, /r/godot
        - Discord: servidores y canales comunitarios
        - Foros oficiales: forums.unrealengine.com, forum.unity.com, godotengine.org
        - Noticias: desarrolladores discutiendo, comentarios, feedback
        """
        base = query.strip()
        community_terms = (
            "site:reddit.com/r/unity OR site:reddit.com/r/unrealengine OR site:reddit.com/r/godot "
            "OR site:discord.com OR site:forum.unity.com OR site:forums.unrealengine.com "
            "OR site:godotengine.org "
            "developer feedback discussion community forum"
        )
        return f"{base} ({community_terms})"

    def _competitive_query_variants(self, query: str) -> list[str]:
        """Genera varias consultas para capturar más cobertura por plataforma."""
        base = query.strip()
        lower = base.lower()

        variants: list[str] = []

        if "unity" in lower:
            variants.extend(
                [
                    f"site:reddit.com {base} tutorial help",
                    f"site:reddit.com/r/Unity3D {base} help",
                    f"site:reddit.com/r/unity {base} help",
                    f"site:forum.unity.com {base}",
                    f"site:discussions.unity.com {base}",
                ]
            )
        elif "unreal" in lower:
            variants.extend(
                [
                    f"site:reddit.com {base} tutorial help",
                    f"site:reddit.com/r/unrealengine {base} help",
                    f"site:reddit.com/r/gamedev {base} help",
                    f"site:forums.unrealengine.com {base}",
                    f"site:unrealengine.com/community {base}",
                ]
            )
        elif "godot" in lower:
            variants.extend(
                [
                    f"site:reddit.com {base} tutorial help",
                    f"site:reddit.com/r/godot {base} help",
                    f"site:reddit.com/r/godotengine {base} help",
                    f"site:forum.godotengine.org {base}",
                    f"site:godotengine.org/community {base}",
                ]
            )
        else:
            variants.extend(
                [
                    f"site:reddit.com {base} tutorial help",
                    f"site:reddit.com {base} community discussion",
                ]
            )

        # Mantener el orden pero evitar duplicados triviales.
        seen: set[str] = set()
        unique_variants: list[str] = []
        for variant in variants:
            normalized = variant.strip().lower()
            if normalized in seen:
                continue
            seen.add(normalized)
            unique_variants.append(variant)
        return unique_variants

    def _planned_search_queries(
        self,
        query: str,
        *,
        comparative_mode: bool = False,
        deep_analysis: bool = False,
    ) -> list[str]:
        """
        Ordena las consultas a Tavily según los modos activos para que el contexto
        que recibe el LLM sea coherente con Comparativo / Deep analysis.

        - **Comparativo**: varias líneas temáticas (panorama engines + una por hueco UE/Unity/Godot).
        - **Deep analysis**: reforzar profundidad (licencias, churn, multi-foro oficial).
        - Sin flags: comportamiento anterior vía `_competitive_query_variants`.
        """
        base = query.strip()
        if not base:
            return [query.strip()]

        ordered: list[str] = []

        if comparative_mode:
            ordered.extend(
                [
                    f'{base} game engine comparative analysis Unity vs Unreal Engine vs Godot developer community sentiment',
                    f'site:reddit.com/r/Unity3D OR site:reddit.com/r/unity {base} discussion feedback',
                    f'site:reddit.com/r/unrealengine {base} UE5 developer discussion',
                    f'site:reddit.com/r/godot OR site:reddit.com/r/godotengine {base} discussion',
                    f'site:reddit.com/r/gamedev {base} Unity Unreal Godot choose engine',
                ]
            )
            if deep_analysis:
                ordered.extend(
                    [
                        f'{base} game engine business model licensing pricing controversy Unity Unreal Godot news',
                        f'{base} migration switching game engine churn technical debt developer experience',
                        f'(site:forum.unity.com OR site:forums.unrealengine.org OR site:forum.godotengine.org) {base}',
                    ]
                )
        elif deep_analysis:
            ordered.append(
                f'{base} strategic competitive intelligence deep dive technical commercial ecosystem developer forums'
            )
            ordered.extend(self._competitive_query_variants(base))
        else:
            ordered.extend(self._competitive_query_variants(base))

        seen: set[str] = set()
        unique: list[str] = []
        for q in ordered:
            key = q.strip().lower()
            if key in seen:
                continue
            seen.add(key)
            unique.append(q.strip())
        return unique

    async def _search_single_query(
        self,
        query: str,
        max_results: int,
        days: int | None = None,
        search_depth: str = "advanced",
    ) -> list[dict[str, str]]:
        payload: dict[str, Any] = {
            "api_key": self._api_key,
            "query": query,
            "max_results": max(1, min(max_results, 20)),
            "search_depth": search_depth,
            "topic": "general",
        }
        if days is not None:
            payload["days"] = days

        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                response = await client.post(TAVILY_SEARCH_URL, json=payload)
                response.raise_for_status()
                data = response.json()
        except httpx.HTTPStatusError as exc:
            raise SearchServiceError(
                f"Tavily respondió HTTP {exc.response.status_code}: {exc.response.text[:200]}"
            ) from exc
        except httpx.RequestError as exc:
            raise SearchServiceError(f"Error de red al contactar Tavily: {exc}") from exc
        except ValueError as exc:
            raise SearchServiceError("La respuesta de Tavily no es JSON válido.") from exc

        results = data.get("results")
        if not isinstance(results, list):
            raise SearchServiceError("Formato inesperado: falta la clave 'results' o no es una lista.")

        filtered_results = []
        for item in results:
            if not isinstance(item, dict):
                continue
            url = item.get("url")
            title = item.get("title")
            snippet = item.get("content", "")
            if url and title:
                filtered_results.append({
                    "url": str(url),
                    "title": str(title),
                    "snippet": str(snippet),
                })

        return filtered_results

    async def search_competitive_news(
        self,
        query: str,
        max_results: int = 5,
        days: int | None = None,
        search_depth: str = "advanced",
        *,
        comparative_mode: bool = False,
        deep_analysis: bool = False,
    ) -> list[dict[str, str]]:
        """
        Busca noticias y páginas relevantes (incl. foros) sobre motores de videojuegos.

        Args:
            query: Tema o pregunta en lenguaje natural.
            max_results: Máximo de resultados (1–20 según Tavily; aquí se acota al rango pedido).
            comparative_mode: Plan de búsqueda multi-motor (Unity / Unreal / Godot) equilibrado.
            deep_analysis: Plan con más capas (negocio, churn, foros oficiales) y/o profundidad.

        Returns:
            Lista de dicts con claves ``url``, ``title``, ``snippet`` (fragmento
            del contenido resumido por Tavily en ``content``).

        Raises:
            SearchServiceError: Fallo HTTP, timeout o cuerpo JSON inesperado.
        """
        target_results = max(1, min(max_results, 20))
        variants = self._planned_search_queries(
            query,
            comparative_mode=comparative_mode,
            deep_analysis=deep_analysis,
        )

        merged: list[dict[str, str]] = []
        seen_urls: set[str] = set()
        num_variants = len(variants)
        if num_variants == 0:
            return merged

        for index, variant in enumerate(variants):
            remaining = target_results - len(merged)
            if remaining <= 0:
                break
            slots_left = num_variants - index
            # Reparte el cupo entre consultas para que Comparativo no se quede solo con la primera.
            variant_budget = max(2, min(8, max(remaining // slots_left, min(4, remaining))))

            try:
                results = await self._search_single_query(
                    variant, variant_budget, days=days, search_depth=search_depth
                )
            except SearchServiceError:
                continue

            for item in results:
                url = item["url"]
                if url in seen_urls:
                    continue
                seen_urls.add(url)
                merged.append(item)
                if len(merged) >= target_results:
                    return merged

        return merged