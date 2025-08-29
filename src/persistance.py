import json
import os
import asyncio
import functools
from contextlib import contextmanager
from typing import Any, Dict, List, Optional, Tuple

from langgraph.checkpoint.base import BaseCheckpointSaver, Checkpoint, CheckpointTuple
from langgraph.checkpoint.serde.jsonplus import JsonPlusSerializer

class FileCheckpointer(BaseCheckpointSaver):
    def __init__(self, storage_dir: str = ".checkpoints/langgraph"):
        self.storage_dir = storage_dir
        self.serde = JsonPlusSerializer()
        os.makedirs(self.storage_dir, exist_ok=True)

    @contextmanager
    def _get_thread_dir(self, thread_id: str) -> str:
        thread_dir = os.path.join(self.storage_dir, thread_id)
        os.makedirs(thread_dir, exist_ok=True)
        yield thread_dir

    def get_tuple(self, config: Dict[str, Any]) -> Optional[CheckpointTuple]:
        thread_id = config["configurable"]["thread_id"]
        checkpoint_id = config["configurable"].get("checkpoint_id")

        if checkpoint_id:
            return self._read_checkpoint(thread_id, checkpoint_id)
        else:
            return self._get_latest_checkpoint(thread_id)

    def _read_checkpoint(self, thread_id: str, checkpoint_id: str) -> Optional[CheckpointTuple]:
        with self._get_thread_dir(thread_id) as thread_dir:
            checkpoint_path = os.path.join(thread_dir, f"{checkpoint_id}.json")
            if not os.path.exists(checkpoint_path):
                return None
            with open(checkpoint_path, 'r') as f:
                checkpoint_data = json.load(f)
                return CheckpointTuple(
                    config=checkpoint_data["config"],
                    checkpoint=self.serde.loads(checkpoint_data["checkpoint"]),
                    parent_config=checkpoint_data.get("parent_config"),
                )

    def _get_latest_checkpoint(self, thread_id: str) -> Optional[CheckpointTuple]:
        with self._get_thread_dir(thread_id) as thread_dir:
            checkpoints = self.list(thread_id)
            if not checkpoints:
                return None
            # Checkpoints are sorted by timestamp, so the first one is the latest
            return checkpoints[0]

    def list(self, thread_id: str) -> List[CheckpointTuple]:
        with self._get_thread_dir(thread_id) as thread_dir:
            checkpoint_files = [f for f in os.listdir(thread_dir) if f.endswith('.json')]
            checkpoints = []
            for filename in checkpoint_files:
                checkpoint_id = filename[:-5]
                checkpoint = self._read_checkpoint(thread_id, checkpoint_id)
                if checkpoint:
                    checkpoints.append(checkpoint)
            # Sort by timestamp in descending order (latest first)
            checkpoints.sort(key=lambda c: c.checkpoint['ts'], reverse=True)
            return checkpoints

    def put(self, config: Dict[str, Any], checkpoint: Checkpoint) -> Dict[str, Any]:
        thread_id = config["configurable"]["thread_id"]
        checkpoint_id = checkpoint["id"]
        with self._get_thread_dir(thread_id) as thread_dir:
            checkpoint_path = os.path.join(thread_dir, f"{checkpoint_id}.json")
            parent_config = config['configurable'].get('checkpoint_id')

            checkpoint_data = {
                "config": config,
                "checkpoint": self.serde.dumps(checkpoint),
                "parent_config": parent_config,
            }

            with open(checkpoint_path, 'w') as f:
                json.dump(checkpoint_data, f, indent=2)

            return {
                "configurable": {
                    "thread_id": thread_id,
                    "checkpoint_id": checkpoint_id,
                }
            }

    # --- Async methods ---
    async def aget_tuple(self, config: Dict[str, Any]) -> Optional[CheckpointTuple]:
        return await asyncio.get_running_loop().run_in_executor(
            None, functools.partial(self.get_tuple, config)
        )

    async def alist(self, thread_id: str) -> List[CheckpointTuple]:
        return await asyncio.get_running_loop().run_in_executor(
            None, functools.partial(self.list, thread_id)
        )

    async def aput(self, config: Dict[str, Any], checkpoint: Checkpoint) -> Dict[str, Any]:
        return await asyncio.get_running_loop().run_in_executor(
            None, functools.partial(self.put, config, checkpoint)
        )
