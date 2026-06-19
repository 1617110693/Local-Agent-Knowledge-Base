"""Utility endpoints: PDF splitting, etc."""
import os
from pathlib import Path

from fastapi import APIRouter
from pydantic import BaseModel
from pypdf import PdfReader, PdfWriter

router = APIRouter()

MAX_PAGES = 200
MAX_SIZE_MB = 200


class SplitRequest(BaseModel):
    file_path: str
    max_pages: int = 200
    max_size_mb: int = 200


class SplitResult(BaseModel):
    original: str
    parts: list[str]
    split: bool


@router.post("/utils/split-pdf")
def split_pdf(req: SplitRequest) -> SplitResult:
    """Check a PDF and split it if exceeds limits.
    Returns list of file paths (original if no split needed)."""
    path = Path(req.file_path)
    if not path.exists():
        return SplitResult(original=req.file_path, parts=[req.file_path], split=False)

    file_size_mb = os.path.getsize(path) / (1024 * 1024)
    needs_split = False

    try:
        reader = PdfReader(str(path))
        page_count = len(reader.pages)
    except Exception:
        return SplitResult(original=req.file_path, parts=[req.file_path], split=False)

    if page_count > req.max_pages or file_size_mb > req.max_size_mb:
        needs_split = True

    if not needs_split:
        return SplitResult(original=req.file_path, parts=[req.file_path], split=False)

    parts = []
    base = path.stem
    parent = path.parent
    part_num = 0

    for start in range(0, page_count, req.max_pages):
        part_num += 1
        writer = PdfWriter()
        end = min(start + req.max_pages, page_count)
        for i in range(start, end):
            writer.add_page(reader.pages[i])

        part_path = parent / f"{base}_part{part_num}.pdf"
        with open(part_path, "wb") as f:
            writer.write(f)
        parts.append(str(part_path))

    return SplitResult(original=req.file_path, parts=parts, split=True)
