from __future__ import annotations

from typing import Any

from flask import Blueprint, jsonify, request

from app.models.stop import Stop
from app.services import nominatim_service, osrm_service
from app.stores.stop_store import get_store
from app.utils.geocoding_http import GeocodingHTTPError, run_nominatim, UpstreamHTTPError, run_upstream

bp = Blueprint("itinerary", __name__, url_prefix="/api/itinerary")

MAX_NAME_LENGTH = 200


def _as_float(value: Any) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _as_int(value: Any) -> int | None:
    if value is None:
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _bad_request(detail: str):
    return jsonify({"detail": detail}), 400

# =============================================================================
# Field validators — shared between POST and PATCH
# =============================================================================


class ValidationError(Exception):
    """Raised by validators to signal a bad field value."""

def _validate_name(value: Any) -> str:
    if not isinstance(value, str):
        raise ValidationError("name must be a string")
    name = value.strip()
    if not name:
        raise ValidationError("name must not be empty")
    if len(name) > MAX_NAME_LENGTH:
        raise ValidationError(f"name too long (max {MAX_NAME_LENGTH} chars)")
    return name

def _validate_day(value: Any) -> int:
    day = _as_int(value)
    if day is None or day < 1:
        raise ValidationError("day must be a positive integer")
    return day

def _validate_order(value: Any) -> int:
    order = _as_int(value)
    if order is None or order < 0:
        raise ValidationError("order must be a non-negative integer")
    return order


def _validate_lat(value: Any) -> float:
    lat = _as_float(value)
    if lat is None:
        raise ValidationError("lat must be a number")
    if not -90 <= lat <= 90:
        raise ValidationError("lat must be between -90 and 90")
    return lat


def _validate_lon(value: Any) -> float:
    lon = _as_float(value)
    if lon is None:
        raise ValidationError("lon must be a number")
    if not -180 <= lon <= 180:
        raise ValidationError("lon must be between -180 and 180")
    return lon


def _validate_notes(value: Any) -> str:
    if not isinstance(value, str):
        raise ValidationError("notes must be a string")
    return value


# =============================================================================
# POST /api/itinerary  — create a stop
# =============================================================================


@bp.route("", methods=["POST"])
def create_stop():
    raw = request.get_json(silent=True)
    if not isinstance(raw, dict):
        return _bad_request("Request body must be a JSON object")

    # --- name ---
    name_raw = raw.get("name")
    if not isinstance(name_raw, str):
        return _bad_request("name must be a string")
    name = name_raw.strip()
    if not name:
        return _bad_request("name is required")
    if len(name) > MAX_NAME_LENGTH:
        return _bad_request(f"name too long (max {MAX_NAME_LENGTH} chars)")

    # --- day / order (required for itinerary ordering) ---
    day = _as_int(raw.get("day"))
    if day is None or day < 1:
        return _bad_request("day must be a positive integer")

    order = _as_int(raw.get("order"))
    if order is None or order < 0:
        return _bad_request("order must be a non-negative integer")

    # --- coords ---
    lat = _as_float(raw.get("lat"))
    lon = _as_float(raw.get("lon"))

    # --- osm fallback ---
    osm_id = raw.get("osm_id")
    osm_type = raw.get("osm_type")
    if osm_type is not None and not isinstance(osm_type, str):
        return _bad_request("osm_type must be a string")
    if osm_id is not None and not isinstance(osm_id, (str, int)):
        return _bad_request("osm_id must be a string or integer")

    if (lat is None or lon is None) and osm_id is not None and osm_type:
        try:
            hits = run_nominatim(
                lambda: nominatim_service.forward_osm(osm_id, osm_type)
            )
        except GeocodingHTTPError as e:
            return e.as_response()

        lat = _as_float(hits[0].get("lat"))
        lon = _as_float(hits[0].get("lon"))

    if lat is None or lon is None:
        return _bad_request(
            "lat and lon are required "
            "(or provide osm_id + osm_type to resolve them)"
        )
    if not -90 <= lat <= 90:
        return _bad_request("lat must be between -90 and 90")
    if not -180 <= lon <= 180:
        return _bad_request("lon must be between -180 and 180")

    # --- notes (optional) ---
    notes_raw = raw.get("notes", "")
    if not isinstance(notes_raw, str):
        return _bad_request("notes must be a string")

    # --- persist ---
    stop = Stop(
        name=name,
        lat=lat,
        lon=lon,
        day=day,
        order=order,
        osm_id=osm_id,
        osm_type=osm_type,
        notes=notes_raw,
    )
    get_store().add(stop)
    return jsonify(stop.to_dict()), 201


