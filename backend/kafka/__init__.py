# [Task]: T014 [From]: specs/phase5-cloud/kafka-events/spec.md
# Public exports for the kafka package.

from kafka.producer import (
    init_producer,
    publish_reminder_if_needed,
    publish_task_event,
    shutdown_producer,
)
from kafka.topics import create_topics

__all__ = [
    "init_producer",
    "shutdown_producer",
    "publish_task_event",
    "publish_reminder_if_needed",
    "create_topics",
]
