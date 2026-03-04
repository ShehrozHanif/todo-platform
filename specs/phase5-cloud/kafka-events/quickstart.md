# Quickstart: Kafka Event Streaming (Local Development)

**Branch**: `001-kafka-events` | **Date**: 2026-03-03

---

## Prerequisites

- Docker + Docker Compose installed
- Existing `todo-platform` backend running (or to be started alongside Kafka)

---

## Step 1: Start Kafka (KRaft mode)

```bash
# From repo root
docker compose -f cloud/kafka/docker-compose.kafka.yml up -d

# Verify Kafka is ready (wait up to 60 seconds)
docker compose -f cloud/kafka/docker-compose.kafka.yml ps
# Expected: kafka service shows "healthy"
```

Kafka will be reachable at `localhost:9092` from host machine and `kafka:9092` from other Docker containers.

---

## Step 2: Configure Backend

Add to `backend/.env`:

```env
KAFKA_BOOTSTRAP_SERVERS=localhost:9092
KAFKA_TOPIC_PREFIX=
```

Topics are **auto-created** at backend startup — no manual setup needed.

---

## Step 3: Start Backend

```bash
cd backend
uv run uvicorn main:app --reload --port 8000
```

On startup, the backend will:
1. Create DB tables + run migrations
2. Create 3 Kafka topics (if not exist): `task-events`, `reminders`, `task-updates`
3. Start AIOKafkaProducer

Look for in logs:
```
INFO: Kafka topics created: task-events, reminders, task-updates
INFO: Kafka producer started
```

If Kafka is unavailable, you'll see a warning but the app starts normally:
```
WARNING: Kafka unavailable — events will not be published
```

---

## Step 4: Start Consumer Service

```bash
# In a separate terminal
cd kafka-consumer
uv run python main.py
```

Or via Docker Compose (includes consumer):
```bash
docker compose -f cloud/kafka/docker-compose.kafka.yml --profile consumer up -d
```

---

## Step 5: Verify Events Flow

```bash
# Create a task via API (or the web UI)
curl -X POST http://localhost:8000/api/{user_id}/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"title": "Test Kafka", "priority": "high", "due_date": "2026-03-04"}'
```

**Check consumer logs** — you should see:
```
[task-events] task.created | task_id=1 | user_id=user_xxx | ts=2026-03-03T12:00:00Z
[reminders] REMINDER | task_id=1 | user=user_xxx | title="Test Kafka" | due=2026-03-04
[task-updates] sync | task_id=1 | event=task.created | user_id=user_xxx
```

**Verify via Kafka CLI** (optional):
```bash
docker exec -it todo-kafka \
  kafka-console-consumer.sh \
  --bootstrap-server localhost:9092 \
  --topic task-events \
  --from-beginning \
  --max-messages 5
```

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Backend starts but no events | Check `KAFKA_BOOTSTRAP_SERVERS` in `.env` matches Docker Compose port |
| Consumer crashes on start | Ensure Kafka is healthy before starting consumer |
| Topics not created | Backend failed silently — check logs for `Kafka topic creation failed` |
| `NoBrokersAvailable` | Kafka not yet ready; wait 10–15s after `docker compose up` |

---

## Tear Down

```bash
docker compose -f cloud/kafka/docker-compose.kafka.yml down -v
# -v removes Kafka data volume (events are lost)
```
