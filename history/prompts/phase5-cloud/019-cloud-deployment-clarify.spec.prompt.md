---
id: "019"
title: cloud-deployment-spec-clarification-5-answers
stage: spec
date: 2026-03-04
surface: agent
model: claude-sonnet-4-6
feature: cloud-deployment
branch: 003-cloud-deployment
user: Shehroz Hanif
command: /sp.clarify
labels: ["cloud-deployment","clarify","ingress","ghcr","mcp-server","dapr","helm-timeout"]
links:
  spec: specs/phase5-cloud/cloud-deployment/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - specs/phase5-cloud/cloud-deployment/spec.md
tests:
  - none (clarification phase)
---

## Prompt

/sp.clarify

## Response snapshot

Ran structured ambiguity scan across 10 taxonomy categories. Found 4 partial categories:
- Integration & External Dependencies (registry visibility, Ingress mechanism)
- Functional Scope (MCP server inclusion)
- Constraints & Tradeoffs (Helm timeout, frontend Dapr)

Asked and recorded 5 questions (quota reached):

**Q1**: How should NGINX Ingress be delivered? → **A: Standalone `cloud/k8s/ingress.yaml`** (not Helm template; base charts untouched)
- Spec updated: FR-002 now specifies standalone manifest; Assumptions updated

**Q2**: Should ghcr.io images be public or private? → **A: Public** (no imagePullSecrets needed)
- Spec updated: FR-007 specifies public packages, anonymous K8s pull

**Q3**: Should MCP server be deployed to cloud? → **A: Yes** (AI chatbot accessible at public URL)
- Spec updated: FR-001 now lists MCP server explicitly alongside frontend + backend

**Q4**: What Helm timeout for `--atomic`? → **A: 10 minutes for all deploys** (covers Kafka cold-start; simpler than conditional)
- Spec updated: FR-010 specifies 10-minute timeout

**Q5**: Should frontend pods have Dapr sidecar? → **A: Backend only** (`frontend.dapr.enabled: false`; saves 256Mi RAM)
- Spec updated: FR-005 explicitly restricts Dapr to backend pods

Sections touched: Clarifications (new), FR-001, FR-002, FR-005, FR-007, FR-010, Assumptions

## Outcome

- ✅ Impact: 5 critical ambiguities resolved; spec now unambiguous for /sp.implement; resolves CRITICAL C1 from /sp.analyze
- 🧪 Tests: N/A (clarification phase)
- 📁 Files: specs/phase5-cloud/cloud-deployment/spec.md updated; committed
- 🔁 Next prompts: Update tasks.md to reflect Q1 (add Ingress task), Q3 (MCP server in cloud values), Q4 (10m timeout), Q5 (frontend dapr=false) → then /sp.implement
- 🧠 Reflection: Q1 (Ingress delivery) was the highest-impact clarification — resolves CRITICAL G1 gap from /sp.analyze; Q3 (MCP server) was a genuine spec gap that would have caused partial deployment

## Evaluation notes (flywheel)

- Failure modes observed: /sp.clarify was not run before /sp.plan — this created G1 (Ingress gap) and Q3 (MCP server omission) that had to be caught at /sp.analyze; running clarify earlier would have prevented these
- Graders run and results (PASS/FAIL): N/A
- Prompt variant (if applicable): N/A
- Next experiment (smallest change to try): Always run /sp.clarify immediately after /sp.specify before starting /sp.plan
