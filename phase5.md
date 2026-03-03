##  Phase 5 — Advanced Cloud Deployment (300 pts)

  Phase 5 has 4 features executed in strict order:

  ---
  Feature 1: Advanced Features (specs/phase5-cloud/advanced-features/)

  What you build:
  Add new capabilities to your todo app:
  - Priorities — mark tasks as High/Medium/Low
  - Tags — label tasks (work, personal, urgent)
  - Search & Filter — find tasks by keyword, status, tag
  - Sort — sort by date, priority, name
  - Recurring Tasks — tasks that repeat daily/weekly/monthly
  - Due Dates & Reminders — set deadlines, get notified

  This is pure feature work — backend API + frontend UI changes.

  ---
  Feature 2: Kafka Events (specs/phase5-cloud/kafka-events/)

  What you build:
  Add event streaming to your app. Every time a task is created/updated/deleted, your app publishes an event to Kafka.

  3 topics:
  - task-events — task created/updated/deleted
  - reminders — due date approaching
  - task-updates — real-time updates

  Think of Kafka like a message queue — services talk to each other by publishing and consuming events instead of direct API calls.     

  ---
  Feature 3: Dapr Integration (specs/phase5-cloud/dapr-integration/)

  What you build:
  Add Dapr — a framework that simplifies microservice communication.

  5 capabilities:
  - Pub/Sub — publish/subscribe to events (replaces direct Kafka calls)
  - State — distributed state management
  - Service Invocation — services call each other via Dapr
  - Jobs API — scheduled tasks (send reminders at specific times)
  - Secrets — secure secrets management

  Think of Dapr like a Swiss Army knife for microservices — handles all the complex distributed systems stuff for you.

  ---
  Feature 4: Cloud Deployment (specs/phase5-cloud/cloud-deployment/)

  What you build:
  Deploy everything to a real cloud — not just your laptop:

  - AKS (Azure) or GKE (Google) or OKE (Oracle) — pick one cloud provider
  - CI/CD — GitHub Actions pipeline that auto-deploys on every push
  - Monitoring — logs, metrics, alerts in the cloud

  This is the final step — your app goes live on a real cloud cluster.

  ---
  The Order (Strict)

  Feature 1: Advanced Features    ← Add new todo capabilities first
       ↓
  Feature 2: Kafka Events         ← Add event streaming
       ↓
  Feature 3: Dapr Integration     ← Simplify microservice communication
       ↓
  Feature 4: Cloud Deployment     ← Deploy everything to real cloud

  ---
  Deliverables

  cloud/
  ├── dapr/        ← Dapr component configs
  ├── kafka/       ← Kafka setup
  └── cicd/        ← GitHub Actions workflows

  Plus a live cloud URL where your app is running.

  ---
  Points

  ┌────────────────┬──────────────┐
  │    Feature     │    Points    │
  ├────────────────┼──────────────┤
  │ All 4 features │ 300 pts core │
  ├────────────────┼──────────────┤
  │ Phase 5 Total  │ 300 pts      │
  └────────────────┴──────────────┘

  ---
  The Big Picture

  Phase 5 is the hardest phase. It goes from local Kubernetes to a real production cloud deployment with event streaming and automated  
  CI/CD.






## Extra 
  ● Now I have the full picture. Here's the complete bonus breakdown:

  ---
  All Bonus Points (Total: +600)

  ┌──────────────────────────────────────────┬────────┬──────────────────────────┐
  │                  Bonus                   │ Points │          Status          │
  ├──────────────────────────────────────────┼────────┼──────────────────────────┤
  │ Reusable Intelligence (Agent Skills)     │ +200   │ ✅ Done (Phase 4)        │
  ├──────────────────────────────────────────┼────────┼──────────────────────────┤
  │ Cloud-Native Blueprints (Agent Skills)   │ +200   │ ✅ Done (Phase 4)        │
  ├──────────────────────────────────────────┼────────┼──────────────────────────┤
  │ Voice Commands (voice input for todos)   │ +200   │ ✅ Done (Phase 3 Path A) │
  ├──────────────────────────────────────────┼────────┼──────────────────────────┤
  │ Multi-language Support (Urdu in chatbot) │ +100   │     ✅ Done              │
  └──────────────────────────────────────────┴────────┴──────────────────────────┘

  ---
  Big News

  You've already earned +600 bonus points!

  +200 Reusable Intelligence  ✅
  +200 Cloud-Native Blueprints ✅
  +200 Voice Commands ✅
  ─────────────────────────────
  +600 TOTAL BONUS ✅

  The hackathon total bonus is capped at +600, so you've already maxed it out.    

  ---
  Phase 5 Core Work (300 pts)

  The cloud provider recommendation from the spec:

  Oracle Cloud is recommended — Always Free, no credit card charges after trial, 4 OCPUs + 24GB RAM Kubernetes cluster.

  3 parts:
  - Part A: Advanced features + Kafka + Dapr
  - Part B: Deploy to Minikube locally with full Dapr
  - Part C: Deploy to Oracle OKE (or Azure AKS / Google GKE) + CI/CD + monitoring






