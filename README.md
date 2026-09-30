# Workflow Prototype v3 — Shareable Review Copy

> **Prototype / Demonstration Data — Not Production**

This is an interactive prototype of an architectural project-management workflow with company-level Resource Planning, published for team review. It is not a production application: there is no database, authentication, API or server code, and nothing is sent anywhere.

## Requirements

- Node.js 18.18 or newer (tested with Node 22)
- npm

## Commands

```bash
npm ci            # install exact dependency versions from package-lock.json
npm run dev       # dev server with live rebuild → http://localhost:5173
npm run build     # static production build → dist/
npm run preview   # build, then serve dist/ → http://localhost:5173
npm run check     # headless checks: v2 workflow scenario (12 steps) + v3 resource scenario (25 steps)
```

Use `PORT=8080 npm run dev` to change the port. After `npm run build` you can also open `dist/index.html` directly in a browser.

## Structure: one store, many views

| Layer | Source |
|---|---|
| Company store: projects, team, capacity, exceptions, all timesheets; project views; reducer | `src/portfolio.js` |
| Resource model: weekly capacity, demand, utilization, resource needed (derived, never stored) | `src/resource.js` |
| Project rules: workflow, gates, allocations, forecast (reads the resource model) | `src/engine.js` |
| Demonstration data | `src/seed.js` |
| Projects (company dashboard), project Dashboard, My Work, Calendar | `src/dash.jsx` |
| Resource Planning | `src/rp.jsx` |
| Workflow, Admin, Timeline, Timesheets, Drawings, Team | `src/wf.jsx`, `src/admin.jsx`, `src/timeline.jsx`, `src/time.jsx`, `src/drawings.jsx`, `src/team.jsx` |
| Shell, navigation, test-scenario checklists | `src/app.jsx`, `src/scenario.jsx` |

The company navigation is **Projects | Resource Planning**. Open a project for its tabs (Dashboard, Workflow, My Work, Timeline, Timesheets, Drawings & Permits, Calendar, Team, Admin).

Use **Viewing as** to switch between Administrator, Project Manager, Executive Management and individual team members. The **Test scenario** panel has two checklists, which tick themselves as you work: v3 Resource Planning (25 steps) and v2 Workflow (12 steps).

Everything runs in the browser. Changes are kept in that browser's `localStorage`. **Reset demo** restores the starting data.

## Data

- **Staff:** the staff first names are the team's working roster, used for realistic workload testing. There are no email addresses, phone numbers, pay, rates, HR records or accounts.
- **Projects and addresses:** all are demonstration values: Demo Residence A, Lakeside, Hillside and Urban Residence, "Sample site, Michigan", sample local authorities and `example.org` sources.
- **External reviewer:** shown only as "External Reviewer".
- **Illustrative:** every capacity, allocation, hour, date and progress value is **illustrative / not verified**.
- **Availability:** generic categories only (Vacation, Unavailable, Training, Public Holiday).
- **Real-world references:** the only ones are public: the Michigan state construction-code agency and its BCC-323 checklist titles, generic building-code names, and the NCS sheet-numbering convention.
- **No credentials:** no keys, tokens or environment variables, so there is no `.env.example`.

## Hosting (GitHub Pages)

`dist/` is a fully static site with relative asset paths, so it works under `https://<org>.github.io/<repo>/`. The workflow `.github/workflows/deploy-pages.yml` runs **only when started manually** (`workflow_dispatch`), so pushing changes publishes nothing.

To deploy:

1. Commit and push.
2. Open **Actions** and run **Deploy prototype to GitHub Pages**.

The site is public. `robots.txt` and the `noindex` tag discourage search engines, but they are not access control.
