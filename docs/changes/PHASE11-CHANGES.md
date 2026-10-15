# Phase 11 changes (F11a: Admin web foundation, login and dashboard)

First phase of the Admin portal. It adds a new app, `apps/admin-web` (Next.js), and a few shared-package files. The student app is untouched.
Copy every file in this zip into your project (after Phases 1 to 10), keeping the folder paths. Each code file starts with a comment giving its own path.

## 1. Install (once)

From the project root:

```bash
npm install
cp apps/admin-web/.env.example apps/admin-web/.env.local
```

`npm install` picks up the new `apps/admin-web` workspace (Next.js 15, React 19, the Plus Jakarta Sans font package). If npm reports a React version conflict with the Expo app, set the `react` and `react-dom` versions in `apps/admin-web/package.json` to the ones Expo asked for in `apps/mobile`.

## 2. Run

```bash
npm run dev:admin
```

Open http://localhost:3001 and sign in with **admin@mastara.demo** / **admin123**.

## 3. What to try

- Open http://localhost:3001/students while signed out: you land on the login page and return to Students after signing in.
- Wrong password, or a phone number such as 0911223344: "Wrong email, phone or password."
- Dashboard: four numbers, new-students chart, Needs attention (each row opens its page), Recent activity.
- Click every menu item: each opens a "Coming in F11x" page. Narrow the window under 900 px to see the sidebar become a drawer.
- Log out (top right) returns to the login page.

## 4. Checks

```bash
npm run typecheck
```

## Admin phases ahead

F11b Students · F11c Courses and catalog · F11d Content · F11e Scan to PDF · F11f Questions and COC · F11g Payments · F11h Pricing and Audit Log · F11i Notifications and support (no design yet). See `docs/ROADMAP.md`.

## Decisions to confirm

- **Colours:** the designs show green and amber chips (Published, Pending, Free sample). The project rule allows only four colours, so chips use tints of blue, red and the dark ink colour, always with a text label. The sidebar uses the dark ink colour (a little less blue than the design's navy).
- **Sidebar and routes:** the sidebar has the 9 items of the design sheets. Routes follow your folder structure (`/catalog/courses`, `/commerce/payments`, `/commerce/pricing`). The longer menu in SRS section 4.3 (Universities, Programs, Entitlements, Devices, Reports, Settings …) is covered inside these pages in the later phases; say if you want separate menu items.
- **Middleware location:** it is `src/middleware.ts` (Next.js requires it inside `src` when `src` exists), not at the app root as the folder-structure sketch shows.
- **Admin text** is English only (SRS section 6) in `packages/i18n/src/admin/en.json`.

## Removed in Phase 11

- none

## Added or changed

**./**

- .gitignore
- .prettierignore
- README.md
- eslint.config.mjs
- package.json
- turbo.json

**apps/admin-web/**

- .env.example
- next-env.d.ts
- next.config.ts
- package.json
- tsconfig.json

**apps/admin-web/src/**

- middleware.ts

**apps/admin-web/src/app/**

- globals.css
- layout.tsx
- page.tsx

**apps/admin-web/src/app/(auth)/login/**

- page.tsx

**apps/admin-web/src/app/(portal)/**

- layout.tsx

**apps/admin-web/src/app/(portal)/audit/**

- page.tsx

**apps/admin-web/src/app/(portal)/catalog/courses/**

- page.tsx

**apps/admin-web/src/app/(portal)/commerce/payments/**

- page.tsx

**apps/admin-web/src/app/(portal)/commerce/pricing/**

- page.tsx

**apps/admin-web/src/app/(portal)/content/**

- page.tsx

**apps/admin-web/src/app/(portal)/dashboard/**

- page.tsx

**apps/admin-web/src/app/(portal)/questions/**

- page.tsx

**apps/admin-web/src/app/(portal)/scan-to-pdf/**

- page.tsx

**apps/admin-web/src/app/(portal)/students/**

- page.tsx

**apps/admin-web/src/core/config/**

- env.ts

**apps/admin-web/src/core/i18n/**

- adminText.ts
- index.ts

**apps/admin-web/src/core/mock/**

- delay.ts
- index.ts

**apps/admin-web/src/core/mock/data/**

- adminAccounts.ts
- audit.ts
- dashboard.ts
- index.ts

**apps/admin-web/src/core/navigation/**

- adminNav.ts
- index.ts

**apps/admin-web/src/core/network/**

- ApiError.ts
- index.ts

**apps/admin-web/src/core/session/**

- SessionProvider.tsx
- browserCookie.ts
- cookie.ts
- index.ts
- readSession.ts

**apps/admin-web/src/core/theme/**

- ThemeStyle.tsx
- cssVariables.ts
- index.ts

**apps/admin-web/src/modules/auth/**

- index.ts

**apps/admin-web/src/modules/auth/api/**

- auth.api.ts

**apps/admin-web/src/modules/auth/hooks/**

- useAdminLogin.ts

**apps/admin-web/src/modules/auth/screens/**

- LoginScreen.module.css
- LoginScreen.tsx

**apps/admin-web/src/modules/coming-soon/**

- index.ts

**apps/admin-web/src/modules/coming-soon/screens/**

- ComingSoonScreen.module.css
- ComingSoonScreen.tsx

**apps/admin-web/src/modules/dashboard/**

- index.ts

**apps/admin-web/src/modules/dashboard/api/**

- dashboard.api.ts

**apps/admin-web/src/modules/dashboard/components/**

- ActivityList.module.css
- ActivityList.tsx
- AttentionList.module.css
- AttentionList.tsx
- StatCard.module.css
- StatCard.tsx
- WeeklyBars.module.css
- WeeklyBars.tsx

**apps/admin-web/src/modules/dashboard/hooks/**

- useDashboard.ts

**apps/admin-web/src/modules/dashboard/screens/**

- DashboardScreen.module.css
- DashboardScreen.tsx

**apps/admin-web/src/modules/shell/**

- index.ts

**apps/admin-web/src/modules/shell/components/**

- PortalShell.module.css
- PortalShell.tsx
- Sidebar.module.css
- Sidebar.tsx
- Topbar.module.css
- Topbar.tsx

**apps/admin-web/src/shared/hooks/**

- index.ts
- useAsync.ts

**apps/admin-web/src/shared/ui/**

- Badge.module.css
- Badge.tsx
- Button.module.css
- Button.tsx
- Card.module.css
- Card.tsx
- PageHeader.module.css
- PageHeader.tsx
- StateMessage.module.css
- StateMessage.tsx
- TextField.module.css
- TextField.tsx
- index.ts

**docs/**

- ARCHITECTURE.md
- ROADMAP.md

**docs/changes/**

- PHASE11-CHANGES.md

**packages/contracts/src/**

- admin.ts
- index.ts

**packages/domain/src/**

- index.ts

**packages/domain/src/constants/**

- admin.ts

**packages/i18n/src/**

- index.ts

**packages/i18n/src/admin/**

- en.json