## Questions

 i have a question like in phase4 we use minikube local deployment so in this hackathon did we use kubernetess like not locally        
  cloud version?                                                                                                                        

● Yes! That's exactly what Phase 5 Part C is about.

  ---
  The Progression

  Phase 4 = Minikube (Kubernetes on YOUR laptop)        ← local
  Phase 5 = Real Kubernetes on a cloud provider         ← actual cloud

  ---
  Phase 5 Cloud Options

  The hackathon gives you 3 choices:

  ┌────────────────────┬───────────────────────────────────────────┬────────────────┐
  │       Cloud        │                Free Offer                 │  Recommended?  │
  ├────────────────────┼───────────────────────────────────────────┼────────────────┤
  │ Oracle Cloud (OKE) │ Always Free — 4 CPUs, 24GB RAM, no expiry │ ✅ Best choice │
  ├────────────────────┼───────────────────────────────────────────┼────────────────┤
  │ Azure (AKS)        │ $200 credit for 30 days                   │ ⚠️ Expires     │
  ├────────────────────┼───────────────────────────────────────────┼────────────────┤
  │ Google Cloud (GKE) │ $300 credit for 90 days                   │ ⚠️ Expires     │
  └────────────────────┴───────────────────────────────────────────┴────────────────┘

  ---
  Why Oracle is Recommended

  - Always Free — doesn't expire after 30/90 days
  - 4 OCPUs + 24GB RAM — more than enough for your todo app
  - No surprise charges
  - Best for learning without time pressure

  ---
  What Changes in Phase 5

  Phase 4:
    Your code → Docker images → Minikube (your laptop)

  Phase 5:
    Your code → Docker images → Push to registry → Oracle OKE (real cloud)
    + GitHub Actions auto-deploys on every git push
    + Monitoring and logging set up

  Same Helm charts from Phase 4 — just pointing to a real cloud cluster instead of Minikube.

  ---
  So in simple terms — Phase 5 takes everything you built in Phase 4 and puts it on the actual internet, running on a real server,      
  auto-deploying from GitHub.

  Want to start Phase 5?




Question                                                                                                                     
  like these services are called kubernetess                                                                                            
   The hackathon gives you 3 choices:                                                                                                   
                                                                                                                                        
    ┌────────────────────┬───────────────────────────────────────────┬──────────────────┤                                               
    │ Google Cloud (GKE) │ $300 credit for 90 days                   │ ⚠️ Expires     │                                                 
    └────────────────────┴───────────────────────────────────────────┴────────────────┘                                                 

● No — these are cloud providers that offer Kubernetes as a service.

  ---
  Simple Explanation

  Kubernetes is just software — it manages containers.

  But you need a computer/server to run Kubernetes on. That's where cloud providers come in.

  ---
  The Difference

  ┌────────────┬──────────────────────────────────────────────────┐
  │    What    │                    What it is                    │
  ├────────────┼──────────────────────────────────────────────────┤
  │ Kubernetes │ The software that manages your containers        │
  ├────────────┼──────────────────────────────────────────────────┤
  │ Minikube   │ Runs Kubernetes on YOUR laptop                   │
  ├────────────┼──────────────────────────────────────────────────┤
  │ Oracle OKE │ Oracle's computers running Kubernetes for you    │
  ├────────────┼──────────────────────────────────────────────────┤
  │ Azure AKS  │ Microsoft's computers running Kubernetes for you │
  ├────────────┼──────────────────────────────────────────────────┤
  │ Google GKE │ Google's computers running Kubernetes for you    │
  └────────────┴──────────────────────────────────────────────────┘

  ---
  Simple Analogy

  Kubernetes is like Microsoft Word.

  - Minikube = running Word on your own laptop
  - Oracle OKE = running Word on Oracle's powerful server in the cloud
  - Azure AKS = running Word on Microsoft's server
  - Google GKE = running Word on Google's server

  Same software. Different computers.

  ---
  What OKE, AKS, GKE Mean

  - OKE = Oracle Kubernetes Engine
  - AKS = Azure Kubernetes Service
  - GKE = Google Kubernetes Engine

  They all do the same thing — give you a Kubernetes cluster running on their servers, so you don't have to manage the hardware
  yourself.
