# Phase IV: Local K8s Deployment (250 pts)

## Hierarchy per AGENTS.md

Phase IV has 2 features, executed in strict order:

Feature 1: Containerization   (specs/phase4-k8s/containerization/)
Feature 2: Helm Deployment    (specs/phase4-k8s/helm-deployment/)

Each feature follows the full SDD cascade:
  /sp.specify → /sp.clarify → /sp.plan → /sp.tasks → /sp.analyze → /sp.checklist → /sp.implement → /sp.git.commit_pr

---

## Feature 1: Containerization

**What we build:**
- Dockerfile for backend — Python 3.13+ FastAPI app with UV, multi-stage build (slim image)
- Dockerfile for frontend — Next.js 16 app with standalone output, multi-stage build
- Docker Compose — docker-compose.yml that orchestrates both services + environment variables
- Gordon — Docker's AI assistant for optimizing Dockerfiles (bonus tooling)

**Key decisions we'll need to make:**
- Base images (python:3.13-slim vs alpine, node:22-alpine vs slim)
- Multi-stage builds (builder → runner) to minimize image size
- How to handle env vars (.env files vs Compose env section)
- Port mapping (backend:8000, frontend:3000)
- Whether to include MCP server as a third container
- Health checks in containers

**Dependencies:** Both services connect to external Neon DB + OpenAI API, so containers don't need a local Postgres.

---

## Feature 2: Helm Deployment

**What we build:**
- Helm chart for backend (Deployment, Service, ConfigMap/Secret, HPA)
- Helm chart for frontend (Deployment, Service, Ingress)
- Minikube deployment — local K8s cluster running both services
- kubectl-ai — AI-powered kubectl for debugging/querying the cluster
- kagent — Kubernetes agent for cluster management

**Key decisions we'll need to make:**
- Chart structure (one umbrella chart vs separate charts per service)
- Service types (ClusterIP + Ingress vs NodePort for local dev)
- Resource limits (CPU/memory requests and limits)
- ConfigMap vs Secrets for env vars
- Ingress controller (nginx-ingress on Minikube)
- Liveness/readiness probes endpoints

---

## Execution Order (strict)

### Step 0: Build Cloud-Native Blueprint Skills FIRST (Bonus +200 pts)

**Strategy:** Build the Agent Skills first, then USE them to generate Feature 1 & 2 artifacts.
This earns the bonus AND accelerates core work — the skills become the tools we use.

0a. Create `docker-blueprint` skill (.claude/skills/docker-blueprint/)
    → Generates Dockerfile + docker-compose.yml from a service spec
    → Inputs: runtime, framework, port, env vars, multi-stage options
    → Outputs: production-ready Dockerfile + Compose file

0b. Create `helm-blueprint` skill (.claude/skills/helm-blueprint/)
    → Generates Helm chart (Chart.yaml, values.yaml, templates/) from a deployment spec
    → Inputs: service name, image, port, replicas, env vars, ingress config
    → Outputs: complete Helm chart directory

0c. Create `k8s-manifest-generator` skill (.claude/skills/k8s-manifest-generator/)
    → Generates raw K8s YAML manifests (Deployment, Service, ConfigMap, Ingress)
    → For cases where Helm is overkill or for quick debugging

### Step 1: Create folder structure

```
specs/phase4-k8s/containerization/  (spec.md, plan.md, tasks.md)
specs/phase4-k8s/helm-deployment/   (spec.md, plan.md, tasks.md)
k8s/                                (output artifacts)
```

### Step 2: Feature 1 — Containerization (full SDD cycle)

Uses `docker-blueprint` skill to generate initial Dockerfiles + Compose.

a. /sp.specify  → Write spec for Dockerfiles + Compose
b. /sp.clarify  → Identify gaps (base images, MCP container, env handling)
c. /sp.plan     → Architecture (multi-stage builds, image sizes, ports)
d. /sp.tasks    → Atomic tasks (Dockerfile-backend, Dockerfile-frontend, compose, test)
e. /sp.analyze  → Verify alignment
f. /sp.checklist → Validation checklist
g. /sp.implement → Invoke docker-blueprint skill, refine with Gordon, test locally
h. /sp.git.commit_pr → Commit

### Step 3: Feature 2 — Helm Deployment (full SDD cycle)

Uses `helm-blueprint` skill to generate initial Helm charts.

