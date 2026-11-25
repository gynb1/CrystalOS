import json
import os
import sys
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

PORT = int(os.environ.get("PORT", "8787"))
UPSTREAM = os.environ.get("CRYSTALSEEK_API", "https://crystalseek.cn").rstrip("/")
AUTH_PREFIX = os.environ.get("CRYSTALSEEK_AUTH_PREFIX", "").strip()
ALLOWED_PATHS = {
    "/api/File/search",
    "/api/File/search_single",
    "/api/File/get_file",
    "/api/File/get_cif_file",
}
ALLOWED_ORIGINS = {
    "https://gynb1.github.io",
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "http://localhost:8099",
    "http://127.0.0.1:8099",
    "null",
}


def load_token():
    token = os.environ.get("CRYSTALSEEK_TOKEN", "").strip()
    if token:
        return token
    token_file = Path(__file__).with_name(".token")
    if token_file.exists():
        return token_file.read_text(encoding="utf-8").strip()
    return ""


TOKEN = load_token()


def cors_origin(origin):
    if origin in ALLOWED_ORIGINS:
        return origin
    if origin.startswith("http://localhost:") or origin.startswith("http://127.0.0.1:"):
        return origin
    return "https://gynb1.github.io"


class ProxyHandler(BaseHTTPRequestHandler):
    server_version = "CrystalSeekProxy/0.1"

    def send_cors(self):
        origin = cors_origin(self.headers.get("Origin", ""))
        self.send_header("Access-Control-Allow-Origin", origin)
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Access-Control-Max-Age", "86400")
        self.send_header("Vary", "Origin")

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_cors()
        self.end_headers()

    def do_POST(self):
        if self.path not in ALLOWED_PATHS:
            self.send_json({"ok": False, "error": "Path not allowed"}, 404)
            return
        if not TOKEN:
            self.send_json({"ok": False, "error": "CRYSTALSEEK_TOKEN is not configured"}, 500)
            return

        length = int(self.headers.get("Content-Length", "0"))
        body = self.rfile.read(length) if length else b"{}"
        content_type = self.headers.get("Content-Type", "application/json")
        prefixes = [AUTH_PREFIX]
        if AUTH_PREFIX != "Bearer":
            prefixes.append("Bearer")
        response = None
        last_error = None
        for prefix in prefixes:
            auth_value = (prefix + " " + TOKEN).strip() if prefix else TOKEN
            request = urllib.request.Request(
                UPSTREAM + self.path,
                data=body,
                method="POST",
                headers={
                    "Content-Type": content_type,
                    "Authorization": auth_value,
                },
            )
            try:
                response = urllib.request.urlopen(request, timeout=60)
                break
            except urllib.error.HTTPError as error:
                last_error = error
                if error.code == 401 and prefix != prefixes[-1]:
                    continue
                payload = error.read()
                self.send_response(error.code)
                self.send_cors()
                self.send_header("Content-Type", error.headers.get("Content-Type", "application/json; charset=utf-8"))
                self.send_header("Content-Length", str(len(payload)))
                self.end_headers()
                self.wfile.write(payload)
                return
            except Exception as error:
                self.send_json({"ok": False, "error": "Upstream request failed", "detail": str(error)}, 502)
                return
        if response is None:
            self.send_json({"ok": False, "error": "Upstream request failed", "detail": str(last_error)}, 502)
            return
        with response:
            payload = response.read()
            self.send_response(response.status)
            self.send_cors()
            self.send_header("Content-Type", response.headers.get("Content-Type", "application/json; charset=utf-8"))
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)

    def send_json(self, payload, status):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_cors()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt, *args):
        sys.stdout.write("[proxy] " + (fmt % args) + "\n")
        sys.stdout.flush()


def main():
    if not TOKEN:
        print("CRYSTALSEEK_TOKEN is missing.")
        print("Set env CRYSTALSEEK_TOKEN or create proxy/.token")
    print("CrystalSeek proxy: http://127.0.0.1:%d" % PORT)
    print("Upstream: %s" % UPSTREAM)
    server = ThreadingHTTPServer(("127.0.0.1", PORT), ProxyHandler)
    server.serve_forever()


if __name__ == "__main__":
    main()
