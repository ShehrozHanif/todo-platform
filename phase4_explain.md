# Phase 4 — Simple Explanation

## Phase 3 vs Phase 4 — The Simple Difference

Phase 3 = You built a smart chatbot that can add/edit/delete tasks using natural language ("Add a task for tomorrow at 9am").

Phase 4 = You took that entire app (backend + frontend + chatbot server) and packaged it so it runs the same way on any computer —
your laptop, a server, or the cloud. No more "but it works on my machine" problems.

---

## Phase 4 Explained Like You're 10

### The Problem Phase 4 Solves

Right now, to run your app you need to:
1. Start the backend manually
2. Start the frontend manually
3. Start the MCP server manually
4. Make sure Python, Node.js, etc. are all installed correctly

This is messy. What if you want to give your app to someone else? They'd have to do all that setup too.

### Docker = Putting the App in a Box (Feature 1)

Docker packages your app and everything it needs (Python, Node.js, all libraries) into a single "box" called a container.

- You give someone the box → they run it → it just works, no setup needed
- k8s/backend/Dockerfile = recipe for boxing the Python backend
- k8s/frontend/Dockerfile = recipe for boxing the Next.js frontend
- k8s/docker-compose.yml = a single command that starts ALL 3 boxes together

```bash
docker compose up   # starts everything at once ✅
```

### Kubernetes = Managing Many Boxes (Feature 2)

Kubernetes (K8s) is like a warehouse manager that:
- Keeps your boxes (containers) running at all times
- Restarts them automatically if they crash
- Can spin up 10 copies of your backend if traffic spikes

Minikube = a mini Kubernetes that runs on your laptop for testing.

Helm = like a "package manager for Kubernetes" (same idea as npm for Node). Instead of writing 50 YAML files manually, Helm templates handle it.

```bash
helm install todo k8s/helm/todo-platform   # deploys everything to K8s ✅
```

---

## What We Actually Built (Already Done!)

✅ Step 0: Built 3 Agent Skills (bonus +200 pts)
   - docker-blueprint skill  → auto-generates Dockerfiles
   - helm-blueprint skill    → auto-generates Helm charts
   - k8s-manifest-generator  → auto-generates raw K8s YAML

✅ Feature 1: Containerization
   - k8s/backend/Dockerfile      (Python + UV multi-stage)
   - k8s/frontend/Dockerfile     (Next.js standalone)
   - k8s/mcp-server/Dockerfile   (Python + UV)
   - k8s/docker-compose.yml      (runs all 3 together)

✅ Feature 2: Helm Deployment
   - k8s/helm/todo-platform/     (umbrella Helm chart)
   - 3 subcharts: backend, frontend, mcp-server
   - k8s/helm/todo-platform/DEPLOY.md (step-by-step guide)

Phase 4 is already complete! All the code has been written and committed.

---

## What YOU Still Need to Run It

The code is ready — you just need to run it on your machine:

1. Install Docker Desktop → opens the capability to run containers
2. Install Minikube → local Kubernetes cluster on your laptop
3. Install Helm → Kubernetes package manager
4. Follow k8s/helm/todo-platform/DEPLOY.md step by step

The deploy doc has all the commands ready to copy-paste.

---

## The AIOps Tools (Bonus Fun)

These are AI assistants for your infrastructure:

| Tool | What it does |
|------|-------------|
| Gordon | AI inside Docker Desktop — ask "why is my build slow?" and it tells you |
| kubectl-ai | AI for Kubernetes — type `kubectl-ai "why are my pods failing?"` and it diagnoses |
| kagent | AI cluster manager — optimizes your K8s resources automatically |

---

## The Scoreboard

| What | Points |
|------|--------|
| Feature 1 + Feature 2 | 250 pts (core Phase 4) |
| Cloud-Native Blueprint Skills | +200 pts (bonus) |
| Phase 4 Total | 450 pts |