# =============================================================================
# GET /api/itinerary  — list stops (optionally filtered by ?day=N)
# =============================================================================

@bp.route("", methods=["GET"])
def list_stops():
    day_param = request.args.get("day", type=int)
    stops = get_store().list(day=day_param)
    return jsonify([s.to_dict() for s in stops]), 200


# =============================================================================
# GET /api/itinerary/{id} - list stop by id
# =============================================================================
@bp.route("/<stop_id>", methods=["GET"])
def get_stop(stop_id: str):
    stop = get_store().get(stop_id)
    if stop is None:
        return jsonify({"detail": f"Stop {stop_id!r} not found"}), 404
    return jsonify(stop.to_dict()), 200

# =============================================================================
# DELETE /api/itinerary/{id} - delete stop by id
# =============================================================================
@bp.route("/<stop_id>", methods=["DELETE"])
def delete_stop(stop_id: str):
    success = get_store().delete(stop_id)
    if not success:
        return jsonify({"detail": f"Stop {stop_id!r} not found"}), 404  
    return "", 204
    
# =============================================================================
# DELETE /api/itinerary         — clear all stops
# DELETE /api/itinerary?day=N   — delete all stops on day N
# =============================================================================
@bp.route("", methods=["DELETE"])
def delete_stops():
    day_raw = request.args.get("day")
    if day_raw is not None:
        try:
            day = int(day_raw)
            if day < 1:
                raise ValueError
        except ValueError:
            return _bad_request("day must be a positive integer")
        n = get_store().delete_day(day)
    else:
        n = get_store().clear()

    return jsonify({"deleted": n}), 200



# =============================================================================
# PATCH /api/itinerary/{id} — update fields on a stop
# =============================================================================
# Fields the client is allowed to change via PATCH.
# id, created_at, updated_at, osm_id, osm_type are intentionally excluded.
_PATCHABLE_FIELDS = {
    "name": _validate_name,
    "day": _validate_day,
    "order": _validate_order,
    "lat": _validate_lat,
    "lon": _validate_lon,
    "notes": _validate_notes,
}

@bp.route("/<stop_id>", methods=["PATCH"])
def update_stop(stop_id: str):
    raw = request.get_json(silent=True)
    if not isinstance(raw, dict):
        return _bad_request("Request body must be a JSON object")

    changes: dict[str, Any] = {}
    for field_name, validator in _PATCHABLE_FIELDS.items():
        if field_name in raw:
            try:
                changes[field_name] = validator(raw[field_name])
            except ValidationError as e:
                return _bad_request(str(e))
                
    if not changes:
        return _bad_request(
            "No updatable fields provided. "
            f"Allowed: {', '.join(sorted(_PATCHABLE_FIELDS))}"
        )

    stop = get_store().update(stop_id, **changes)
    if stop is None:
        return jsonify({"detail": f"Stop {stop_id!r} not found"}), 404
    return jsonify(stop.to_dict()), 200

# =============================================================================
# GET /api/itinerary/day/{N}/route  — compute a route for day N
# =============================================================================


@bp.route("/day/<int:day>/route", methods=["GET"])
def route_day(day: int):
    if day < 1:
        return _bad_request("day must be a positive integer")

    stops = get_store().list(day=day)
    if not stops:
        return jsonify({"detail": f"No stops on day {day}"}), 404
    if len(stops) < 2:
        return _bad_request(
            f"Routing requires at least 2 stops on day {day} (found {len(stops)})"
        )

    # Convert stops to (lon, lat) tuples. The swap happens exactly here —
    # anywhere else and you'll spend hours debugging why routes go through Antarctica.
    coords = [(s.lon, s.lat) for s in stops]

    try:
        result = run_upstream(lambda: osrm_service.route(coords))
    except UpstreamHTTPError as e:
        return e.as_response()

    return jsonify({
        "day": day,
        "stops": [s.to_dict() for s in stops],
        "route": result,
    }), 200



# @bp.route("/<stop_id>", methods=["DELETE"])
# def delete_stop(stop_id: str):
#     success = get_store().delete(stop_id)
#     if not success:
#         return jsonify({"detail": f"Stop {stop_id!r} not found"}), 404  
#     return "", 204