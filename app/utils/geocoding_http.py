"""HTTP helpers shared by geocoding-related Flask routes."""
from __future__ import annotations

from typing import Any, Callable

import httpx
from flask import jsonify


class GeocodingHTTPError(Exception):
    """Structured error with a status code and client-safe message."""

    def __init__(self, status_code: int, detail: str):
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail

    def as_response(self):
        return jsonify({"detail": self.detail}), self.status_code


def run_nominatim(work: Callable[[], Any]) -> Any:
    try:
        return work()
    except LookupError as e:
        raise GeocodingHTTPError(404, str(e)) from e
    except ValueError as e:
        raise GeocodingHTTPError(400, str(e)) from e
    except httpx.HTTPStatusError as e:
        raise GeocodingHTTPError(502, "Geocoding service error") from e
    except httpx.RequestError as e:
        raise GeocodingHTTPError(502, "Geocoding service unavailable") from e


def jsonify_or_nominatim_errors(work: Callable[[], Any]):
    try:
        return jsonify(run_nominatim(work)), 200
    except GeocodingHTTPError as e:
        return e.as_response()

run_upstream = run_nominatim
UpstreamHTTPError = GeocodingHTTPError