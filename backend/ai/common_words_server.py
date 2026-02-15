import json
import os
from http.server import BaseHTTPRequestHandler, HTTPServer

import numpy as np
import tensorflow as tf

BASE_DIR = os.path.dirname(__file__)
MODEL_PATH = os.path.join(BASE_DIR, "wlasl_lstm_model_weighted.keras")
LABEL_MAP_PATH = os.path.join(BASE_DIR, "label_map.json")

with open(LABEL_MAP_PATH, "r", encoding="utf-8") as handle:
    LABEL_MAP = {int(k): v for k, v in json.load(handle).items()}

MODEL = tf.keras.models.load_model(MODEL_PATH)


def _set_headers(handler, status_code=200):
    handler.send_response(status_code)
    handler.send_header("Content-Type", "application/json")
    handler.send_header("Access-Control-Allow-Origin", "*")
    handler.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    handler.send_header("Access-Control-Allow-Headers", "Content-Type")
    handler.end_headers()


class CommonWordsHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        _set_headers(self, 200)

    def do_GET(self):
        if self.path == "/health":
            _set_headers(self, 200)
            self.wfile.write(json.dumps({"status": "ok"}).encode("utf-8"))
            return

        _set_headers(self, 404)
        self.wfile.write(json.dumps({"error": "Not found"}).encode("utf-8"))

    def do_POST(self):
        if self.path != "/predict":
            _set_headers(self, 404)
            self.wfile.write(json.dumps({"error": "Not found"}).encode("utf-8"))
            return

        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length or 0) if content_length else b"{}"
        try:
            payload = json.loads(body.decode("utf-8") or "{}")
        except json.JSONDecodeError:
            payload = {}

        sequence = payload.get("sequence")
        if not isinstance(sequence, list):
            _set_headers(self, 400)
            self.wfile.write(json.dumps({"error": "sequence must be a list"}).encode("utf-8"))
            return

        arr = np.array(sequence, dtype=np.float32)
        if arr.shape != (30, 258):
            _set_headers(self, 400)
            self.wfile.write(
                json.dumps({"error": "sequence must be shape (30, 258)", "shape": list(arr.shape)}).encode("utf-8")
            )
            return

        preds = MODEL.predict(arr[None, ...], verbose=0)
        if preds.ndim != 2 or preds.shape[1] == 0:
            _set_headers(self, 500)
            self.wfile.write(json.dumps({"error": "invalid model output"}).encode("utf-8"))
            return

        probs = preds[0]
        
        # Get top 3 predictions
        indexed = [(i, float(probs[i])) for i in range(len(probs))]
        indexed.sort(key=lambda x: x[1], reverse=True)
        top3 = indexed[:3]
        
        top_predictions = [
            {"label": LABEL_MAP.get(idx, "unknown"), "confidence": round(conf * 100, 2)}
            for idx, conf in top3
        ]
        
        # Return top prediction as main response, include top 3 in alternatives
        _set_headers(self, 200)
        self.wfile.write(json.dumps({
            "label": top_predictions[0]["label"],
            "confidence": top_predictions[0]["confidence"],
            "alternatives": top_predictions
        }).encode("utf-8"))


def main():
    print("=" * 60)
    print("   Common Words Model Backend Server")
    print("=" * 60)
    print(f"✓ Model loaded: {MODEL_PATH}")
    print(f"✓ Labels loaded: {len(LABEL_MAP)} words/phrases")
    print(f"✓ Server starting on http://localhost:5003")
    print("=" * 60)
    print("\nServer is ready! You can now use the Common Words courses.")
    print("Press Ctrl+C to stop the server.\n")
    
    server = HTTPServer(("0.0.0.0", 5003), CommonWordsHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n\nServer stopped.")
        server.server_close()


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"\n❌ Error starting server: {e}")
        print("\nMake sure you have TensorFlow installed:")
        print("  pip install tensorflow")
        input("\nPress Enter to exit...")