a. /sp.specify  → Write spec for Helm charts + Minikube
b. /sp.clarify  → Gaps (chart values, ingress, secrets)
c. /sp.plan     → Architecture (chart structure, service topology)
d. /sp.tasks    → Atomic tasks (chart-backend, chart-frontend, deploy, verify)
e. /sp.analyze  → Verify alignment
f. /sp.checklist → Validation checklist
g. /sp.implement → Invoke helm-blueprint skill, deploy with kubectl-ai/kagent
h. /sp.git.commit_pr → Commit

---

## What You'll Need on Your Machine

- Docker Desktop (with Docker Compose)
- Minikube + kubectl (for local K8s)
- Helm CLI (for chart management)
- Optionally: kubectl-ai, kagent

---

## Deliverables (per AGENTS.md)

```
k8s/
├── backend/
│   └── Dockerfile
├── frontend/
│   └── Dockerfile
├── docker-compose.yml
└── helm/
    ├── backend/
    │   ├── Chart.yaml
    │   ├── values.yaml
    │   └── templates/
    └── frontend/
        ├── Chart.yaml
        ├── values.yaml
        └── templates/
```

---

## AIOps Tools (Required by Hackathon Spec)

These are **core requirements**, not optional:

| Tool | Purpose | When to Use |
|------|---------|-------------|
| **Gordon** (Docker AI Agent) | AI-assisted Docker operations — optimize Dockerfiles, debug builds | Feature 1: `docker ai "optimize this Dockerfile"` |
| **kubectl-ai** | AI-assisted K8s operations — deploy, scale, debug pods | Feature 2: `kubectl-ai "deploy the todo frontend with 2 replicas"` |
| **kagent** | Cluster health analysis, resource optimization | Feature 2: `kagent "analyze the cluster health"` |

**Setup:**
- Gordon: Docker Desktop 4.53+ → Settings > Beta features → toggle on
- kubectl-ai: https://github.com/GoogleCloudPlatform/kubectl-ai
- kagent: https://github.com/kagent-dev/kagent

*Note: If Gordon is unavailable in your region or tier, use standard Docker CLI or Claude Code to generate commands.*

---

## Bonus Feature: Cloud-Native Blueprints (+200 pts)

**What:** Create reusable **Agent Skills** (in `.claude/skills/`) that auto-generate Dockerfiles, Helm charts, and K8s manifests from specs — SDD-powered infrastructure-as-code templates.

**Why:** Instead of manually writing Dockerfiles/Helm charts each time, create skills that any agent can invoke to generate them from a spec. This is the "Cloud-Native Blueprints via Agent Skills" bonus from the hackathon.

**When to build:** FIRST — before Features 1 & 2. Build the skills, then use them to generate the actual artifacts. This earns the bonus AND the skills accelerate the core work.

**Skills to create:**
- [x] `docker-blueprint` skill — generates Dockerfile + Compose from a service spec (SKILL.md + references + assets)
- [x] `helm-blueprint` skill — generates Helm chart from a deployment spec (SKILL.md + references + assets)
- [x] `k8s-manifest-generator` skill — generates raw K8s YAML manifests (SKILL.md + references)

---

## Global Bonus: Reusable Intelligence (+200 pts)

**What:** Create and use reusable Claude Code Subagents and Agent Skills throughout the project.

**Status:** Partially done — we already have skills in `.claude/skills/` from earlier phases (fastapi-crud-generator, nextjs-todo-ui-generator, better-auth-jwt-generator, etc.). Phase 4 adds infrastructure skills.

---

## Summary

| Item | Points | Type |
|------|--------|------|
| Feature 1: Containerization | Part of 250 | Core |
| Feature 2: Helm Deployment | Part of 250 | Core |
| AIOps (Gordon, kubectl-ai, kagent) | Part of 250 | Core requirement |
| Cloud-Native Blueprints | +200 | Bonus |
| Reusable Intelligence | +200 | Bonus (cross-phase) |

---

---

## The Play: Build the Bonus FIRST, Then Use It for the Core Work

```
Step 0: Build Cloud-Native Blueprint Skills (+200 bonus)
  → docker-blueprint skill
  → helm-blueprint skill
  → k8s-manifest-generator skill

Step 1: Create folder structure

Step 2: Feature 1 — Containerization (uses docker-blueprint skill)

Step 3: Feature 2 — Helm Deployment (uses helm-blueprint skill)
```

This way the skills aren't just sitting there for show — they're the actual tools we use to generate Dockerfiles and Helm charts, which is exactly what the hackathon bonus "Create and use Cloud-Native Blueprints via Agent Skills" is asking for.
