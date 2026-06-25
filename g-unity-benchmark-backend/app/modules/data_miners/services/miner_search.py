from __future__ import annotations

import asyncio
import logging
import math
from typing import Any, Final, Literal

import httpx

TAVILY_SEARCH_URL: Final[str] = "https://api.tavily.com/search"

logger = logging.getLogger(__name__)

class MinerSearchService:
    def __init__(self, api_key: str, timeout: float = 30.0) -> None:
        self._api_key = api_key
        self._timeout = timeout

    def _engine_terms(self, engine: str) -> str:
        engine_key = engine.lower().strip()
        if engine_key == "unity":
            return '"Unity" OR "Unity 6" OR "Unity3D"'
        if engine_key == "unreal":
            return '"Unreal Engine" OR "UE5" OR "Unreal"'
        return '"Godot" OR "Godot 4" OR "Godot Engine"'

    def _build_advanced_queries(self, platform: str, engine: str, category: str = "all") -> list[str]:
        engine_terms = self._engine_terms(engine)
        platform_key = platform.lower().strip()
        engine_key = engine.lower().strip()
        
        # Mapeo de subreddits específicos
        engine_subreddit = {
            "unity": "r/unity3d",
            "unreal": "r/unrealengine",
            "godot": "r/godot",
        }.get(engine_key, f"r/{engine_key}")

        queries = []

        if platform_key == "reddit":
            if category in ["business", "all"]:
                queries.append(
                    f'site:reddit.com/r/gamedev ({engine_terms}) (pricing OR licensing OR cost OR "business model" OR ecosystem)'
                )
                queries.append(
                    f'site:reddit.com/r/gamedev ({engine_terms}) ("market share" OR adoption OR "industry trend" OR funding)'
                )
            if category in ["technical", "all"]:
                queries.append(f'site:reddit.com/{engine_subreddit} ({engine_terms}) (bug OR "memory leak" OR "performance issue" OR crash)')
            if category in ["sentiment", "all"]:
                queries.append(
                    f'site:reddit.com/r/gamedev ({engine_terms}) (frustration OR "switch engine" OR migration OR "worth it")'
                )

        elif platform_key == "github":
            if category in ["technical", "all"]:
                queries.extend([
                    f'site:github.com ({engine_terms}) (issue OR bug OR "memory leak")',
                    f'site:github.com ({engine_terms}) ("performance regression" OR crash OR "build failed")'
                ])
            if category in ["business", "all"]:
                queries.append(
                    f'site:github.com ({engine_terms}) (migration OR upgrade OR deprecation OR breaking OR licensing)'
                )
                queries.append(
                    f'site:github.com ({engine_terms}) (adoption OR roadmap OR "business model" OR ecosystem)'
                )

        elif platform_key == "hackernews":
            queries.extend([
                f'site:news.ycombinator.com ({engine_terms}) ("enterprise adoption" OR funding OR "market share" OR "industry trend")',
                f'site:news.ycombinator.com ({engine_terms}) (pricing OR licensing OR business OR acquisition OR ecosystem)'
            ])
            
        elif platform_key == "stackoverflow":
            queries.extend([
                f'site:stackoverflow.com ({engine_terms}) (question OR answer) (build OR compile OR error)',
                f'site:stackoverflow.com ({engine_terms}) (performance OR memory OR crash)'
            ])

        # Fallback genérico si la plataforma no está mapeada o no hay queries
        if not queries:
            queries.append(f'({engine_terms}) (community OR discussion OR support OR migration)')

        return queries

    async def _search_single_query(
        self,
        client: httpx.AsyncClient,
        query: str,
        max_results: int,
        days: int | None = None,
    ) -> list[dict[str, str]]:
        if max_results < 1:
            return []
            
        payload: dict[str, Any] = {
            "api_key": self._api_key,
            "query": query,
            "max_results": min(max_results, 20),
            "search_depth": "advanced",
            "include_raw_content": True,
            "topic": "general",
        }
        if days is not None:
            payload["days"] = days

        try:
            response = await client.post(TAVILY_SEARCH_URL, json=payload)
            response.raise_for_status()
            data = response.json()
        except httpx.HTTPError as exc:
            logger.warning("Tavily HTTP error for query %r: %s", query, exc)
            return []
        except Exception as exc:
            logger.exception("Unexpected Tavily failure for query %r: %s", query, exc)
            return []

        results = data.get("results", [])
        filtered: list[dict[str, str]] = []
        for item in results:
            if not isinstance(item, dict):
                continue
            url, title = item.get("url"), item.get("title")
            if not url or not title:
                continue
                
            content = str(item.get("content", "")).strip()
            raw_content = str(item.get("raw_content", "")).strip()
            
            # Priorizar el contenido crudo completo si existe, sino usar el snippet
            snippet = raw_content if raw_content else content
            filtered.append({"url": str(url), "title": str(title), "snippet": snippet})
            
        return filtered

    async def search_platform(
        self,
        platform: str,
        engine: str,
        category: Literal["all", "technical", "business", "sentiment"] = "all",
        max_results: int = 5,
        days: int | None = None,
    ) -> list[dict[str, str]]:
        variants = self._build_advanced_queries(platform, engine, category)[:5]
        if not variants:
            return []

        # Dividimos los resultados requeridos entre las queries para no gastar de más
        results_per_query = math.ceil(max_results / len(variants))

        async with httpx.AsyncClient(timeout=self._timeout) as client:
            batches = await asyncio.gather(
                *[
                    self._search_single_query(client, variant, results_per_query, days=days)
                    for variant in variants
                ]
            )

        merged: list[dict[str, str]] = []
        seen: set[str] = set()
        
        for batch in batches:
            for item in batch:
                if len(merged) >= max_results:
                    return merged
                url = item.get("url")
                if url and url not in seen:
                    seen.add(url)
                    merged.append(item)
                    
        return merged


















