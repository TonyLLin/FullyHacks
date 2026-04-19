from flask import Flask, send_from_directory, jsonify, request
import os

app = Flask(__name__, static_folder="../frontend/build", static_url_path="")

# Serve the React app for any non-API route
@app.route("/")
def serve():
    return send_from_directory(app.static_folder, "index.html")

# Tony's API call
@app.route("/api/trips")
def something():
    return jsonify({"message": "This is a message from Python"})

if __name__ == "__main__":
    app.run(debug=True, port=5000)