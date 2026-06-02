# Faceplate.md

Faceplate.me combines my passions of coding and Legos to automate and crowdsource the creation of the Hall of Faces.



# Faceplate

[![deploy](https://img.shields.io/github/actions/workflow/status/ThroneBuilder/Faceplate/deploy.yml?label=deploy)](https://github.com/ThroneBuilder/Faceplate/actions/workflows/deploy.yml)
A web application for crowdsourcing the generating LEGO face mosaics for my Hall of Faces LEGO creation.

**Live at [faceplate.me](https://faceplate.me)**

## Tech Stack
- **Frontend:** Vanilla HTML/CSS/JS with Vite
- **Backend:** Azure Functions (TypeScript) via Azure Static Web App
- **Database:** Azure Table Storage
- **Auth:** Microsoft Entra ID + Google (SWA custom auth)
- **CI/CD:** GitHub Actions

## Project Structure
```
web/          → Frontend SPA (Vite)
functions/    → Azure Functions API (TypeScript)
infra/        → Bicep infrastructure templates
docs/         → Project documentation
tools/        → Setup and utility scripts
```
## Documentation
- [Project Plan](docs/plan.md) — feature roadmap and implementation details
- [Scoring Rules](docs/rules.md) — how picks are scored across all rounds
- [Deployment Guide](docs/DEPLOYMENT.md) — one-time Azure/GitHub setup steps
- [Test Plan](docs/test_plan.md) — pre-launch end-to-end testing checklist

## Development
```powershell
# Start the functions API locally
cd functions
npm install
npm run start
# Start the frontend dev server
cd web
npm install
npm run dev
```
