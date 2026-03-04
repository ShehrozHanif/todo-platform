# [Task]: T005 [From]: specs/phase5-cloud/kafka-events/spec.md §FR-016 §FR-017
# RED tests for Kafka topic creation via AIOKafkaAdminClient.

from unittest.mock import AsyncMock, MagicMock, patch, call

import pytest


@pytest.fixture
def mock_admin_client():
    """AsyncMock for AIOKafkaAdminClient."""
    client = AsyncMock()
    client.start = AsyncMock()
    client.close = AsyncMock()
    client.list_topics = AsyncMock(return_value=set())
    client.create_topics = AsyncMock()
    return client


@pytest.mark.asyncio
async def test_create_topics_starts_admin_client(mock_admin_client) -> None:
    """Admin client must be started before any API call."""
    from kafka.topics import create_topics

    with patch("kafka.topics.AIOKafkaAdminClient", return_value=mock_admin_client):
        await create_topics("localhost:9092")

    mock_admin_client.start.assert_awaited_once()


@pytest.mark.asyncio
async def test_create_topics_creates_three_topics(mock_admin_client) -> None:
    from kafka.topics import create_topics

    with patch("kafka.topics.AIOKafkaAdminClient", return_value=mock_admin_client):
        await create_topics("localhost:9092")

    # create_topics called once per new topic (list_topics returns empty set)
    assert mock_admin_client.create_topics.await_count == 3


@pytest.mark.asyncio
async def test_create_topics_correct_names(mock_admin_client) -> None:
    from kafka.topics import create_topics
    from aiokafka.admin import NewTopic

    with patch("kafka.topics.AIOKafkaAdminClient", return_value=mock_admin_client):
        await create_topics("localhost:9092")

    all_args = [call_args[0][0] for call_args in mock_admin_client.create_topics.call_args_list]
    topic_names = [t.name for topics_list in all_args for t in topics_list]

    assert "task-events" in topic_names
    assert "reminders" in topic_names
    assert "task-updates" in topic_names


@pytest.mark.asyncio
async def test_create_topics_correct_retention(mock_admin_client) -> None:
    from kafka.topics import create_topics

    with patch("kafka.topics.AIOKafkaAdminClient", return_value=mock_admin_client):
        await create_topics("localhost:9092")

    all_args = [call_args[0][0] for call_args in mock_admin_client.create_topics.call_args_list]
    topics_flat = [t for topics_list in all_args for t in topics_list]
    retention_by_name = {t.name: t.topic_configs.get("retention.ms") for t in topics_flat}

    assert retention_by_name["task-events"] == "604800000"    # 7 days
    assert retention_by_name["reminders"] == "86400000"       # 24 hours
    assert retention_by_name["task-updates"] == "3600000"     # 1 hour


@pytest.mark.asyncio
async def test_create_topics_three_partitions(mock_admin_client) -> None:
    from kafka.topics import create_topics

    with patch("kafka.topics.AIOKafkaAdminClient", return_value=mock_admin_client):
        await create_topics("localhost:9092")

    all_args = [call_args[0][0] for call_args in mock_admin_client.create_topics.call_args_list]
    topics_flat = [t for topics_list in all_args for t in topics_list]
    for topic in topics_flat:
        assert topic.num_partitions == 3


@pytest.mark.asyncio
async def test_create_topics_skips_existing(mock_admin_client) -> None:
    """Topics that already exist are silently skipped."""
    from kafka.topics import create_topics
    from aiokafka.errors import TopicAlreadyExistsError

    mock_admin_client.list_topics = AsyncMock(return_value={"task-events", "reminders", "task-updates"})

    with patch("kafka.topics.AIOKafkaAdminClient", return_value=mock_admin_client):
        await create_topics("localhost:9092")

    # All topics already exist — create_topics should not be called
    mock_admin_client.create_topics.assert_not_awaited()


@pytest.mark.asyncio
async def test_create_topics_closes_admin_in_finally(mock_admin_client) -> None:
    """close() must be called even if create_topics raises."""
    from kafka.topics import create_topics

    mock_admin_client.create_topics = AsyncMock(side_effect=Exception("broker error"))

    with patch("kafka.topics.AIOKafkaAdminClient", return_value=mock_admin_client):
        # Should not raise — errors are caught internally
        try:
            await create_topics("localhost:9092")
        except Exception:
            pass

    mock_admin_client.close.assert_awaited()


@pytest.mark.asyncio
async def test_create_topics_with_prefix(mock_admin_client) -> None:
    """Topic names are prefixed when KAFKA_TOPIC_PREFIX is set."""
    import os
    from kafka.topics import create_topics

    with patch.dict(os.environ, {"KAFKA_TOPIC_PREFIX": "test-"}):
        with patch("kafka.topics.AIOKafkaAdminClient", return_value=mock_admin_client):
            await create_topics("localhost:9092")

    all_args = [call_args[0][0] for call_args in mock_admin_client.create_topics.call_args_list]
    topic_names = [t.name for topics_list in all_args for t in topics_list]

    assert "test-task-events" in topic_names
    assert "test-reminders" in topic_names
    assert "test-task-updates" in topic_names