## Question
 Great question — this is the most common confusion beginners have. Let me clear it up.

  ---
  You're Right — Your App Already Works Online

  Phase 3 is deployed:
  - Frontend → Vercel
  - Backend → Render

  So why does Phase 4 exist? Because Vercel and Render are someone else's computers. You just uploaded your code and they handled      
  everything for you.

  ---
  The Real-World Problem Docker/K8s Solves

  Vercel and Render are great for small projects, but in the real world (big companies), they don't use Vercel/Render. Here's why:     

  ┌───────────────────────────────────────────────────────┬───────────────────────────────────────────────────────┐
  │                       Scenario                        │                 Vercel/Render Problem                 │
  ├───────────────────────────────────────────────────────┼───────────────────────────────────────────────────────┤
  │ Your app gets 1 million users                         │ You're limited by their pricing/plan                  │
  ├───────────────────────────────────────────────────────┼───────────────────────────────────────────────────────┤
  │ You need 10 copies of your backend                    │ You have no control over how it scales                │
  ├───────────────────────────────────────────────────────┼───────────────────────────────────────────────────────┤
  │ Company policy: no third-party hosting                │ You're stuck                                          │
  ├───────────────────────────────────────────────────────┼───────────────────────────────────────────────────────┤
  │ You want to run it on AWS/Azure/Google Cloud yourself │ Can't do it without Docker                            │
  ├───────────────────────────────────────────────────────┼───────────────────────────────────────────────────────┤
  │ Something crashes at 3am                              │ Render restarts it slowly, K8s restarts it in seconds │
  └───────────────────────────────────────────────────────┴───────────────────────────────────────────────────────┘

  ---
  The Simple Analogy

  Think of it like renting vs owning:

  - Vercel/Render = renting a furnished apartment. Easy, no setup, but you follow their rules, their pricing, their limits.
  - Docker + Kubernetes = owning a house. More work to set up, but you control everything. You can move it anywhere.

  Docker = packs your app so it can move anywhere (any server, any cloud).

  Kubernetes = manages your app automatically on those servers (restarts crashes, scales up, load balances).

  ---
  Why the Hackathon Requires It

  The hackathon is teaching you skills used at real companies (Amazon, Google, Netflix). They all use Docker + Kubernetes — not        
  Vercel/Render. Phase 4 is not about "making your app work" (it already works), it's about learning how professionals deploy apps at  
  scale.

  ---
  So in Phase 4 — What Actually Changes?

  Nothing breaks. Your Vercel + Render deployment still works. Phase 4 adds a second way to run the same app:

  Before Phase 4:
    Code → Vercel (frontend) + Render (backend)    ← still works ✅

  After Phase 4:
    Code → Docker containers → Kubernetes (Minikube on your laptop)   ← new skill ✅

  Same app, different deployment method. The Phase 4 goal is to run it locally on your own machine using Minikube — not replace        
  Vercel/Render.



## Question 
i understand docker then kubernetess now what is helm                                                                                
  just talk only                                                                                                                       

● Helm = Package Manager for Kubernetes

  You know how on your laptop you install apps?

  - Windows → you download a .exe installer
  - Mac → you use App Store
  - Node.js projects → you use npm install

  Helm is the same idea, but for Kubernetes.

  ---
  The Problem Without Helm

  To deploy your app on Kubernetes, you need to write YAML files:
  - one file for the Deployment
  - one file for the Service
  - one file for the ConfigMap
  - one file for the Secret
  - one file for the Ingress

  That's 5 files per service. You have 3 services (backend, frontend, mcp-server).

  That's 15 YAML files — all manually written, all slightly different, easy to make mistakes in.

  ---
  What Helm Does

  Helm bundles all those 15 files into one package called a "chart".

  Then instead of applying 15 files one by one, you just run:

  helm install todo k8s/helm/todo-platform

  One command. Everything deploys. Done.

  ---
  The Real Analogy

  - Without Helm = Installing software by downloading each DLL file manually and placing it in the right folder yourself
  - With Helm = Just running the .exe installer and clicking Next → Next → Finish

  Helm is the installer. Your app is the software. Kubernetes is the computer.





