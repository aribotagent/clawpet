"""
Evolution Tracker — manages lobster evolution stages based on DAILY token consumption.
Token counting starts from when the skill is first installed.
"""

import json
import time
from pathlib import Path
from datetime import datetime, timedelta

STAGES = [
    {"id": "shrimp",       "name": "🦐 shrimp",       "tokens": 0,        "sprite": "shrimp"},
    {"id": "aquarex",      "name": "🌊 Aquarex",      "tokens": 50_000,    "sprite": "aquarex"},
    {"id": "crimbolt",     "name": "🔥 Crimbolt",     "tokens": 200_000,   "sprite": "crimbolt"},
    {"id": "emberclaw",    "name": "⚔️ Emberclaw",    "tokens": 500_000,   "sprite": "emberclaw"},
    {"id": "nebulacrab",   "name": "🌌 Nebulacrab",   "tokens": 2_000_000, "sprite": "nebulacrab"},
]


class EvolutionTracker:
    def __init__(self, data_path: Path):
        self.data_path = data_path
        self._ensure_initialized()

    def _ensure_initialized(self):
        """Initialize data file if it doesn't exist (first install)"""
        if not self.data_path.exists():
            data = {
                "installed_at": datetime.utcnow().isoformat() + "Z",
                "daily_tokens": 0,
                "last_reset": datetime.utcnow().strftime("%Y-%m-%d"),
                "unlocked_stages": ["shrimp"],
                "equipped_stage": "shrimp"
            }
            with open(self.data_path, "w") as f:
                json.dump(data, f, indent=2)

    def _load(self) -> dict:
        with open(self.data_path) as f:
            return json.load(f)

    def _save(self, data: dict):
        with open(self.data_path, "w") as f:
            json.dump(data, f, indent=2)

    def _check_daily_reset(self, data: dict):
        """Reset daily tokens if it's a new day (UTC)"""
        today = datetime.utcnow().strftime("%Y-%m-%d")
        if data.get("last_reset") != today:
            data["daily_tokens"] = 0
            data["last_reset"] = today
            self._save(data)

    def add_tokens(self, tokens: int):
        """Add tokens to daily count"""
        data = self._load()
        self._check_daily_reset(data)
        data["daily_tokens"] = data.get("daily_tokens", 0) + tokens
        self._save(data)

    def get_daily_tokens(self) -> int:
        """Get current daily token count"""
        data = self._load()
        self._check_daily_reset(data)
        return data.get("daily_tokens", 0)

    def get_current_stage(self, daily_tokens: int) -> dict:
        current = STAGES[0]
        for stage in STAGES:
            if daily_tokens >= stage["tokens"]:
                current = stage
        return current

    def get_next_stage(self, daily_tokens: int) -> dict:
        for i, stage in enumerate(STAGES):
            if daily_tokens < stage["tokens"]:
                return stage
        return None

    def get_status(self, current_tokens: int = None) -> dict:
        """
        Get evolution status.
        current_tokens: optional token count from this session to add to daily total
        """
        data = self._load()
        
        # Add session tokens to daily count if provided
        if current_tokens and current_tokens > 0:
            self.add_tokens(current_tokens)
        
        self._check_daily_reset(data)
        daily_tokens = data.get("daily_tokens", 0)
        
        current = self.get_current_stage(daily_tokens)
        next_stage = self.get_next_stage(daily_tokens)

        # Check for new unlocks
        newly_unlocked = []
        for stage in STAGES:
            if daily_tokens >= stage["tokens"] and stage["id"] not in data["unlocked_stages"]:
                data["unlocked_stages"].append(stage["id"])
                newly_unlocked.append(stage)

        if newly_unlocked:
            data["equipped_stage"] = current["id"]
            self._save(data)

        # Progress to next stage
        if next_stage:
            prev_tokens = current["tokens"]
            progress = (daily_tokens - prev_tokens) / (next_stage["tokens"] - prev_tokens)
            progress = min(1.0, max(0.0, progress))
        else:
            progress = 1.0

        return {
            "daily_tokens": daily_tokens,
            "installed_at": data.get("installed_at"),
            "current_stage": current,
            "next_stage": next_stage,
            "progress": round(progress, 4),
            "unlocked_stages": data["unlocked_stages"],
            "equipped_stage": data.get("equipped_stage", current["id"]),
            "newly_unlocked": [s["name"] for s in newly_unlocked],
        }
