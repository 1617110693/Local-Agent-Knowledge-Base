"""Map markdown character offsets to PDF page numbers using MinerU JSON.

The MinerU Precise API returns a ZIP containing both full.md and a JSON file
with ``pdf_info[]`` — an array of per-page objects that include:

- ``page_idx``: 0-based page index
- ``discarded_blocks``: headers, footers, page numbers
- ``para_blocks``: content blocks that correspond 1:1 with markdown paragraphs

This module aligns the JSON paragraph data with the markdown to determine
which page each chunk of text belongs to.
"""

import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional, Tuple


@dataclass
class PageBoundary:
    """Maps a character range to a PDF page."""
    start_char: int       # first character offset belonging to this page
    end_char: int         # last+1 character offset belonging to this page
    page_idx: int         # 0-based page index (pdf_info array index)
    physical_page: int    # actual page number from discarded_blocks (1-based)


class PageMapper:
    """Resolves character ranges to page numbers using MinerU JSON metadata."""

    def __init__(self, json_path: Path, markdown_text: str):
        """Parse the JSON and build page boundaries.

        Args:
            json_path: Path to ``mineru_result.json``.
            markdown_text: The full markdown content.

        Raises:
            ValueError: If the JSON is malformed or cannot be aligned.
        """
        data = json.loads(json_path.read_text(encoding="utf-8"))
        pdf_info = data.get("pdf_info")
        if not isinstance(pdf_info, list) or not pdf_info:
            raise ValueError("mineru_result.json does not contain pdf_info array")

        self._pages: List[PageBoundary] = []
        self._build(pdf_info, markdown_text)

    @classmethod
    def from_doc_dir(cls, doc_dir: Path, markdown_text: str) -> Optional["PageMapper"]:
        """Create a PageMapper from a document directory if the JSON exists.

        Returns None if ``mineru_result.json`` is not present.
        """
        json_path = doc_dir / "mineru_result.json"
        if not json_path.exists():
            return None
        try:
            return cls(json_path, markdown_text)
        except (ValueError, json.JSONDecodeError, KeyError) as e:
            # Page mapping is best-effort; don't block indexing
            import sys
            print(f"[PageMapper] Warning: failed to load page map: {e}", file=sys.stderr)
            return None

    def get_page_range(self, start_char: int, end_char: int) -> Tuple[int, int]:
        """Return (page_start, page_end) for a character range, both 1-based.

        If the range cannot be resolved (e.g., no page map), returns (0, 0).
        """
        if not self._pages:
            return (0, 0)

        page_start = self._find_page(start_char)
        page_end = self._find_page(max(start_char, end_char - 1))
        return (page_start, page_end)

    def get_page_number(self, start_char: int, end_char: int = 0) -> int:
        """Return the single page number (1-based) for a character position.

        Convenience wrapper around ``get_page_range`` — returns page_start.
        """
        start, _ = self.get_page_range(start_char, end_char or start_char)
        return start

    # ── internals ──

    def _build(self, pdf_info: list, markdown_text: str):
        """Build page boundaries using paragraph-count alignment."""
        # Count para_blocks per page
        page_para_counts: List[int] = []
        for page in pdf_info:
            para_blocks = page.get("para_blocks") or []
            page_para_counts.append(len(para_blocks))

        # Split markdown into logical paragraphs (blank-line separated blocks)
        md_paragraphs = _split_paragraphs(markdown_text)

        total_para = sum(page_para_counts)
        if total_para == 0:
            # Edge case: no para_blocks at all (empty document?)
            return

        # If paragraph counts match closely, use direct alignment
        if abs(len(md_paragraphs) - total_para) <= max(3, total_para * 0.1):
            self._align_by_count(md_paragraphs, page_para_counts, pdf_info)
        else:
            # Fallback: use fuzzy text matching to find page boundaries
            self._align_by_fuzzy(md_paragraphs, markdown_text, page_para_counts, pdf_info)

    def _align_by_count(self, md_paragraphs: List[str], page_para_counts: List[int], pdf_info: list):
        """Align using paragraph count — the primary strategy."""
        para_idx = 0
        char_offset = 0

        for page_idx, para_count in enumerate(page_para_counts):
            if para_count == 0:
                continue

            end_para = min(para_idx + para_count, len(md_paragraphs))
            page_start = char_offset

            # Advance through the paragraphs belonging to this page
            for p in md_paragraphs[para_idx:end_para]:
                char_offset += len(p) + 2  # +2 for the \n\n separator
            para_idx = end_para

            physical = _extract_physical_page(pdf_info[page_idx], page_idx)
            self._pages.append(PageBoundary(
                start_char=page_start,
                end_char=char_offset,
                page_idx=page_idx,
                physical_page=physical,
            ))

    def _align_by_fuzzy(self, md_paragraphs: List[str], markdown_text: str,
                        page_para_counts: List[int], pdf_info: list):
        """Fallback: fuzzy text matching when paragraph counts don't align."""
        # Build page anchor texts from JSON
        anchors: List[Tuple[str, str, int]] = []  # (first_text, last_text, page_idx)
        cum_count = 0
        for page_idx, para_count in enumerate(page_para_counts):
            if para_count == 0:
                continue
            para_blocks = pdf_info[page_idx].get("para_blocks") or []
            first_text = _extract_block_text(para_blocks[0])[:80].strip()
            last_text = _extract_block_text(para_blocks[-1])[-80:].strip()
            if first_text or last_text:
                anchors.append((first_text, last_text, page_idx))

        if not anchors:
            return

        # Strip markdown for fuzzy matching
        plain_text = _strip_markdown(markdown_text)

        # For each anchor, find its approximate position in the plain text
        for i, (first, last, page_idx) in enumerate(anchors):
            # Find first occurrence of first_text after previous page boundary
            search_start = self._pages[-1].end_char if self._pages else 0
            first_pos = _fuzzy_find(plain_text, first, search_start)
            if first_pos < 0:
                continue

            # Find last occurrence of last_text
            last_pos = _fuzzy_find(plain_text, last, first_pos)
            if last_pos < 0:
                continue
            last_pos += len(last)

            physical = _extract_physical_page(pdf_info[page_idx], page_idx)
            self._pages.append(PageBoundary(
                start_char=first_pos,
                end_char=last_pos,
                page_idx=page_idx,
                physical_page=physical,
            ))

    def _find_page(self, char_offset: int) -> int:
        """Find which physical page number *char_offset* falls in."""
        for boundary in self._pages:
            if boundary.start_char <= char_offset < boundary.end_char:
                return boundary.physical_page
        # Fallback: use the last page
        if self._pages:
            return self._pages[-1].physical_page
        return 0