#CODIGO BASE



# from __future__ import annotations

# import asyncio
# import logging
# from typing import Any, Final

# import httpx

# TAVILY_SEARCH_URL: Final[str] = "https://api.tavily.com/search"

# logger = logging.getLogger(__name__)


# class MinerSearchService:
#     def __init__(self, api_key: str, timeout: float = 30.0) -> None:
#         self._api_key = api_key
#         self._timeout = timeout

#     def _engine_terms(self, engine: str) -> str:
#         engine_key = engine.lower().strip()
#         if engine_key == "unity":
#             return '"Unity" OR "Unity 6" OR "Unity3D"'
#         if engine_key == "unreal":
#             return '"Unreal Engine" OR "UE5" OR "Unreal"'
#         return '"Godot" OR "Godot 4" OR "Godot Engine"'

#     def _build_advanced_queries(self, platform: str, engine: str) -> list[str]:
#         engine_terms = self._engine_terms(engine)
#         platform_key = platform.lower().strip()
#         engine_key = engine.lower().strip()
#         engine_subreddit = {
#             "unity": "r/unity3d",
#             "unreal": "r/unrealengine",
#             "godot": "r/godot",
#         }.get(engine_key, f"r/{engine_key}")

#         if platform_key == "reddit":
#             return [
#                 f'site:reddit.com/r/gamedev ({engine_terms}) (pricing OR migration OR frustration OR "rendering bug")',
#                 f'site:reddit.com/{engine_subreddit} ({engine_terms}) (pricing OR migration OR frustration OR bug)',
#                 f'site:reddit.com/r/unity3d ({engine_terms}) (bug OR "memory leak" OR "performance issue" OR migration)',
#                 f'site:reddit.com/r/unrealengine ({engine_terms}) (pricing OR licensing OR complaint OR "rendering bug")',
#                 f'site:reddit.com/r/godot ({engine_terms}) (migration OR performance OR frustration OR "rendering bug")',
#             ]

#         if platform_key == "github":
#             return [
#                 f'site:github.com ({engine_terms}) (issue OR bug OR "memory leak")',
#                 f'site:github.com ({engine_terms}) ("performance regression" OR crash OR "build failed")',
#                 f'site:github.com ({engine_terms}) (migration OR upgrade OR deprecation OR breaking)',
#                 f'site:github.com ({engine_terms}) ("rendering bug" OR "editor bug" OR "platform support")',
#             ]

#         if platform_key == "stackoverflow":
#             return [
#                 f'site:stackoverflow.com ({engine_terms}) (question OR answer) (build OR compile OR error)',
#                 f'site:stackoverflow.com ({engine_terms}) (migration OR upgrade OR compatibility)',
#                 f'site:stackoverflow.com ({engine_terms}) (shader OR rendering OR package OR dependency)',
#                 f'site:stackoverflow.com ({engine_terms}) (performance OR memory OR crash)',
#             ]

