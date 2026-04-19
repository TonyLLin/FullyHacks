"""
FullyHacks Flask API.

Run from ``backend/``::

    flask --app main run --reload --port 8000
"""

from __future__ import annotations

from flask import Flask, jsonify, request
from flask_cors import CORS

from app.routers.nominatim import bp as nominatim_bp
from app.routers.itinerary import bp as itinerary_bp
from app.services import nominatim_service
from app.services.nominatim_service import DEFAULT_SEARCH_LIMIT
from app.utils.geocoding_http import jsonify_or_nominatim_errors


def create_app() -> Flask:
    """
    Application factory — use this pattern when adding config, DB, auth, etc.
    Tests can call ``create_app()`` with overrides without touching globals.
    """
    # -------------------------------------------------------------------------
    # Core app
    # -------------------------------------------------------------------------
    app = Flask(__name__)

    # -------------------------------------------------------------------------
    # Cross-origin (extend ``origins`` for staging / production)
    # -------------------------------------------------------------------------
    CORS(
        app,
        resources={r"/*": {"origins": "http://localhost:5173"}},
        supports_credentials=True,
        allow_headers="*",
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    )

    # -------------------------------------------------------------------------
    # Feature blueprints (register one line per blueprint)
    # -------------------------------------------------------------------------
    app.register_blueprint(nominatim_bp)
    app.register_blueprint(itinerary_bp)

    # =========================================================================
    # Top-level routes (move to a blueprint when this section grows)
    # =========================================================================

    @app.route("/", methods=["GET"])
    def root():
        return jsonify({"message": "Hello from Flask"})


    @app.route("/api/search", methods=["GET"])
    def search_location():
        """
        Convenience search: ``GET /api/search?q=...&limit=5``

        ``q`` defaults to a demo city if omitted. Prefer ``/api/nominatim/search``
        for a stricter API (required ``q``).
        """
        q = (request.args.get("q") or "Los Angeles").strip()
        limit = request.args.get("limit", type=int)
        if limit is None:
            limit = DEFAULT_SEARCH_LIMIT

        def payload():
            data = nominatim_service.forward_geocode(q, limit=limit)
            return {
                "message": "API is running",
                "query": q,
                "limit": limit,
                "dynamic_search": "/api/nominatim/search?q=your+query",
                "nominatim": data,
            }

        return jsonify_or_nominatim_errors(payload)

    # -------------------------------------------------------------------------
    # Optional: app-wide error handlers, CLI commands, teardown, etc.
    # -------------------------------------------------------------------------
    # @app.errorhandler(404)
    # def not_found(_e):
    #     return jsonify({"detail": "Not found"}), 404

    return app


# Uvicorn / ASGI users: this is a WSGI app — use ``flask run`` or ``gunicorn``.
app = create_app()
