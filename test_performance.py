from src.performance import PerformanceTracker
from src.logger import logger

logger.info("Starting performance tracker test.")
tracker = PerformanceTracker("test_performance.yaml")
tracker.record_performance("test_agent", 1.23)
tracker.save()
logger.info("Performance tracker test finished.")
