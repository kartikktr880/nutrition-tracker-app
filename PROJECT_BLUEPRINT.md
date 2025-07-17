# Nutri Track App – Project Blueprint (Expert Restructured Edition)

---

## 1. Project Overview

**Nutri Track App** is a modern, modular nutrition, fitness, and wellness tracking platform. It enables users to log meals, track exercise, monitor water intake, analyze health data, and receive personalized recommendations. The app integrates with external services (e.g., Fitbit), provides advanced analytics, and supports data portability.

---

## 2. Technology Stack

- **Frontend:** Next.js (App Router), React 18, TypeScript, Tailwind CSS, CSS Modules
- **Backend:** Next.js API routes (Node.js/Express style)
- **Database:** Prisma ORM (PostgreSQL recommended)
- **State Management:** Zustand
- **Form Handling:** React Hook Form + Zod
- **Authentication:** NextAuth.js
- **Testing:** Jest, React Testing Library, Playwright
- **Other:** MSW (Mock Service Worker), Storybook, GitHub Actions (CI/CD), Sentry (monitoring)

---

## 3. Directory & File Structure (Expert Modular)

```
Nutri Track app/
├── app/                # Next.js app directory (pages, API routes, feature modules)
│   ├── analytics/      # Analytics dashboard (feature module)
│   ├── dashboard/      # Main dashboard (feature module)
│   ├── exercise/       # Exercise tracking (feature module)
│   ├── food-logger/    # Food logging (feature module)
│   ├── meal-plan/      # Meal planning (feature module)
│   ├── performance/    # Performance analytics (feature module)
│   ├── water-tracker/  # Water intake tracking (feature module)
│   ├── layout.tsx      # App-wide layout
│   └── page.tsx        # App entry point
├── components/         # Shared, cross-feature React components (Button, Card, Header, ErrorBoundary, etc.)
├── hooks/              # Custom React hooks (useAuth, useAnalytics, etc.)
├── lib/                # Core utilities, Prisma, shared logic
├── services/           # Business logic, analytics, recommendations, monitoring
├── styles/             # Tailwind config, CSS Modules, global styles
│   ├── base/           # Reset, accessibility, critical CSS
│   ├── components/     # Component-level styles
│   ├── layout/         # Grid, layout utilities
│   └── utils/          # Animations, utility classes
├── types/              # TypeScript type definitions (deduplicated, domain-organized)
├── utils/              # General-purpose helpers, logging, audit, backup
├── prisma/             # Database schema and migrations
├── public/             # Static assets (images, icons, manifest)
├── docs/               # Documentation, audit reports, guides
├── tasks/              # Taskmaster AI files only
├── scripts/            # Essential migration, audit, and utility scripts
├── config/             # Environment and security config
├── tests/              # All integration and unit tests
├── translations/       # i18n JSON files
├── README.md           # Main documentation
├── API.md              # API documentation
├── PROJECT_BLUEPRINT.md# This blueprint
└── ...                 # (No legacy HTML, fix, or deprecated files)
```

---

## 4. Key Principles & Best Practices

- **Strict modularity:** Each feature is self-contained in its own folder under `app/`.
- **Shared code only in** `components/`, `lib/`, `services/`, `utils/`, and `types/`.
- **TypeScript everywhere.**
- **Tailwind CSS and CSS Modules** for all styling.
- **Centralized state management** (Zustand); remove legacy state logic.
- **All user-facing text** in translation files (`translations/`).
- **Automated testing and CI/CD** (Jest, Playwright, GitHub Actions).
- **Document all architectural decisions and migrations** in `docs/`.
- **No legacy HTML, fix, or temp files** in the root or feature folders.
- **Accessibility and responsiveness** are first-class requirements.

---

## 5. Data Flow & API Structure

- **Frontend** (Next.js/React) calls **API routes** (under `app/api/`) for all data operations (CRUD, analytics, sync, etc.)
- **API routes** use **Prisma ORM** to interact with the database
- **State** is managed via Zustand and custom hooks
- **External integrations** (e.g., Fitbit) handled via dedicated API endpoints
- **Data import/export** via API and scripts

---

## 6. Database Schema (prisma/schema.prisma)
- **Users:** Authentication, profile, preferences
- **Meals:** Food logs, nutritional info
- **Exercises:** Sessions, templates, analytics
- **Water:** Daily intake logs
- **Goals:** User goals (nutrition, exercise)
- **Integrations:** Linked accounts (e.g., Fitbit)
- **Logs:** Activity, error, audit

---

## 7. Testing & Quality Assurance

- **Unit tests:** For components, hooks, utilities
- **Integration tests:** For API endpoints, data flow
- **End-to-end tests:** Playwright for user flows
- **Mock Service Worker (MSW):** For API mocking in tests
- **Coverage:** Automated reports in `coverage/`
- **CI/CD:** GitHub Actions for build, test, and deploy

---

## 8. Extensibility & Future-Proofing

- **Modular architecture:** Easy to add new features/pages/components
- **Separation of concerns:** UI, business logic, data, and config are cleanly separated
- **Environment config:** Use `.env` and `config/` for secrets and settings
- **Documentation:** Rich Markdown docs for onboarding and maintenance
- **Accessibility:** ARIA, keyboard navigation, color contrast
- **Internationalization:** Easy to add new languages
- **Taskmaster AI:** For project management, task breakdown, and workflow automation

---

## 9. Onboarding & Development Workflow

1. **Clone the repo & install dependencies**
2. **Set up environment variables** (copy `config/env.example` to `.env`)
3. **Run database migrations** (`prisma migrate dev`)
4. **Start the dev server** (`npm run dev`)
5. **Run tests** (`npm test`)
6. **Use Taskmaster AI** for task management (`tasks/` directory)
7. **Read docs** in `docs/` and Markdown files for feature guides

---

## 10. Key Files & Their Roles

- `App.tsx` – Main React app entry
- `app/layout.tsx` – App-wide layout
- `app/page.tsx` – Main landing page
- `app/api/*/route.ts` – API endpoints
- `prisma/schema.prisma` – Database schema
- `lib/` – Core logic, hooks, services
- `services/` – Analytics, recommendations, monitoring
- `components/` – Shared UI components
- `styles/` – Tailwind config, CSS modules, global styles
- `tasks/` – Taskmaster AI project management
- `config/` – Environment and security config
- `translations/` – i18n files
- `docs/` – Documentation

---

## 11. Project Management (Taskmaster AI)

- **tasks/** contains AI-generated and managed tasks, subtasks, and progress files
- **Taskmaster** is used for planning, tracking, and automating development workflow
- **Refer to `PROJECT_BLUEPRINT.md` and `tasks/` for onboarding and progress tracking**

---

## 12. Contribution & Best Practices

- Follow code style and linting rules
- Write and update tests for new features
- Update documentation as needed
- Use feature branches and pull requests
- Review and update Taskmaster tasks for all major changes

---

## 13. Further Reading

- [API.md](API.md)
- [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md)
- [ADVANCED_ANALYTICS.md](ADVANCED_ANALYTICS.md)
- [DARK_MODE.md](DARK_MODE.md)
- [Nutrition_Tracker_Complete_Guide.md](Nutrition_Tracker_Complete_Guide.md)

---

**This blueprint reflects the expert, modern, and maintainable structure of the Nutri Track app. Use it for onboarding, architecture reference, and future development.** 