"""Data model for itinerary stops."""
from __future__ import annotations

import uuid
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from typing import Any


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass
class Stop:
    # --- Identity ---
    name: str
    lat: float
    lon: float
    day: int
    order: int

    # --- OSM reference ---
    osm_id: str | int | None = None
    osm_type: str | None = None

    # --- User-editable metadata ---
    notes: str = ""

    # --- Server-managed ---
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = field(default_factory=_now_iso)
    updated_at: str = field(default_factory=_now_iso)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    def touch(self) -> None:
        self.updated_at = _now_iso()