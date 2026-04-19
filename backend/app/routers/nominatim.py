"""
Geocoding routes backed by Nominatim.

Add new endpoints here (e.g. ``/reverse``) and keep HTTP glue thin; call
``app.services.nominatim_service`` for remote calls and parsing.
"""

from __future__ import annotations

from flask import Blueprint, jsonify, request

from app.services import nominatim_service
from app.services.nominatim_service import DEFAULT_SEARCH_LIMIT
from app.utils.geocoding_http import jsonify_or_nominatim_errors

# =============================================================================
# Blueprint setup
# =============================================================================

bp = Blueprint("nominatim", __name__, url_prefix="/api/nominatim")


# =============================================================================
# Routes
# =============================================================================


@bp.route("/search", methods=["GET"])
def search():
    """
    ``GET /api/nominatim/search?q=...&limit=5``

    ``q`` is required. ``limit`` is optional (1–50, default from service).
    """
    q = (request.args.get("q") or "").strip()
    if not q:
        return jsonify({"detail": "Missing or empty query parameter: q"}), 400

    limit = request.args.get("limit", type=int)
    if limit is None:
        limit = DEFAULT_SEARCH_LIMIT

    return jsonify_or_nominatim_errors(
        lambda: nominatim_service.forward_geocode(q, limit=limit)
    )