# ── helpers ──

def _extract_physical_page(page_info: dict, page_idx: int) -> int:
    """Extract the actual printed page number from discarded_blocks.

    Falls back to ``page_idx + 1`` if no page_number block is found.
    """
    for block in page_info.get("discarded_blocks") or []:
        if block.get("type") == "page_number":
            for line in block.get("lines") or []:
                for span in line.get("spans") or []:
                    content = span.get("content", "").strip()
                    if content:
                        try:
                            return int(content)
                        except ValueError:
                            pass
    return page_idx + 1


def _extract_block_text(block: dict) -> str:
    """Extract plain text from a MinerU block (recursive for nested blocks)."""
    if block.get("type") == "table":
        # Tables have nested blocks; extract text from all of them
        parts = []
        for sub in block.get("blocks") or []:
            parts.append(_extract_block_text(sub))
        return " ".join(parts)

    parts = []
    for line in block.get("lines") or []:
        for span in line.get("spans") or []:
            content = span.get("content")
            if content:
                parts.append(content)
    return "".join(parts)


def _split_paragraphs(text: str) -> List[str]:
    """Split markdown text into logical paragraphs (blocks separated by blank lines)."""
    # Split on double newline (blank line separator)
    raw = re.split(r"\n\s*\n", text)
    # Filter out empty blocks but keep structure
    return [p.strip() for p in raw if p.strip()]


def _strip_markdown(text: str) -> str:
    """Remove markdown formatting to produce plain text for matching."""
    # Remove code blocks
    text = re.sub(r"```[\s\S]*?```", "", text)
    # Remove inline code
    text = re.sub(r"`[^`]+`", "", text)
    # Remove images
    text = re.sub(r"!\[.*?\]\(.*?\)", "", text)
    # Remove links (keep text)
    text = re.sub(r"\[([^\]]*)\]\(.*?\)", r"\1", text)
    # Remove HTML tags
    text = re.sub(r"<[^>]+>", "", text)
    # Remove heading markers
    text = re.sub(r"^#{1,6}\s+", "", text, flags=re.MULTILINE)
    # Remove bold/italic markers
    text = re.sub(r"\*{1,3}([^*]+)\*{1,3}", r"\1", text)
    # Remove math delimiters
    text = re.sub(r"\$\$?[^$]+\$\$?", "", text)
    # Collapse whitespace
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def _fuzzy_find(haystack: str, needle: str, start: int = 0) -> int:
    """Find *needle* in *haystack* with basic fuzzy matching.

    Tries exact match first, then prefix matching (first N chars).
    Returns character position or -1.
    """
    if not needle:
        return -1

    # Try exact match
    pos = haystack.find(needle, start)
    if pos >= 0:
        return pos

    # Try with the first 40 chars
    prefix = needle[:40]
    if len(prefix) >= 20:
        pos = haystack.find(prefix, start)
        if pos >= 0:
            return pos

    # Try with the last 40 chars
    suffix = needle[-40:]
    if len(suffix) >= 20:
        pos = haystack.find(suffix, start)
        if pos >= 0:
            return max(0, pos - (len(needle) - len(suffix)))

    return -1
