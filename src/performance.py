import yaml
import os
from collections import defaultdict

PERFORMANCE_FILE = "performance.yaml"

class PerformanceTracker:
    def __init__(self, persistence_file=PERFORMANCE_FILE):
        self.persistence_file = persistence_file
        self.performance_data = self._load_performance_data()

    def _load_performance_data(self):
        if os.path.exists(self.persistence_file):
            with open(self.persistence_file, 'r') as f:
                return yaml.safe_load(f) or {}
        return {}

    def _save_performance_data(self):
        with open(self.persistence_file, 'w') as f:
            yaml.dump(self.performance_data, f, default_flow_style=False)

    def record_performance(self, agent_name: str, duration: float):
        if agent_name not in self.performance_data:
            self.performance_data[agent_name] = []
        self.performance_data[agent_name].append(duration)

    def get_report(self):
        return self.performance_data

    def save(self):
        self._save_performance_data()