## ● Feature 1: Containerization — Simple Explanation

  Remember we said Docker puts your app in a box (container)?

  A Dockerfile is just the recipe for making that box.

  ---
  The 4 Files We Made

  1. k8s/backend/Dockerfile — Recipe for the Python Backend

  This file tells Docker:
  - Start with Python 3.13
  - Install UV (the fast package manager)
  - Copy the backend code
  - Install all dependencies
  - Start the FastAPI server

  Result → one box that contains your entire Python backend. Give it to anyone, it just runs.

  ---
  2. k8s/frontend/Dockerfile — Recipe for the Next.js Frontend

  This file tells Docker:
  - Start with Node.js 22
  - Install all npm packages
  - Build the Next.js app
  - Keep only the final built files (throw away the build tools)

  Result → one box that serves your website. Tiny, fast, ready to deploy anywhere.

  ---
  3. k8s/mcp-server/Dockerfile — Recipe for the AI/MCP Server

  Same idea as backend. Your MCP server (the one that handles AI tool calls) gets its own separate box.

  Why separate? Because in Kubernetes, each service lives in its own container. They talk to each other over a network — just like your   backend talks to Neon DB over the internet.

  ---
  4. k8s/docker-compose.yml — The Master Switch

  This is the most important one for local testing.

  Instead of building and starting 3 boxes one by one:
  docker run backend...
  docker run frontend...
  docker run mcp-server...

  You just run ONE command:
  docker compose up

  And all 3 start together, connected to each other, ready to use.

  ---
  What "Multi-stage" Means (You'll See This Term)

  Think of it like building furniture:

  - Stage 1 (Builder): You bring all the tools — hammer, saw, drill, nails
  - Stage 2 (Final box): You only pack the finished furniture — NOT the tools

  Multi-stage build = the final Docker box only has your app, not the build tools. So it's much smaller and faster.

  ---
  Summary in One Picture

  Your Code
      ↓
  Dockerfile (recipe)
      ↓
  Docker builds it → Container (the box)
      ↓
  docker-compose.yml → starts ALL 3 boxes together
      ↓
  Your app runs anywhere ✅

  That's Feature 1. Clean, simple, done.




## ● Feature 2: Helm Deployment — Simple Explanation

  Remember Feature 1 made 3 boxes (containers)?

  Feature 2 is about giving those boxes to Kubernetes so it can manage them professionally.

  And Helm is the tool that makes giving them to Kubernetes easy.

  ---
  What We Actually Built

  The Structure We Created

  k8s/helm/todo-platform/          ← the main package (umbrella)
      ├── charts/
      │   ├── backend/             ← backend's instructions
      │   ├── frontend/            ← frontend's instructions
      │   └── mcp-server/          ← mcp-server's instructions
      └── values.yaml              ← all settings in one place

  Think of it like a company folder:
  - The main folder = the whole company
  - Subfolders = each department (backend, frontend, mcp-server)
  - values.yaml = the company-wide settings file

  ---
  The Files Inside Each Subchart

  Every service (backend, frontend, mcp-server) has the same set of files:

  Chart.yaml — The ID Card

  Just basic info about the service:
  - What is its name?
  - What version is it?
  - What does it do?

  Like a label on the box saying "this is the backend, version 1.0"

  ---
  values.yaml — The Settings File

  All the configurable stuff:
  - How many copies to run? (replicas)
  - Which port does it use?
  - What environment variables does it need?

  Like the settings menu of the service. You change things here without touching any other file.

  ---
  deployment.yaml — The Main Instructions

  This tells Kubernetes:
  - Run this Docker image
  - Use these environment variables
  - Check if it's healthy every 30 seconds
  - If it crashes, restart it automatically

  Like a job description — tells Kubernetes exactly how to run the service.

  ---
  service.yaml — The Address

  This gives the container a name on the network so other services can find it.

  Without this, containers can't talk to each other. With this:
  - Backend can find MCP server by name: todo-mcp-server
  - Frontend can find backend by name: todo-backend

  Like a phone directory inside Kubernetes.

  ---
  configmap.yaml — Non-Secret Settings

  Public environment variables go here:
  - What URL is the API at?
  - What port to use?

  Like a notice board — visible to everyone, nothing sensitive.

  ---
  secret.yaml — Private Settings

  Sensitive stuff goes here:
  - Database password
  - OpenAI API key
  - Auth secret

  Kubernetes encrypts these. Like a safe instead of a notice board.

  ---
  The 3 Service Types (How They're Exposed)

  ┌────────────┬───────────┬───────────────────────────────────────────────────────┐
  │  Service   │   Type    │                          Why                          │
  ├────────────┼───────────┼───────────────────────────────────────────────────────┤
  │ Backend    │ ClusterIP │ Only accessible inside Kubernetes, not from outside   │
  ├────────────┼───────────┼───────────────────────────────────────────────────────┤
  │ Frontend   │ NodePort  │ Accessible from your browser on port 30000            │
  ├────────────┼───────────┼───────────────────────────────────────────────────────┤
  │ MCP Server │ ClusterIP │ Only backend needs to reach it, not the outside world │
  └────────────┴───────────┴───────────────────────────────────────────────────────┘

  Simple version:
  - ClusterIP = internal only (like a private office phone)
  - NodePort = accessible from outside (like a public reception number)

  ---
  DEPLOY.md — The Step-by-Step Guide

  This file has all the commands you need to actually deploy:

  Step 1: Start Minikube (your local Kubernetes)
  Step 2: Build Docker images
  Step 3: Create namespace
  Step 4: Run helm install with your secrets
  Step 5: Check everything is running
  Step 6: Open the app in browser

  One document, copy-paste ready.

  ---
  Summary in One Picture

  Feature 1 made the boxes (Docker containers)
           ↓
  Feature 2 gives them to Kubernetes via Helm
           ↓
  Helm reads the chart (recipe package)
           ↓
  Kubernetes runs all 3 services
           ↓
  Automatically restarts crashes ✅
  Scales up when traffic spikes ✅
  All services can talk to each other ✅
  App accessible in your browser ✅

  ---
  Feature 1 vs Feature 2 in One Line

  - Feature 1 = making the boxes
  - Feature 2 = hiring a professional warehouse manager to handle those boxes

  That's it.






## ● The Full Chain — Real Example

  Let's use your todo app as the example.

  ---
  The Situation

  You built a todo app. It has 3 parts:
  - Backend (Python) — handles the data
  - Frontend (Next.js) — the website users see
  - MCP Server (Python) — handles AI chat

  You want to deploy it professionally.

  ---
  Step 1: Dockerfile — Write the Recipe

  You write a recipe for the backend:

  - Take Python 3.13
  - Copy my backend code into it
  - Install all my Python packages
  - When started, run: uvicorn main:app

  That recipe is your Dockerfile.

  ---
  Step 2: Docker Build — Bake the Recipe

  You run:
  docker build -t todo-backend .

  Docker reads the recipe and bakes it into an image.

  An image is like a frozen snapshot of your backend — code, dependencies, everything — ready to run anywhere.

  ---
  Step 3: Container — Run the Image

  You run:
  docker run todo-backend

  Now the image comes alive as a container.

  Your backend is running. Locally. No Python installation needed on the other machine.

  ---
  Step 4: docker-compose — Run All 3 Together

  You do the same for frontend and MCP server. Now you have 3 images.

  Instead of running 3 separate commands, you run:
  docker compose up

  All 3 containers start together, connected to each other.

  Your whole todo app is running locally with one command.

  ---
  Step 5: Helm Chart — Package for Kubernetes

  Now you want to deploy this on a real server (not just your laptop).

  You create a Helm chart — a package that tells Kubernetes:
  - Run the backend image, 2 copies, on port 8000
  - Run the frontend image, 1 copy, on port 3000
  - Run the MCP server image, 1 copy, on port 8001
  - If any of them crash, restart automatically
  - Let them talk to each other

  ---
  Step 6: Minikube — Test Kubernetes Locally

  Before going to a real server, you test on your laptop using Minikube (a mini Kubernetes).

  You run:
  helm install todo k8s/helm/todo-platform

  Helm gives your Helm chart to Minikube. Minikube starts all 3 containers, manages them, connects them.

  Your todo app is now running on a real Kubernetes cluster — just a mini one on your laptop.

  ---
  The Full Chain in One Picture

  Your Code
     ↓
  Dockerfile (recipe for each service)
     ↓
  docker build → Image (frozen snapshot)
     ↓
  docker run → Container (live running app)
     ↓
  docker-compose → All 3 containers running together (local testing)
     ↓
  Helm Chart → Package with all Kubernetes instructions
     ↓
  helm install → Kubernetes runs everything professionally
     ↓
  Your todo app is live, auto-restarting, scalable ✅

  ---
  Real Life Comparison

  ┌────────────────┬───────────────────────────────────────────────┐
  │      Step      │             Real Life Equivalent              │
  ├────────────────┼───────────────────────────────────────────────┤
  │ Dockerfile     │ Recipe card                                   │
  ├────────────────┼───────────────────────────────────────────────┤
  │ docker build   │ Cooking the meal                              │
  ├────────────────┼───────────────────────────────────────────────┤
  │ Image          │ Frozen ready-meal                             │
  ├────────────────┼───────────────────────────────────────────────┤
  │ Container      │ Heated and served meal                        │
  ├────────────────┼───────────────────────────────────────────────┤
  │ docker-compose │ Full restaurant menu served at once           │
  ├────────────────┼───────────────────────────────────────────────┤
  │ Helm Chart     │ Franchise instruction manual                  │
  ├────────────────┼───────────────────────────────────────────────┤
  │ Kubernetes     │ The franchise manager running 100 restaurants │
  └────────────────┴───────────────────────────────────────────────┘

  ---
  That's the full chain. Every tool has one job. They all connect.  








## Achieved
 ---
  ✅ Docker images built (backend, frontend, mcp-server)
  ✅ Helm chart deployed to Minikube                                                                                                 
─ ✅ All 3 pods running
  ✅ App accessible at http://localhost:3000
  ✅ Signup/Login working

  ---
  What You Achieved in Phase 4

  - Packaged your entire app into Docker containers
  - Deployed it to a real Kubernetes cluster (Minikube)
  - Managed it with Helm
  - Your app now runs the same way it would on AWS, Google Cloud, or Azure  




● kagent is installed in your Kubernetes cluster.

  ---
##  All 3 AIOps tools are fully installed and working:

  ✅ Gordon      —tDocker AI (in Docker Desktop)
  ✅ kubectl-ai  — AI for Kubernetes commands
  ✅ kagent       — AI agent in Kubernetes cluster

  ---
  Phase 4 is 100% Complete

  Everything done:

  ✅ Step 0: Cloud-Native Blueprint Skills (+200 bonus pts)
  ✅ Feature 1: Containerization (3 Docker images)
  ✅ Feature 2: Helm Deployment (running on Minikube)
  ✅ AIOps Tools (Gordon, kubectl-ai, kagent)

  Score: 250 pts core + 200 pts bonus = 450 pts






##  Good question.

  ---
  Did We Actually USE These Tools in Phase 4?

  Honestly — no, not really.

  We installed them. They're sitting there. But we didn't actually use them to do anything meaningful in Phase 4.

  ---
  What They WERE Supposed to Do

  Gordon — when building Docker images, you could ask:
  docker ai "optimize my backend Dockerfile"
  Instead we just built the images directly with docker build.

  kubectl-ai — when debugging pods, you could ask:
  kubectl-ai "why is my backend pod not starting"
  Instead we ran kubectl logs and kubectl get pods manually.

  kagent — after deploying, you could ask:
  kagent "analyze cluster health"
  Instead we just checked manually.

  ---
  What If We Didn't Install Them?

  Nothing would break. The app runs exactly the same.

  The 3 pods would still be running. Signup would still work. Everything identical.

  ---
  So Why Does the Hackathon Require Them?

  It's about showing you know these tools exist — not about them being critical to the app working.

  The hackathon wants to see that you:
  - Know AIOps tools exist
  - Can install and set them up
  - Understand what they're for

  That's it. It's a learning checkpoint, not a technical requirement.

  ---
  In short: installed = bonus points. Not installed = no bonus points. App behavior = identical either way.






  ##  Step 1: Start Minikube
  minikube start

  Step 2: Open two terminals and run both:
  kubectl port-forward -n todo-app svc/todo-frontend 3000:3000
  

  Step 3: Open browser at http://localhost:3000

  ---
  That's it. 3 steps.

  ---
  Why So Short?

  Because everything is already done:
  - Docker images are already built and sitting in Minikube
  - Helm chart is already deployed
  - Pods are already configured

  Minikube just needs to start and you forward the ports. The app is already there waiting.

  ---
  When Do You Need the Long Process Again?

  Only if you:
  - Change your code and need to rebuild images
  - Delete Minikube (minikube delete) and start fresh
  - Move to a different machine

  Otherwise — just minikube start and port-forward. Done.



###  kubectl get pods -n todo-app








## Conslusion


  Phase 4 requirement is:
  - Package the app into Docker containers
  - Deploy and run it locally using Kubernetes (Minikube)
  - Manage it with Helm

  That's it. You did all of that. Phase 4 is complete.

  ---
  Your Vercel + Render deployment from Phase 3 is still live online. Phase 4 just adds the ability to run the same app locally through  
  Docker + Kubernetes — like a professional would in a real company.







## Phase 4 Requirements Check

  Feature 1: Containerization ✅

  ┌───────────────────────────────────────────────────┬───────────────────────────────────────┐
  │                    Requirement                    │                Status                 │
  ├───────────────────────────────────────────────────┼───────────────────────────────────────┤
  │ Dockerfile for backend (Python + UV, multi-stage) │ ✅ k8s/backend/Dockerfile             │
  ├───────────────────────────────────────────────────┼───────────────────────────────────────┤
  │ Dockerfile for frontend (Next.js standalone)      │ ✅ k8s/frontend/Dockerfile            │
  ├───────────────────────────────────────────────────┼───────────────────────────────────────┤
  │ Dockerfile for MCP server                         │ ✅ k8s/mcp-server/Dockerfile          │
  ├───────────────────────────────────────────────────┼───────────────────────────────────────┤
  │ Docker Compose (runs all 3 together)              │ ✅ k8s/docker-compose.yml             │
  ├───────────────────────────────────────────────────┼───────────────────────────────────────┤
  │ Gordon (Docker AI)                                │ ✅ Installed and working              │
  ├───────────────────────────────────────────────────┼───────────────────────────────────────┤
  │ spec.md / plan.md / tasks.md                      │ ✅ specs/phase4-k8s/containerization/ │
  └───────────────────────────────────────────────────┴───────────────────────────────────────┘

  ---
  Feature 2: Helm Deployment ✅

  ┌───────────────────────────────┬──────────────────────────────────────────────┐
  │          Requirement          │                    Status                    │
  ├───────────────────────────────┼──────────────────────────────────────────────┤
  │ Helm chart for backend        │ ✅ k8s/helm/todo-platform/charts/backend/    │
  ├───────────────────────────────┼──────────────────────────────────────────────┤
  │ Helm chart for frontend       │ ✅ k8s/helm/todo-platform/charts/frontend/   │
  ├───────────────────────────────┼──────────────────────────────────────────────┤
  │ Helm chart for mcp-server     │ ✅ k8s/helm/todo-platform/charts/mcp-server/ │
  ├───────────────────────────────┼──────────────────────────────────────────────┤
  │ Umbrella chart                │ ✅ k8s/helm/todo-platform/                   │
  ├───────────────────────────────┼──────────────────────────────────────────────┤
  │ Minikube deployment (working) │ ✅ Deployed and tested                       │
  ├───────────────────────────────┼──────────────────────────────────────────────┤
  │ kubectl-ai                    │ ✅ Installed                                 │
  ├───────────────────────────────┼──────────────────────────────────────────────┤
  │ kagent                        │ ✅ Installed in cluster                      │
  ├───────────────────────────────┼──────────────────────────────────────────────┤
  │ DEPLOY.md step-by-step guide  │ ✅ k8s/helm/todo-platform/DEPLOY.md          │
  ├───────────────────────────────┼──────────────────────────────────────────────┤
  │ spec.md / plan.md / tasks.md  │ ✅ specs/phase4-k8s/helm-deployment/         │
  └───────────────────────────────┴──────────────────────────────────────────────┘

  ---
  Bonus: Cloud-Native Blueprints +200 pts ✅

  ┌──────────────────────────────┬───────────────────────────────────────────┐
  │         Requirement          │                  Status                   │
  ├──────────────────────────────┼───────────────────────────────────────────┤
  │ docker-blueprint skill       │ ✅ .claude/skills/docker-blueprint/       │
  ├──────────────────────────────┼───────────────────────────────────────────┤
  │ helm-blueprint skill         │ ✅ .claude/skills/helm-blueprint/         │
  ├──────────────────────────────┼───────────────────────────────────────────┤
  │ k8s-manifest-generator skill │ ✅ .claude/skills/k8s-manifest-generator/ │
  └──────────────────────────────┴───────────────────────────────────────────┘

  ---
  Everything committed and pushed ✅

  Phase 4 is 100% complete. Nothing missing.



## How to st

  1. Open Docker Desktop
  2. Run minikube start
  3. Open Terminal 1: kubectl port-forward -n todo-app svc/todo-frontend 3000:3000
  4. Open Terminal 2: kubectl port-forward -n todo-app svc/todo-backend 8000:8000
  5. Open http://localhost:3000