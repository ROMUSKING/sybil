import logging
import json
import sys

class JsonFormatter(logging.Formatter):
    """Formats log records as JSON."""
    def format(self, record):
        log_record = {
            "timestamp": self.formatTime(record, self.datefmt),
            "level": record.levelname,
            "message": record.getMessage(),
        }
        if hasattr(record, 'extra_data'):
            log_record.update(record.extra_data)
        return json.dumps(log_record)

def setup_logger():
    """Sets up a structured JSON logger."""
    logger = logging.getLogger("sybil")
    logger.setLevel(logging.INFO)

    # Prevent duplicate logs if the logger is already configured
    if logger.hasHandlers():
        logger.handlers.clear()

    handler = logging.StreamHandler(sys.stdout)
    formatter = JsonFormatter()
    handler.setFormatter(formatter)
    logger.addHandler(handler)

    return logger

# Create a global logger instance for easy import
logger = setup_logger()
