from flask import Flask, send_from_directory, jsonify, request
from flask_cors import CORS
import sys
import os

# add the backend folder to the path so imports work
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))

from app.routers.nominatim import bp as nominatim_bp
from app.routers.itinerary import bp as itinerary_bp
from app.services import nominatim_service
from app.services.nominatim_service import DEFAULT_SEARCH_LIMIT
from app.utils.geocoding_http import jsonify_or_nominatim_errors

app = Flask(__name__, static_folder="../frontend/build", static_url_path="")

CORS(app,
    resources={r"/*": {"origins": ["http://localhost:3000", "http://localhost:5000", "http://localhost:8000"]}},
    supports_credentials=True,
    allow_headers="*",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
)

# register the backend blueprints
app.register_blueprint(nominatim_bp)
app.register_blueprint(itinerary_bp)

# search endpoint
@app.route("/api/search", methods=["GET"])
def search_location():
    q = (request.args.get("q") or "Los Angeles").strip()
    limit = request.args.get("limit", type=int) or DEFAULT_SEARCH_LIMIT

    def payload():
        data = nominatim_service.forward_geocode(q, limit=limit)
        return {
            "message": "API is running",
            "query": q,
            "limit": limit,
            "nominatim": data,
        }

    return jsonify_or_nominatim_errors(payload)

# serve React
@app.route("/")
def serve():
    return send_from_directory(app.static_folder, "index.html")

if __name__ == "__main__":
    app.run(debug=True, port=5000)