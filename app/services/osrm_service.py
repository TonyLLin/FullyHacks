"""OSRM routing client.

Public server policy: https://github.com/Project-OSRM/osrm-backend/wiki/Demo-server
Set ``OSRM_BASE_URL`` to a self-hosted instance for anything beyond light testing.
"""
from __future__ import annotations

import os
from typing import Any

import httpx


OSRM_BASE_URL = os.environ.get("OSRM_BASE_URL", "https://router.project-osrm.org")
OSRM_PROFILE = os.environ.get("OSRM_PROFILE", "driving")
HTTP_TIMEOUT_SECONDS = 30.0


def _format_coord(lon: float, lat: float) -> str:
    """OSRM expects lon,lat (NOT lat,lon). This is the #1 source of bugs."""
    return f"{lon},{lat}"


def route(coordinates: list[tuple[float, float]]) -> dict[str, Any]:
    """
    Compute a route through the given coordinates, in order.

    Args:
        coordinates: list of (lon, lat) tuples. Must have at least 2 points.

    Returns:
        Normalized dict: {geometry, distance_meters, duration_seconds, legs}

    Raises:
        ValueError: fewer than 2 coordinates.
        LookupError: OSRM could not find a route (disconnected roads, etc.).
        httpx.HTTPError: transport or HTTP error from OSRM.
    """
    if len(coordinates) < 2:
        raise ValueError("route requires at least 2 coordinates")

    coord_str = ";".join(_format_coord(lon, lat) for lon, lat in coordinates)
    url = f"{OSRM_BASE_URL}/route/v1/{OSRM_PROFILE}/{coord_str}"
    params = {"overview": "full", "geometries": "geojson"}

    with httpx.Client(timeout=HTTP_TIMEOUT_SECONDS) as client:
        response = client.get(url, params=params)
        response.raise_for_status()
        data = response.json()

    # OSRM returns HTTP 200 with `code` field indicating success/failure
    code = data.get("code")
    if code != "Ok":
        message = data.get("message", f"OSRM returned code={code!r}")
        raise LookupError(message)

    routes = data.get("routes") or []
    if not routes:
        raise LookupError("OSRM returned no routes")

    best = routes[0]
    return {
        "geometry": best.get("geometry"),          # GeoJSON LineString
        "distance_meters": best.get("distance"),
        "duration_seconds": best.get("duration"),
        "legs": [
            {
                "distance_meters": leg.get("distance"),
                "duration_seconds": leg.get("duration"),
            }
            for leg in best.get("legs", [])
        ],
        "waypoints": data.get("waypoints", []),
    }