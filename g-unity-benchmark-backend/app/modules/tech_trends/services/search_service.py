# from __future__ import annotations

# import asyncio
# import logging
# import math
# from typing import Any, Final

# import httpx

# TAVILY_SEARCH_URL: Final[str] = "https://api.tavily.com/search"

# logger = logging.getLogger(__name__)


# class TechTrendsSearchService:
#     def __init__(self, api_key: str, timeout: float = 30.0) -> None:
#         self._api_key = api_key
#         self._timeout = timeout

#     def _unity_queries(self) -> list[str]:
#         return [
#             '"Unity" robotics simulation trends 2024',
#             '"Unity" AI simulation workflow trends',
#         ]

#     def _broad_queries(self) -> list[str]:
#         return [
#             'robotics simulation trends 2024 game engine',
#             'industrial digital twins AI simulation platform',
#         ]

#     def _build_payload(self, query: str, max_results: int, days: int | None = None) -> dict[str, Any]:
#         payload: dict[str, Any] = {
#             "api_key": self._api_key,
#             "query": query,
#             "max_results": min(max_results, 20),
#             "search_depth": "advanced",
#             "include_raw_content": True,
#             "topic": "general",
#         }
#         if days is not None:
#             payload["days"] = days
#         return payload

#     def _normalize_item(self, item: dict[str, Any]) -> dict[str, str]:
#         url = str(item.get("url", "")).strip()
#         title = str(item.get("title", "")).strip()
#         content = str(item.get("raw_content") or item.get("content") or "").strip()
#         published_date = str(item.get("published_date") or item.get("date") or "").strip()
#         return {
#             "url": url,
#             "title": title,
#             "snippet": content,
#             "date": published_date,
#         }

#     def _is_unity_result(self, item: dict[str, str]) -> bool:
#         haystack = " ".join([item.get("title", ""), item.get("snippet", ""), item.get("url", "")]).lower()
#         return "unity" in haystack

#     async def _search_single_query(
#         self,
#         client: httpx.AsyncClient,
#         query: str,
#         max_results: int,
#         days: int | None = None,
#     ) -> list[dict[str, str]]:
#         if max_results < 1:
#             return []

#         try:
#             response = await client.post(TAVILY_SEARCH_URL, json=self._build_payload(query, max_results, days=days))
#             response.raise_for_status()
#             data = response.json()
#         except httpx.HTTPError as exc:
#             logger.warning("Tavily HTTP error for query %r: %s", query, exc)
#             return []
#         except Exception as exc:
#             logger.exception("Unexpected Tavily failure for query %r: %s", query, exc)
#             return []

#         results = data.get("results", [])
#         normalized: list[dict[str, str]] = []
#         for item in results:
#             if not isinstance(item, dict):
#                 continue
#             normalized_item = self._normalize_item(item)
#             if not normalized_item["url"] or not normalized_item["title"]:
#                 continue
#             normalized.append(normalized_item)

#         return normalized

#     async def search_trends(self, max_results: int = 12, days: int | None = 365) -> list[dict[str, str]]:
#         if max_results < 1:
#             return []

#         unity_target = max(1, math.ceil(max_results * 0.7))
#         broad_target = max(0, max_results - unity_target)

#         unity_queries = self._unity_queries()
#         broad_queries = self._broad_queries()

#         unity_quota = max(1, math.ceil(unity_target / len(unity_queries)))
#         broad_quota = max(1, broad_target) if broad_target else 0

#         async with httpx.AsyncClient(timeout=self._timeout) as client:
#             unity_batches = await asyncio.gather(
#                 *[self._search_single_query(client, query, unity_quota, days=days) for query in unity_queries]
#             )
#             broad_batches = (
#                 await asyncio.gather(
#                     *[self._search_single_query(client, query, broad_quota, days=days) for query in broad_queries[:1]]
#                 )
#                 if broad_target
#                 else []
#             )

#         unity_results: list[dict[str, str]] = []
#         broad_results: list[dict[str, str]] = []
#         seen: set[str] = set()

#         for batch in unity_batches:
#             for item in batch:
#                 url = item.get("url", "")
#                 if not url or url in seen:
#                     continue
#                 seen.add(url)
#                 if self._is_unity_result(item):
#                     unity_results.append(item)
#                 else:
#                     broad_results.append(item)

#         for batch in broad_batches:
#             for item in batch:
#                 url = item.get("url", "")
#                 if not url or url in seen:
#                     continue
#                 seen.add(url)
#                 if self._is_unity_result(item):
#                     unity_results.append(item)
#                 else:
#                     broad_results.append(item)

#         merged: list[dict[str, str]] = []
#         merged.extend(unity_results[:unity_target])
#         remaining = max_results - len(merged)
#         if remaining > 0:
#             merged.extend(broad_results[:remaining])

#         if len(merged) < max_results:
#             overflow = unity_results[unity_target:] + broad_results[remaining:]
#             for item in overflow:
#                 if len(merged) >= max_results:
#                     break
#                 merged.append(item)

#         return merged[:max_results]


from __future__ import annotations

import asyncio
import logging
import math
from datetime import datetime
from typing import Any, Final

import httpx

TAVILY_SEARCH_URL: Final[str] = "https://api.tavily.com/search"

