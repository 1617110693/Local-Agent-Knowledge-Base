"""Knowledge base management endpoints."""
import shutil
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..config import get_config
from ..db.lancedb_manager import LanceDBManager

router = APIRouter()


class CreateKBRequest(BaseModel):
    kb_id: str
    embedding_dim: int = 1536


class BackupKBRequest(BaseModel):
    kb_id: str


@router.post("/kb")
def create_kb(req: CreateKBRequest):
    config = get_config()
    db = LanceDBManager(Path(config.knowledge_base_data_dir) / "lancedb_data")
    try:
        if db.table_exists(req.kb_id):
            raise HTTPException(409, "Knowledge base already exists")
        db.create_table(req.kb_id, req.embedding_dim)
        return {"kb_id": req.kb_id, "status": "created"}
    finally:
        db.close()


@router.delete("/kb/{kb_id}")
def delete_kb(kb_id: str):
    config = get_config()
    db = LanceDBManager(Path(config.knowledge_base_data_dir) / "lancedb_data")
    try:
        if not db.table_exists(kb_id):
            raise HTTPException(404, "Knowledge base not found")
        db.drop_table(kb_id)
        return {"kb_id": kb_id, "status": "deleted"}
    finally:
        db.close()


class CopyKBRequest(BaseModel):
    source_kb_id: str
    target_kb_id: str


@router.get("/kb/{kb_id}/stats")
def get_kb_stats(kb_id: str):
    config = get_config()
    db = LanceDBManager(Path(config.knowledge_base_data_dir) / "lancedb_data")
    try:
        return db.get_kb_stats(kb_id)
    finally:
        db.close()


@router.post("/kb/copy")
def copy_kb(req: CopyKBRequest):
    """Copy a LanceDB table from source KB to target KB."""
    config = get_config()
    db = LanceDBManager(Path(config.knowledge_base_data_dir) / "lancedb_data")
    try:
        source_table = db.get_table(req.source_kb_id)
        if source_table is None:
            raise HTTPException(404, f"Source KB not found: {req.source_kb_id}")
        if db.table_exists(req.target_kb_id):
            db.drop_table(req.target_kb_id)

        # Copy LanceDB table data
        df = source_table.to_pandas()
        # Determine embedding dimension from existing table
        schema = source_table.schema
        embedding_dim = None
        for field in schema:
            if field.name == "vector":
                embedding_dim = field.type.list_size
                break

        target_table = db.create_table(req.target_kb_id, embedding_dim or 1536)
        if not df.empty:
            target_table.add(df.to_dict("records"))

        return {
            "source_kb_id": req.source_kb_id,
            "target_kb_id": req.target_kb_id,
            "status": "copied",
            "rows": len(df),
        }
    finally:
        db.close()


@router.post("/kb/{kb_id}/backup")
def backup_kb(kb_id: str):
    """Create a backup of the LanceDB table before re-indexing."""
    config = get_config()
    lancedb_dir = Path(config.knowledge_base_data_dir) / "lancedb_data"
    table_name = LanceDBManager.table_name(kb_id)
    table_path = lancedb_dir / f"{table_name}.lance"

    if not table_path.exists():
        raise HTTPException(404, f"Table not found: {table_name}")

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    backup_path = lancedb_dir / f"{table_name}.lance.{timestamp}.bak"
    shutil.copytree(table_path, backup_path)

    return {"kb_id": kb_id, "backup_path": str(backup_path), "status": "backed_up"}
