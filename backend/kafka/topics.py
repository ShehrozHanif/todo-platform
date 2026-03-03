# [Task]: T007 [From]: specs/phase5-cloud/kafka-events/spec.md §FR-016 §FR-017
# Topic provisioning — creates the 3 Kafka topics at service startup.
# Uses AIOKafkaAdminClient; idempotent (TopicAlreadyExistsError silently ignored).

import logging
import os

from aiokafka.admin import AIOKafkaAdminClient, NewTopic
from aiokafka.errors import TopicAlreadyExistsError

logger = logging.getLogger(__name__)

# Retention values in milliseconds (strings required by Kafka protocol)
_RETENTION_7D = "604800000"   # 7 days
_RETENTION_24H = "86400000"   # 24 hours
_RETENTION_1H = "3600000"     # 1 hour


def _topic_name(base: str) -> str:
    prefix = os.getenv("KAFKA_TOPIC_PREFIX", "")
    return f"{prefix}{base}"


def _build_topics() -> list[NewTopic]:
    return [
        NewTopic(
            name=_topic_name("task-events"),
            num_partitions=3,
            replication_factor=1,
            topic_configs={"retention.ms": _RETENTION_7D, "cleanup.policy": "delete"},
        ),
        NewTopic(
            name=_topic_name("reminders"),
            num_partitions=3,
            replication_factor=1,
            topic_configs={"retention.ms": _RETENTION_24H, "cleanup.policy": "delete"},
        ),
        NewTopic(
            name=_topic_name("task-updates"),
            num_partitions=3,
            replication_factor=1,
            topic_configs={"retention.ms": _RETENTION_1H, "cleanup.policy": "delete"},
        ),
    ]


async def create_topics(bootstrap_servers: str) -> None:
    """
    Create the 3 required Kafka topics if they do not exist (FR-016, FR-017).
    Idempotent: TopicAlreadyExistsError is silently ignored per topic.
    AIOKafkaAdminClient.start() MUST be called before any API call.
    """
    admin = AIOKafkaAdminClient(bootstrap_servers=bootstrap_servers)
    await admin.start()  # required — negotiates protocol version with broker
    try:
        existing: set[str] = set(await admin.list_topics())
        for topic in _build_topics():
            if topic.name in existing:
                logger.debug("Kafka topic already exists (ok): %s", topic.name)
                continue
            try:
                await admin.create_topics([topic])
                logger.info("Created Kafka topic: %s", topic.name)
            except TopicAlreadyExistsError:
                logger.debug("Kafka topic already exists (race): %s", topic.name)
            except Exception as exc:
                logger.error("Failed to create topic %s: %s", topic.name, exc)
    finally:
        await admin.close()