#         if platform_key == "hackernews":
#             return [
#                 f'site:news.ycombinator.com ({engine_terms}) ("enterprise adoption" OR funding OR "market share")',
#                 f'site:news.ycombinator.com ({engine_terms}) (pricing OR licensing OR business OR acquisition)',
#                 f'site:news.ycombinator.com ({engine_terms}) (migration OR lock-in OR strategy)',
#                 f'site:news.ycombinator.com ({engine_terms}) (indie OR startup OR enterprise)',
#             ]

#         if platform_key == "discord":
#             return [
#                 f'site:discord.com/invite ({engine_terms}) (help OR support OR migration OR bug)',
#                 f'site:discord.gg ({engine_terms}) (pricing OR frustration OR "build error")',
#                 f'site:discord.com ({engine_terms}) (community OR support OR release)',
#             ]

#         if platform_key == "youtube":
#             return [
#                 f'site:youtube.com ({engine_terms}) (review OR tutorial OR comparison)',
#                 f'site:youtube.com ({engine_terms}) (migration OR performance OR benchmark)',
#                 f'site:youtube.com ({engine_terms}) (pricing OR licensing OR workflow)',
#             ]

#         if platform_key == "forums":
#             return [
#                 f'site:forum.unity.com ({engine_terms}) (pricing OR migration OR bug OR support)',
#                 f'site:forums.unrealengine.com ({engine_terms}) (pricing OR migration OR bug OR support)',
#                 f'site:forum.godotengine.org ({engine_terms}) (pricing OR migration OR bug OR support)',
#                 f'({engine_terms}) (forum OR community OR support OR migration)',
#             ]

#         return [f'({engine_terms}) (community OR discussion OR support OR migration)']

#     async def _search_single_query(
#         self,
#         client: httpx.AsyncClient,
#         query: str,
#         max_results: int,
#         days: int | None = None,
#     ) -> list[dict[str, str]]:
#         payload: dict[str, Any] = {
#             "api_key": self._api_key,
#             "query": query,
#             "max_results": max(1, min(max_results, 20)),
#             "search_depth": "advanced",
#             "include_raw_content": True,
#             "topic": "general",
#         }
#         if days is not None:
#             payload["days"] = days

#         try:
#             response = await client.post(TAVILY_SEARCH_URL, json=payload)
#             response.raise_for_status()
#             data = response.json()
#         except httpx.HTTPStatusError as exc:
#             logger.warning("Tavily HTTP error for query %r: %s", query, exc)
#             return []
#         except httpx.RequestError as exc:
#             logger.warning("Tavily request error for query %r: %s", query, exc)
#             return []
#         except Exception as exc:
#             logger.exception("Unexpected Tavily failure for query %r: %s", query, exc)
#             return []

#         results = data.get("results", [])
#         filtered: list[dict[str, str]] = []
#         for item in results:
#             if not isinstance(item, dict):
#                 continue
#             url = item.get("url")
#             title = item.get("title")
#             if not url or not title:
#                 continue
#             content = str(item.get("content", ""))
#             raw_content = str(item.get("raw_content", ""))
#             snippet_parts = [part for part in (content.strip(), raw_content.strip()) if part]
#             snippet = "\n\nRAW CONTENT:\n".join(snippet_parts) if len(snippet_parts) > 1 else (snippet_parts[0] if snippet_parts else "")
#             filtered.append({"url": str(url), "title": str(title), "snippet": snippet})
#         return filtered

#     async def search_platform(
#         self,
#         platform: str,
#         engine: str,
#         max_results: int = 5,
#         days: int | None = None,
#     ) -> list[dict[str, str]]:
#         variants = self._build_advanced_queries(platform, engine)[:5]

#         async with httpx.AsyncClient(timeout=self._timeout) as client:
#             batches = await asyncio.gather(
#                 *[
#                     self._search_single_query(client, variant, max_results, days=days)
#                     for variant in variants
#                 ]
#             )

#         merged: list[dict[str, str]] = []
#         seen: set[str] = set()
#         for batch in batches:
#             for item in batch:
#                 url = item.get("url")
#                 if not url or url in seen:
#                     continue
#                 seen.add(url)
#                 merged.append(item)
#                 if len(merged) >= max_results:
#                     return merged
#         return merged
