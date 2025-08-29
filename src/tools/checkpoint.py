"""
Lightweight checkpointing utility.

Stores JSON-serializable snapshots under .checkpoints/{id}.json with metadata.
Intended for simple save/restore of developer agent state between fidelity iterations.
"""

import os
import json
import uuid
import time
from typing import Any, Dict, List, Optional

CHECKPOINT_DIR = ".checkpoints"

def _ensure_dir() -> None:
    os.makedirs(CHECKPOINT_DIR, exist_ok=True)

def save_checkpoint(payload: Any, metadata: Optional[Dict[str, Any]] = None) -> str:
    """
    Save a JSON-serializable payload with optional metadata.
    Returns the checkpoint id.
    """
    _ensure_dir()
    checkpoint_id = str(uuid.uuid4())
    ts = int(time.time())
    record = {
        "id": checkpoint_id,
        "created_at": ts,
        "metadata": metadata or {},
        "payload": payload,
    }
    path = os.path.join(CHECKPOINT_DIR, f"{checkpoint_id}.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(record, f, indent=2, ensure_ascii=False)
    return checkpoint_id

def load_checkpoint(checkpoint_id: str) -> Optional[Dict[str, Any]]:
    """
    Load and return the checkpoint record or None if missing.
    """
    path = os.path.join(CHECKPOINT_DIR, f"{checkpoint_id}.json")
    if not os.path.exists(path):
        return None
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def list_checkpoints() -> List[Dict[str, Any]]:
    """
    Return a list of checkpoint metadata records (id, created_at, metadata).
    """
    _ensure_dir()
    records: List[Dict[str, Any]] = []
    for fname in sorted(os.listdir(CHECKPOINT_DIR)):
        if not fname.endswith(".json"):
            continue
        path = os.path.join(CHECKPOINT_DIR, fname)
        try:
            with open(path, "r", encoding="utf-8") as f:
                rec = json.load(f)
            records.append({"id": rec.get("id"), "created_at": rec.get("created_at"), "metadata": rec.get("metadata", {})})
        except Exception:
            # ignore malformed checkpoint files
            continue
    return records

def delete_checkpoint(checkpoint_id: str) -> bool:
    path = os.path.join(CHECKPOINT_DIR, f"{checkpoint_id}.json")
    if os.path.exists(path):
        os.remove(path)
        return True
    return False
