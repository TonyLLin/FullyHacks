"""In-memory stop store. Single-process only — swap for a DB later."""
from __future__ import annotations

from re import S
from threading import Lock
from typing import Iterable, Any

from app.models.stop import Stop


class StopStore:
    def __init__(self) -> None:
        self._stops: dict[str, Stop] = {}
        self._lock = Lock()

    def add(self, stop: Stop) -> Stop:
        with self._lock:
            self._stops[stop.id] = stop
        return stop

    def get(self, stop_id: str) -> Stop | None:
        return self._stops.get(stop_id)

    def list(self, *, day: int | None = None) -> list[Stop]:
        stops: Iterable[Stop] = self._stops.values()
        if day is not None:
            stops = (s for s in stops if s.day == day)
        return sorted(stops, key=lambda s: (s.day, s.order))

    def delete(self, stop_id: str) -> bool:
        with self._lock:
            return self._stops.pop(stop_id, None) is not None

    def delete_day(self, day: int) -> int:
        with self._lock:
            to_remove = [sid for sid, s in self._stops.items() if s.day == day]
            for sid in to_remove:
                del self._stops[sid]
        return len(to_remove)

    def clear(self) -> int:
        with self._lock:
            n = len(self._stops)
            self._stops.clear()
        return n

    def update(self, stop_id: str, **changes: Any) -> Stop | None:
        with self._lock:
            stop = self._stops.get(stop_id)
            if stop is None:
                return None
            
            for attr, values in changes.items():
                setattr(stop, attr, values)
            stop.touch()
            return stop
            



_store = StopStore()


def get_store() -> StopStore:
    return _store