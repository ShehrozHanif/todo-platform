---
id: 008
title: Dapr State Secrets Service Invocation Research
stage: general
date: 2026-03-04
surface: agent
model: claude-sonnet-4-6
feature: dapr-integration
branch: master
user: Shehroz Hanif
command: research dapr state store, secrets, service invocation for FastAPI Python 3.13
labels: ["dapr","state-store","secrets","service-invocation","redis","python-sdk","fastapi","phase5"]
links:
  spec: specs/phase5-cloud/dapr-integration/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - history/prompts/phase5-cloud/008-dapr-state-secrets-invocation-research.general.prompt.md
tests:
  - none
---

## Prompt

Research the following for a FastAPI (Python 3.13) backend integrating Dapr 1.14+:

1. **Dapr State Store (Python SDK)**:
   - How to save/get/delete state using `DaprClient().save_state()`, `get_state()`, `delete_state()` in async FastAPI
   - Redis component YAML for local dev and Kubernetes (component name, spec fields)
   - State key naming conventions (prefix with app-id?)
   - TTL support: how to set expiry on a state entry (metadata field `ttlInSeconds`)
   - Concurrent write handling: ETags or last-write-wins for cache invalidation on writes

2. **Dapr Secrets (Kubernetes secret store)**:
   - Kubernetes secret store component YAML (`secretstores.kubernetes`)
   - How to read a secret: `DaprClient().get_secret(store_name, secret_name)`
   - How to inject secrets at startup into FastAPI's config (replacing os.getenv)
   - What happens if secret store is unavailable: error type, retry behavior

3. **Dapr Service Invocation (Python SDK + sidecar)**:
   - How the frontend (Next.js) or another service calls backend via Dapr: HTTP via sidecar port 3500, path format `/v1.0/invoke/{app-id}/method/{path}`
   - App ID configuration: `dapr.io/app-id` annotation on K8s pod
   - How FastAPI receives invoked requests (same HTTP endpoints, no changes needed)
   - Helm annotation to enable sidecar injection: `dapr.io/enabled: "true"`

Return concise findings with YAML snippets and Python code examples. Note Dapr 1.14 specific behaviors.

## Response snapshot

Comprehensive research findings covering all three areas with YAML snippets, Python code examples, key naming conventions, ETag concurrency patterns, secret injection patterns, and sidecar invocation details. Full findings documented in the main response above this PHR.

## Outcome

- Impact: Research foundation established for Dapr integration implementation in phase5-cloud/dapr-integration. All three building blocks (state, secrets, service invocation) are documented with actionable code examples.
- Tests: none — this is a research/planning prompt
- Files: history/prompts/phase5-cloud/008-dapr-state-secrets-invocation-research.general.prompt.md
- Next prompts: /sp.plan dapr-integration (architecture plan using these findings), then /sp.tasks dapr-integration
- Reflection: Dapr 1.14 Python SDK uses synchronous DaprClient by default; async variant is dapr.aio.clients.DaprClient. TTL is passed as string metadata. ETag-based first-write-wins requires retry loop. Secret store unavailability raises grpc StatusCode.UNAVAILABLE — configure RetryPolicy on DaprClient init.

## Evaluation notes (flywheel)

- Failure modes observed: none
- Graders run and results (PASS/FAIL): n/a
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): Implement state store wrapper class in backend/dapr_state.py using findings
