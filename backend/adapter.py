"""
OpenClaw Adapter — reads agent state from OpenClaw session files.
"""

import json
import os
import time
from pathlib import Path

# OpenClaw stores sessions in ~/.openclaw/sessions/
OPENCLAW_DIR = Path.home() / ".openclaw"
SESSIONS_FILE = OPENCLAW_DIR / "sessions.json"

STATE_MAP = {
    # Tool call patterns → agent state
    "web_search": "searching",
    "web_fetch": "searching",
    "browser": "searching",
    "exec": "working",
    "write": "working",
    "edit": "working",
    "Read": "working",
    "image": "working",
    "tts": "working",
    "message": "working",
}

SLEEP_THRESHOLD_MIN = 30
IDLE_THRESHOLD_MIN = 5


class OpenClawAdapter:
    def __init__(self, config: dict):
        self.config = config
        self._cache = {}
        self._cache_ts = 0

    def _load_sessions(self) -> dict:
        now = time.time()
        if now - self._cache_ts < 2:
            return self._cache
        try:
            if SESSIONS_FILE.exists():
                with open(SESSIONS_FILE) as f:
                    self._cache = json.load(f)
                self._cache_ts = now
        except Exception:
            pass
        return self._cache

    def _infer_state(self, session: dict) -> str:
        last_active = session.get("lastActiveMs", 0) / 1000
        elapsed_min = (time.time() - last_active) / 60

        if elapsed_min > SLEEP_THRESHOLD_MIN:
            return "sleeping"
        if elapsed_min > IDLE_THRESHOLD_MIN:
            return "idle"

        # Check last tool call
        last_tool = session.get("lastToolCall", "")
        if last_tool:
            for pattern, state in STATE_MAP.items():
                if pattern in last_tool:
                    return state

        if session.get("waitingForUser"):
            return "waiting"
        if session.get("isThinking"):
            return "thinking"
        if session.get("isActive"):
            return "working"

        return "idle"

    def _session_to_status(self, session_key: str, session: dict) -> dict:
        agent_id = session.get("agentId", session_key)
        state = self._infer_state(session)
        tokens = session.get("tokensUsed", 0)
        last_message = session.get("lastUserMessage", "")

        return {
            "agent_id": agent_id,
            "session_key": session_key,
            "display_name": session.get("label", agent_id),
            "state": state,
            "task": session.get("currentTask") or (last_message[:60] if last_message else None),
            "tokens_used": tokens,
            "total_tokens_ever": session.get("totalTokensEver", tokens),
            "updated_at": session.get("lastActiveMs", 0) / 1000,
        }

    def get_status(self, agent_id: str = "main") -> dict:
        sessions = self._load_sessions()
        for key, session in sessions.items():
            if session.get("agentId") == agent_id or key == agent_id:
                return self._session_to_status(key, session)
        # Fallback: return idle state
        return {
            "agent_id": agent_id,
            "state": "idle",
            "task": None,
            "tokens_used": 0,
            "total_tokens_ever": 0,
            "updated_at": time.time(),
        }

    def get_all_status(self) -> list:
        sessions = self._load_sessions()
        results = []
        for key, session in sessions.items():
            # Skip internal/system sessions
            if session.get("kind") in ("heartbeat", "internal"):
                continue
            results.append(self._session_to_status(key, session))
        return results if results else [self.get_status("main")]

    def get_total_tokens(self) -> int:
        sessions = self._load_sessions()
        total = 0
        for session in sessions.values():
            total += session.get("totalTokensEver", session.get("tokensUsed", 0))
        return total
