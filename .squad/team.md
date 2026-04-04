# Squad Team

> Tollab — Full TypeScript Migration

## Coordinator

| Name | Role | Notes |
|------|------|-------|
| Squad | Coordinator | Routes work, enforces handoffs and reviewer gates. |

## Members

| Name | Role | Charter | Status |
|------|------|---------|--------|
| Amir | Tech Lead / Architect | .squad/agents/amir/charter.md | 🏗️ Lead |
| Nadia | System Designer | .squad/agents/nadia/charter.md | 🏗️ Lead |
| Tariq | System Designer (Data) | .squad/agents/tariq/charter.md | 🏗️ Lead |
| Layla | Senior Frontend Dev (Components) | .squad/agents/layla/charter.md | ⚛️ Frontend |
| Omar | Senior Frontend Dev (Components) | .squad/agents/omar/charter.md | ⚛️ Frontend |
| Dina | Frontend Dev (Calendar & Ticker) | .squad/agents/dina/charter.md | ⚛️ Frontend |
| Sami | Frontend Dev (Settings & Modals) | .squad/agents/sami/charter.md | ⚛️ Frontend |
| Farid | State Management Dev | .squad/agents/farid/charter.md | 🔧 Backend |
| Hana | Services Dev (Firebase) | .squad/agents/hana/charter.md | 🔧 Backend |
| Rami | Services Dev (External) | .squad/agents/rami/charter.md | 🔧 Backend |
| Yasmin | Senior Test Engineer | .squad/agents/yasmin/charter.md | 🧪 Test |
| Karim | Test Engineer (Unit) | .squad/agents/karim/charter.md | 🧪 Test |
| Lina | E2E Test Engineer | .squad/agents/lina/charter.md | 🧪 Test |
| Zara | Architecture Reviewer | .squad/agents/zara/charter.md | 🔒 Reviewer |
| Malik | Code Quality Reviewer | .squad/agents/malik/charter.md | 🔒 Reviewer |
| Noura | UI Fidelity Reviewer | .squad/agents/noura/charter.md | 🔒 Reviewer |
| Jad | Security Reviewer | .squad/agents/jad/charter.md | 🔒 Reviewer |
| Khalil | DevOps / CI Engineer | .squad/agents/khalil/charter.md | ⚙️ DevOps |
| Rana | Technical Writer | .squad/agents/rana/charter.md | 📝 Docs |
| Scribe | Session Logger | .squad/agents/scribe/charter.md | 📋 Scribe |
| Ralph | Work Monitor | — | 🔄 Monitor |

## Project Context

- **Project:** Tollab — Academic management app for Technion students
- **User:** Ibrahim Tabajah
- **Created:** 2026-04-04
- **Stack:** TypeScript 5.x, Preact, Vite 6.x, Zustand, Firebase v10+, Vitest, Playwright
- **Migration:** Vanilla JS SPA → modern typed Preact app (12+ waves)
- **Branch strategy:** All work on `squad-branch`, sub-branches per wave
- **Model override:** claude-opus-4.6 for all agent spawns

## Reviewer Gates

| PR Scope | Required Reviewers |
|----------|-------------------|
| Types / Interfaces (src/types/) | Nadia, Tariq |
| Store (src/store/) | Nadia, Zara, Farid |
| Services (src/services/) | Zara, Jad |
| Components (src/components/) | Malik, Noura |
| CSS changes | Noura |
| Firebase / Auth | Jad, Hana |
| Build / CI / Config | Khalil, Zara |
| Tests | Yasmin, Malik |
| Documentation | Rana, Amir |
| Any PR touching 3+ modules | Amir, Zara |
