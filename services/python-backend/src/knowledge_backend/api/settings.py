"""Settings validation endpoints."""
import httpx
from fastapi import APIRouter
from pydantic import BaseModel
from urllib.parse import urlparse

router = APIRouter()


class ValidateEmbeddingRequest(BaseModel):
    api_base: str
    api_key: str
    model: str


class ValidateRerankRequest(BaseModel):
    api_base: str
    api_key: str
    model: str


@router.post("/config/validate-embedding")
def validate_embedding(req: ValidateEmbeddingRequest):
    """Test embedding API connectivity."""
    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.post(
                f"{req.api_base}/embeddings",
                json={"model": req.model, "input": ["test"]},
                headers={
                    "Authorization": f"Bearer {req.api_key}",
                    "Content-Type": "application/json",
                },
            )
            if resp.status_code == 200:
                data = resp.json()
                dim = len(data["data"][0]["embedding"])
                return {"valid": True, "dimension": dim, "status": "ok"}
            return {
                "valid": False,
                "status": f"HTTP {resp.status_code}",
                "detail": resp.text[:500],
            }
    except Exception as e:
        return {"valid": False, "status": "error", "detail": str(e)}


@router.post("/config/validate-rerank")
def validate_rerank(req: ValidateRerankRequest):
    """Test rerank API connectivity. Tries common URL patterns and body formats."""
    base = req.api_base.rstrip("/")
    headers = {
        "Authorization": f"Bearer {req.api_key}",
        "Content-Type": "application/json",
    }

    attempts = [
        # (url, body, label)
        (f"{base}/rerank", "jina", {
            "model": req.model, "query": "test",
            "documents": ["sample document"], "top_n": 2,
        }),
        (f"{base}/rerank", "cohere", {
            "model": req.model, "query": "test",
            "documents": ["sample document"],
        }),
        (f"{base}", "jina", {
            "model": req.model, "query": "test",
            "documents": ["sample document"], "top_n": 2,
        }),
        (f"{base}", "cohere", {
            "model": req.model, "query": "test",
            "documents": ["sample document"],
        }),
        # DashScope native rerank (compatible-mode doesn't cover rerank)
        (f"https://dashscope.aliyuncs.com/api/v1/services/rerank/text-rerank/text-rerank", "dashscope", {
            "model": req.model,
            "input": {"query": "test", "documents": ["sample document"]},
            "parameters": {"top_n": 2},
        }),
    ]

    # Also try DashScope native on the same host if base URL points to dashscope
    try:
        parsed = urlparse(base)
        if parsed.hostname and "dashscope" in parsed.hostname:
            dashscope_url = f"https://{parsed.hostname}/api/v1/services/rerank/text-rerank/text-rerank"
            if dashscope_url not in [a[0] for a in attempts]:
                attempts.insert(0, (dashscope_url, "dashscope", {
                    "model": req.model,
                    "input": {"query": "test", "documents": ["sample document"]},
                    "parameters": {"top_n": 2},
                }))
    except Exception:
        pass

    last_error = None
    try:
        with httpx.Client(timeout=10.0) as client:
            for url, fmt, body in attempts:
                try:
                    resp = client.post(url, json=body, headers=headers)
                    if resp.status_code == 200:
                        return {"valid": True, "format": fmt, "url": url, "status": "ok"}
                    last_error = f"{url} → HTTP {resp.status_code}: {resp.text[:300]}"
                except Exception as e:
                    last_error = f"{url} → {e}"
                    continue

            return {
                "valid": False,
                "status": "all_attempts_failed",
                "detail": last_error or "No connection could be established",
            }
    except Exception as e:
        return {"valid": False, "status": "error", "detail": str(e)}
