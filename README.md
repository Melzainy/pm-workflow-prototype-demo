# Workflow Prototype v2 — Public Review Copy

> **Prototype / Demonstration Data — Not Production**

This is an interactive prototype of an architectural project-management workflow for modular residential projects, published for visual and workflow review. It is not a production application. There is no database, authentication, API or server code.

Everything runs in the browser. Changes are kept in that browser's `localStorage` (key `pm-workflow-prototype-demo-v2`). **Reset demo** in the header restores the starting data. Each reviewer sees only their own changes, and nothing is sent anywhere.

## Requirements

- Node.js 18.18 or newer (tested with Node 22)
- npm

## Commands

```bash
npm ci            # install exact dependency versions from package-lock.json
npm run dev       # dev server with live rebuild → http://localhost:5173
npm run build     # static production build → dist/
npm run preview   # build, then serve dist/ → http://localhost:5173
npm run check     # headless check of the 12-step demo scenario
```

Use `PORT=8080 npm run dev` to change the port. After `npm run build` you can also open `dist/index.html` directly in a browser.

## What is in it

| Screen | Source |
|---|---|
| Dashboard, My Work, Calendar, Projects | `src/dash.jsx` |
| Workflow, task detail, inline gates | `src/wf.jsx` |
| Admin Workflow Editor (tree, details, drag-and-drop, impact preview, template scope) | `src/admin.jsx` |
| Master Timeline (Planned / Actual / Forecast, baseline compare) | `src/timeline.jsx` |
| Timesheets (entry, PM approval, reports) | `src/time.jsx` |
| Drawings & Permits (master sheet register, responsibilities, revisions) | `src/drawings.jsx` |
| Team directory and project roles | `src/team.jsx` |
| Shell, view switching, test-scenario checklist | `src/app.jsx` |
| Store, rules, forecast engine, reducer | `src/engine.js` |
| Demonstration data | `src/seed.js` |
| Shared UI primitives | `src/ui.jsx` |
| Styles | `src/styles.css` |

Use **Viewing as** in the header to switch between Administrator, Project Manager, Executive Management and individual sample team members. The **Test scenario** panel walks through the 12-step review scenario and ticks off each step as you complete it.

## Demonstration data

Everything in `src/seed.js` is fictional sample data:

- the project name ("Demo Residence") and address ("100 Sample Street, Anytown, MI 49000");
- the team names;
- the "External Reviewer";
- the local authorities ("City of Anytown", "Sample Township") and their `example.org` source links;
- all dates, estimates, hours, progress, assignments, approvals and signatures.

The only real-world references are public ones:

- the Michigan state construction-code agency and its public BCC-323 checklist item titles;
- generic building-code names;
- the NCS sheet-numbering convention.

It contains no credentials, keys, tokens or environment variables, so there is no `.env.example`.

## Hosting

`dist/` is a fully static site: HTML, JS, CSS, an icon and `robots.txt`. All asset paths are relative, so it works from a sub-path such as `https://<org>.github.io/<repo>/`.

**GitHub Pages:** a manual-only workflow is included at `.github/workflows/deploy-pages.yml`. To use it:

1. In **Settings → Pages**, set the source to **GitHub Actions**.
2. Under **Actions**, run **Deploy prototype to GitHub Pages**.

The site is publicly reachable. `robots.txt` and the `noindex` tag discourage search engines, but they are not access control.

The page loads IBM Plex fonts from Google Fonts. Without network access it falls back to system fonts. Nothing else is fetched.
