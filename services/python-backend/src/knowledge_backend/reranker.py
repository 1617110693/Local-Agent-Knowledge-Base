"""OpenAI-compatible rerank client supporting multiple provider formats."""
from typing import List
from urllib.parse import urlparse

import httpx


class RerankResult:
    def __init__(self, index: int, score: float):
        self.index = index
        self.score = score


class OpenAICompatibleReranker:
    """Client for reranking APIs. Supports Jina, Cohere, DashScope, and generic formats."""

    def __init__(self, api_base: str, api_key: str, model: str):
        self.api_base = api_base.rstrip("/")
        self.api_key = api_key
        self.model = model
        self._client = httpx.Client(timeout=30.0)

    def rerank(
        self, query: str, documents: List[str], top_n: int = 10
    ) -> List[RerankResult]:
        """Rerank documents by relevance to the query."""
        if not documents:
            return []

        # Try Jina-style at /rerank
        try:
            return self._rerank_jina_style(query, documents, top_n, "/rerank")
        except Exception:
            pass

        # Try DashScope native format (before Cohere because dashscope doesn't
        # implement Cohere format either)
        try:
            return self._rerank_dashscope_style(query, documents, top_n)
        except Exception:
            pass

        # Try Cohere-style at /v1/rerank
        try:
            return self._rerank_cohere_style(query, documents, top_n, "/v1/rerank")
        except Exception:
            pass

        # Try Jina-style at the base URL directly
        try:
            return self._rerank_jina_style(query, documents, top_n, "")
        except Exception as e:
            raise RuntimeError(f"Rerank request failed: {e}")

    def _rerank_jina_style(
        self, query: str, documents: List[str], top_n: int, suffix: str
    ) -> List[RerankResult]:
        url = f"{self.api_base}{suffix}"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        body = {
            "model": self.model,
            "query": query,
            "documents": documents,
            "top_n": top_n,
        }
        resp = self._client.post(url, json=body, headers=headers)
        resp.raise_for_status()
        data = resp.json()
        return [
            RerankResult(index=r["index"], score=r.get("relevance_score", 0.0))
            for r in data.get("results", [])
        ]

    def _rerank_cohere_style(
        self, query: str, documents: List[str], top_n: int, suffix: str
    ) -> List[RerankResult]:
        url = f"{self.api_base}{suffix}"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        body = {
            "model": self.model,
            "query": query,
            "documents": documents,
        }
        resp = self._client.post(url, json=body, headers=headers)
        resp.raise_for_status()
        data = resp.json()
        return [
            RerankResult(index=r["index"], score=r.get("relevance_score", 0.0))
            for r in data.get("results", [])
        ]

    def _rerank_dashscope_style(
        self, query: str, documents: List[str], top_n: int
    ) -> List[RerankResult]:
        """DashScope native rerank format.

        DashScope compatible-mode only covers embeddings — rerank must use the
        native endpoint: /api/v1/services/rerank/text-rerank/text-rerank
        """
        # Derive the DashScope host from api_base or use the standard one
        host = "dashscope.aliyuncs.com"
        try:
            parsed = urlparse(self.api_base)
            if parsed.hostname and "dashscope" in parsed.hostname:
                host = parsed.hostname
        except Exception:
            pass

        url = f"https://{host}/api/v1/services/rerank/text-rerank/text-rerank"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        body = {
            "model": self.model,
            "input": {
                "query": query,
                "documents": documents,
            },
            "parameters": {
                "top_n": top_n,
            },
        }
        resp = self._client.post(url, json=body, headers=headers)
        resp.raise_for_status()
        data = resp.json()
        return [
            RerankResult(index=r["index"], score=r.get("relevance_score", 0.0))
            for r in data.get("output", {}).get("results", [])
        ]

    def close(self):
        self._client.close()
