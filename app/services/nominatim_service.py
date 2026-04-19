"""
Nominatim (OpenStreetMap) geocoding client.

Policy: https://operations.osmfoundation.org/policies/nominatim/
Set ``NOMINATIM_USER_AGENT`` to ``YourApp/1.0 (+https://your-site.example)`` in production.
"""

from __future__ import annotations

import os
from typing import Any

import httpx

# =============================================================================
# Configuration
# =============================================================================

NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search"
NOMINATIM_DETAILS_URL = "https://nominatim.openstreetmap.org/details"
DEFAULT_USER_AGENT = os.environ.get(
    "NOMINATIM_USER_AGENT",
    "FullyHacks/1.0 (+https://localhost)",
)
DEFAULT_SEARCH_LIMIT = 5
# Nominatim allows higher limits; cap here to avoid accidental huge responses.
MAX_NOMINATIM_RESULTS = 50
HTTP_TIMEOUT_SECONDS = 15.0

# =============================================================================
# Internal helpers (extend mapping when you need more OSM fields)
# =============================================================================


def _place_hit(raw: dict[str, Any]) -> dict[str, Any]:
    """Pick stable fields from one Nominatim JSON hit."""
    return {
        "place_id": raw.get("place_id"),
        "osm_id": raw.get("osm_id"),
        "osm_type": raw.get("osm_type"),
        "lat": raw.get("lat"),
        "lon": raw.get("lon"),
        "class": raw.get("class"),
        "type": raw.get("type"),
        "addresstype": raw.get("addresstype"),
        "name": raw.get("name"),
        "display_name": raw.get("display_name"),
        "boundingbox": raw.get("boundingbox"),
    }

def _normalize_osm_type(stype: str | int) -> str:
    """
    Map user / Nominatim-style types to a single-letter Nominatim ``osmtype`` param (N, W, R).
    """
    s = str(stype).strip()
    if not s:
        raise ValueError("osm_type must be non-empty")
    sl = s.lower()
    if sl.startswith("node"):
        return "N"
    if sl.startswith("way"):
        return "W"
    if sl.startswith("relation"):
        return "R"
    if len(s) == 1 and s.upper() in "NWR":
        return s.upper()
    raise ValueError(f"osm_type must be node, way, relation, or N/W/R (got {stype!r})")


def _detail_hit(raw: dict[str, Any]) -> dict[str, Any]:
    """Normalize one Nominatim ``/details`` JSON object (not a search hit list)."""
    lat: Any = None
    lon: Any = None
    centroid = raw.get("centroid")
    if isinstance(centroid, dict):
        coords = centroid.get("coordinates")
        if isinstance(coords, (list, tuple)) and len(coords) >= 2:
            lon, lat = coords[0], coords[1]
    return {
        "place_id": raw.get("place_id"),
        "osm_id": raw.get("osm_id"),
        "osm_type": raw.get("osm_type"),
        "category": raw.get("category"),
        "localname": raw.get("localname"),
        "extratags": raw.get("extratags"),
        "lat": lat,
        "lon": lon,
    }


# =============================================================================
# Public API (add new functions for reverse geocode, structured search, etc.)
# =============================================================================


def forward_geocode(location: str, *, limit: int = DEFAULT_SEARCH_LIMIT) -> list[dict[str, Any]]:
    """
    Forward-geocode a free-text query; returns up to ``limit`` results, newest first.

    Raises:
        ValueError: empty ``location``.
        LookupError: Nominatim returned no hits.
        httpx.HTTPError: transport or HTTP error from Nominatim.
    """
    if not location or not location.strip():
        raise ValueError("location query must be non-empty")

    lim = max(1, min(limit, MAX_NOMINATIM_RESULTS))
    headers = {"User-Agent": DEFAULT_USER_AGENT}
    params = {"q": location.strip(), "format": "json", "limit": lim}

    with httpx.Client(headers=headers, timeout=HTTP_TIMEOUT_SECONDS) as client:
        response = client.get(NOMINATIM_SEARCH_URL, params=params)
        response.raise_for_status()
        data = response.json()

    if not data:
        raise LookupError(f"No results for query: {location!r}")

    if not isinstance(data, list):
        raise LookupError("Unexpected response shape from Nominatim")

    return [_place_hit(row) for row in data[:lim]]


def simple_query(location: str) -> list[dict[str, Any]]:
    """Same as :func:`forward_geocode` with the default limit (legacy name)."""
    return forward_geocode(location)

# https://nominatim.openstreetmap.org/details?osmtype=N&osmid=994020246&format=json
def forward_osm(osm_id: str | int, osm_type: str) -> list[dict[str, Any]]:
    """
    Look up one OSM object via Nominatim ``/details`` (returns a single JSON object).
    ``osm_type`` is a single letter: N (node), W (way), R (relation).
    """
    sid = str(osm_id).strip()
    if not sid:
        raise ValueError("osm_id must be non-empty")
    osm_letter = _normalize_osm_type(osm_type)

    headers = {"User-Agent": DEFAULT_USER_AGENT}
    params = {"osmtype": osm_letter, "osmid": sid, "format": "json"}

    with httpx.Client(headers=headers, timeout=HTTP_TIMEOUT_SECONDS) as client:
        response = client.get(NOMINATIM_DETAILS_URL, params=params)

        # Nominatim returns 404 with a JSON error body when the OSM object
        # exists in OSM but has no Nominatim place record. That's a "not found"
        # for our client, not an upstream failure.
        if response.status_code == 404:
            try:
                err_body = response.json()
                msg = err_body.get("error", {}).get("message", "Not found")
            except ValueError:
                msg = "Not found"
            raise LookupError(f"{msg} (osm_type={osm_letter} osm_id={sid})")

        response.raise_for_status()
        data = response.json()

    if isinstance(data, dict) and "error" in data:
        err = data.get("error")
        msg = err.get("message", str(data)) if isinstance(err, dict) else str(data)
        raise LookupError(msg)

    if not data:
        raise LookupError(f"No results for osm_type={osm_letter!r} osm_id={sid!r}")

    if isinstance(data, list):
        rows = data
    elif isinstance(data, dict):
        rows = [data]
    else:
        raise LookupError("Unexpected response shape from Nominatim details")

    return [_detail_hit(row) for row in rows]


def osm_query(osm_id: str | int, osm_type: str) -> list[dict[str, Any]]:
    return forward_osm(osm_id, osm_type)

# -----------------------------------------------------------------------------
# Template: add reverse geocode, structured search, caching, etc.
# -----------------------------------------------------------------------------
#
# def reverse_geocode(lat: float, lon: float) -> dict[str, Any]:
#     params = {"lat": lat, "lon": lon, "format": "json"}
#     ...
#     return _place_hit(data[0])