logger = logging.getLogger(__name__)


class TechTrendsSearchService:
    def __init__(self, api_key: str, timeout: float = 30.0) -> None:
        self._api_key = api_key
        self._timeout = timeout

    def _get_current_year(self) -> int:
        """Devuelve dinámicamente el año actual para no quedar atrapado en el pasado."""
        return datetime.now().year

    def _unity_queries(self) -> list[str]:
        year = self._get_current_year()
        return [
            f'"Unity" robotics simulation trends {year}',
            f'"Unity" AI simulation workflow trends {year}',
            f'"Unity" industrial digital twin development {year}',
        ]

    def _broad_queries(self) -> list[str]:
        year = self._get_current_year()
        return [
            f'robotics simulation trends {year} game engine',
            f'industrial digital twins AI simulation platform {year}',
            f'cutting edge tech trends simulation framework {year}',
        ]

    def _build_payload(self, query: str, max_results: int, days: int | None = None) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "api_key": self._api_key,
            "query": query,
            "max_results": min(max_results, 20),
            "search_depth": "advanced",
            "include_raw_content": False,  # 💡 CAMBIO: False ahorra ancho de banda y tokens si el snippet/content es suficiente
            "topic": "general",
        }
        if days is not None:
            payload["days"] = days
        return payload

    def _normalize_item(self, item: dict[str, Any]) -> dict[str, str]:
        url = str(item.get("url", "")).strip()
        title = str(item.get("title", "")).strip()
        content = str(item.get("content") or item.get("raw_content") or "").strip()
        published_date = str(item.get("published_date") or item.get("date") or "").strip()
        return {
            "url": url,
            "title": title,
            "snippet": content,
            "date": published_date,
        }

    def _is_unity_result(self, item: dict[str, str]) -> bool:
        haystack = " ".join([item.get("title", ""), item.get("snippet", ""), item.get("url", "")]).lower()
        return "unity" in haystack

    async def _search_single_query(
        self,
        client: httpx.AsyncClient,
        query: str,
        max_results: int,
        days: int | None = None,
    ) -> list[dict[str, str]]:
        if max_results < 1:
            return []

        try:
            response = await client.post(TAVILY_SEARCH_URL, json=self._build_payload(query, max_results, days=days))
            response.raise_for_status()
            data = response.json()
        except httpx.HTTPError as exc:
            logger.warning("Tavily HTTP error for query %r: %s", query, exc)
            return []
        except Exception as exc:
            logger.exception("Unexpected Tavily failure for query %r: %s", query, exc)
            return []

        results = data.get("results", [])
        normalized: list[dict[str, str]] = []
        for item in results:
            if not isinstance(item, dict):
                continue
            normalized_item = self._normalize_item(item)
            if not normalized_item["url"] or not normalized_item["title"]:
                continue
            normalized.append(normalized_item)

        return normalized

    async def search_trends(self, max_results: int = 12, days: int | None = 365) -> list[dict[str, str]]:
        if max_results < 1:
            return []

        unity_target = max(1, math.ceil(max_results * 0.7))
        broad_target = max(0, max_results - unity_target)

        unity_queries = self._unity_queries()
        broad_queries = self._broad_queries()

        unity_quota = max(1, math.ceil(unity_target / len(unity_queries)))
        broad_quota = max(1, math.ceil(broad_target / len(broad_queries))) if broad_target else 0

        async with httpx.AsyncClient(timeout=self._timeout) as client:
            # Ejecuta todas las consultas en paralelo de forma asíncrona
            unity_tasks = [self._search_single_query(client, query, unity_quota, days=days) for query in unity_queries]
            broad_tasks = [self._search_single_query(client, query, broad_quota, days=days) for query in broad_queries] if broad_target else []

            unity_batches, broad_batches = await asyncio.gather(
                asyncio.gather(*unity_tasks),
                asyncio.gather(*broad_tasks)
            )

        unity_results: list[dict[str, str]] = []
        broad_results: list[dict[str, str]] = []
        seen: set[str] = set()

        # Procesar lote de Unity
        for batch in unity_batches:
            for item in batch:
                url = item.get("url", "")
                if not url or url in seen:
                    continue
                seen.add(url)
                if self._is_unity_result(item):
                    unity_results.append(item)
                else:
                    broad_results.append(item)

        # 🛠️ CORREGIDO: Ahora sí lee TODOS los batches de broad_queries sin el corte de [:1]
        for batch in broad_batches:
            for item in batch:
                url = item.get("url", "")
                if not url or url in seen:
                    continue
                seen.add(url)
                if self._is_unity_result(item):
                    unity_results.append(item)
                else:
                    broad_results.append(item)

        # Combinación inteligente y limpia de resultados respetando cuotas
        merged: list[dict[str, str]] = []
        merged.extend(unity_results[:unity_target])
        
        remaining = max_results - len(merged)
        if remaining > 0:
            merged.extend(broad_results[:remaining])

        # Rellenar con lo que sobre (overflow) si no alcanzamos el max_results global
        if len(merged) < max_results:
            overflow = unity_results[unity_target:] + broad_results[remaining:]
            for item in overflow:
                if len(merged) >= max_results:
                    break
                merged.append(item)

        return merged[:max_results]