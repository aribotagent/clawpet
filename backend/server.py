"""
ClawPet - Status API Server
Reads OpenClaw agent state and serves it via HTTP for the Chrome extension.
"""

import json
import os
import time
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path

from adapter import OpenClawAdapter
from evolution import EvolutionTracker

PORT = int(os.environ.get("AGENT_PET_PORT", 7474))
CONFIG_PATH = Path(__file__).parent.parent / "config" / "default.json"
DATA_PATH = Path(__file__).parent.parent / "data"
DATA_PATH.mkdir(exist_ok=True)

# Load config
with open(CONFIG_PATH) as f:
    CONFIG = json.load(f)

adapter = OpenClawAdapter(CONFIG)
evolution = EvolutionTracker(DATA_PATH / "evolution.json")

# CORS headers for Chrome extension
CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
}


class AgentPetHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass  # Suppress request logs

    def send_cors(self, code=200, content_type="application/json"):
        self.send_response(code)
        for k, v in CORS_HEADERS.items():
            self.send_header(k, v)
        if content_type == "text/event-stream":
            self.send_header("Content-Type", "text/event-stream")
            self.send_header("Cache-Control", "no-cache")
        self.end_headers()

    def respond_json(self, data, code=200):
        self.send_cors(code)
        self.wfile.write(json.dumps(data).encode())

    def do_OPTIONS(self):
        self.send_cors()

    def do_GET(self):
        path = self.path.split("?")[0]

        if path == "/health":
            self.respond_json({"ok": True, "version": "1.0.0"})

        elif path == "/status":
            state = adapter.get_status()
            self.respond_json(state)

        elif path == "/status/all":
            states = adapter.get_all_status()
            self.respond_json({"agents": states, "updated_at": time.time()})

        elif path == "/status/stream":
            self.send_cors(200, "text/event-stream")
            try:
                while True:
                    states = adapter.get_all_status()
                    data = json.dumps({"agents": states, "updated_at": time.time()})
                    self.wfile.write(f"data: {data}\n\n".encode())
                    self.wfile.flush()
                    time.sleep(CONFIG.get("poll_interval_ms", 2000) / 1000)
            except (BrokenPipeError, ConnectionResetError):
                pass

        elif path == "/evolution":
            # Get session tokens and pass to evolution tracker for daily counting
            sessions = adapter.get_all_status()
            session_tokens = sum(s.get("tokens_used", 0) for s in sessions)
            ev = evolution.get_status(session_tokens)
            self.respond_json(ev)

        elif path == "/backpack":
            backpack = load_backpack()
            self.respond_json(backpack)

        elif path == "/install":
            self.send_response(200)
            self.send_header("Content-Type", "text/html")
            self.end_headers()
            install_page = Path(__file__).parent.parent / "install-page" / "index.html"
            self.wfile.write(install_page.read_bytes())

        else:
            self.respond_json({"error": "Not found"}, 404)

    def do_POST(self):
        path = self.path.split("?")[0]
        length = int(self.headers.get("Content-Length", 0))
        body = json.loads(self.rfile.read(length)) if length else {}

        if path == "/backpack/equip":
            agent_id = body.get("agent_id", "main")
            item = body.get("item")  # None to unequip
            backpack = load_backpack()
            if item and item not in backpack["items"]:
                self.respond_json({"error": "Item not in backpack"}, 400)
                return
            backpack["equipped"][agent_id] = item
            save_backpack(backpack)
            self.respond_json({"ok": True, "equipped": item})

        elif path == "/backpack/add":
            # Internal: add item to backpack (called after reward)
            item = body.get("item")
            if item:
                backpack = load_backpack()
                if item not in backpack["items"]:
                    backpack["items"].append(item)
                save_backpack(backpack)
            self.respond_json({"ok": True})

        elif path == "/daily-box":
            # Daily treasure box - 65% common item, 35% rare item
            result = open_daily_box()
            self.respond_json(result)

        else:
            self.respond_json({"error": "Not found"}, 404)


# --- Backpack helpers ---

BACKPACK_PATH = DATA_PATH / "backpack.json"
DAILY_BOX_PATH = DATA_PATH / "daily_box.json"

# Item definitions
COMMON_ITEMS = ["hat", "coffee-cup", "telescope"]
RARE_ITEMS = ["gold-claw", "treasure-box"]

def load_backpack():
    if BACKPACK_PATH.exists():
        with open(BACKPACK_PATH) as f:
            return json.load(f)
    return {"items": [], "equipped": {}}

def save_backpack(data):
    with open(BACKPACK_PATH, "w") as f:
        json.dump(data, f, indent=2)

def open_daily_box():
    """Open daily treasure box - 65% common item, 35% rare item"""
    import random
    
    # Check if already opened today
    today = time.strftime("%Y-%m-%d")
    if DAILY_BOX_PATH.exists():
        with open(DAILY_BOX_PATH) as f:
            data = json.load(f)
        if data.get("last_opened") == today:
            return {"error": "Already opened today", "next_reset": data.get("next_reset")}

    # Determine reward type (65% common, 35% rare)
    is_rare = random.random() < 0.35
    if is_rare:
        item = random.choice(RARE_ITEMS)
        rarity = "rare"
    else:
        item = random.choice(COMMON_ITEMS)
        rarity = "common"

    # Add to backpack
    backpack = load_backpack()
    if item not in backpack["items"]:
        backpack["items"].append(item)
    save_backpack(backpack)

    # Record daily box state
    import datetime
    tomorrow = datetime.datetime.now() + datetime.timedelta(days=1)
    with open(DAILY_BOX_PATH, "w") as f:
        json.dump({
            "last_opened": today,
            "next_reset": tomorrow.strftime("%Y-%m-%d 00:00 UTC"),
            "reward": item,
            "rarity": rarity
        }, f)

    return {
        "ok": True,
        "reward": item,
        "rarity": rarity,
        "message": f"You got a {rarity} item: {item}!"
    }


# --- Main ---

def run():
    print(f"🦞 ClawPet API running at http://localhost:{PORT}")
    print(f"   Install page: http://localhost:{PORT}/install")
    server = HTTPServer(("localhost", PORT), AgentPetHandler)
    server.serve_forever()


if __name__ == "__main__":
    run()
