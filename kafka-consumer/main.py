# [Task]: T026 [From]: specs/phase5-cloud/kafka-events/spec.md §FR-012–FR-015
# Standalone Kafka consumer service — subscribes to all 3 topics, manual offset commit.
# Fail strategy: malformed JSON → stderr + skip (commit); handler error → stderr + no commit (retry).

import asyncio
import json
import logging
import os
import sys
from collections.abc import Awaitable, Callable
from typing import Any

from aiokafka import AIOKafkaConsumer, TopicPartition
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)


def _topic(base: str) -> str:
    prefix = os.getenv("KAFKA_TOPIC_PREFIX", "")
    return f"{prefix}{base}"


async def consume_topic(
    topic: str,
    group_id: str,
    handler: Callable[[dict[str, Any]], Awaitable[None]],
) -> None:
    """
    Consume messages from a single topic with manual offset commit.

    - On successful handler: commit offset+1 (at-least-once delivery).
    - On JSON decode error: log to stderr, commit offset+1 (skip poison pill).
    - On handler exception: log to stderr, do NOT commit (message retried on restart).
    """
    bootstrap = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
    consumer = AIOKafkaConsumer(
        topic,
        bootstrap_servers=bootstrap,
        group_id=group_id,
        enable_auto_commit=False,
        auto_offset_reset="earliest",
        session_timeout_ms=30000,
        heartbeat_interval_ms=10000,
    )
    await consumer.start()
    try:
        async for msg in consumer:
            tp = TopicPartition(msg.topic, msg.partition)
            try:
                event = json.loads(msg.value.decode("utf-8"))
                await handler(event)
                await consumer.commit({tp: msg.offset + 1})
            except json.JSONDecodeError as exc:
                print(
                    f"[DLQ] malformed JSON | topic={msg.topic} | offset={msg.offset} | {exc}",
                    file=sys.stderr,
                )
                sys.stderr.flush()
                await consumer.commit({tp: msg.offset + 1})  # skip poison pill
            except Exception as exc:
                print(
                    f"[DLQ] handler error | topic={msg.topic} | offset={msg.offset} | {exc}",
                    file=sys.stderr,
                )
                sys.stderr.flush()
                # Do NOT commit — message will be retried on next restart
    finally:
        await consumer.stop()


async def main() -> None:
    """Start all 3 consumer tasks and run until cancelled."""
    from consumers.reminders import handle_reminder_event
    from consumers.task_events import handle_task_event
    from consumers.task_updates import handle_task_update

    logger.info("Kafka consumer service starting up")
    try:
        await asyncio.gather(
            asyncio.create_task(
                consume_topic(_topic("task-events"), "todo-task-events-group", handle_task_event)
            ),
            asyncio.create_task(
                consume_topic(_topic("reminders"), "todo-reminders-group", handle_reminder_event)
            ),
            asyncio.create_task(
                consume_topic(_topic("task-updates"), "todo-task-updates-group", handle_task_update)
            ),
        )
    except asyncio.CancelledError:
        logger.info("Consumer service shutdown requested — exiting cleanly")


if __name__ == "__main__":
    asyncio.run(main())
