# Nutrition Tracker

A comprehensive web application for tracking nutrition, meal planning, and health goals.

## Features

### Core Features

- **Nutrition Tracking**: Food logging with calorie and macro calculations
- **Meal Planning**: AI-powered meal plan generation
- **User Dashboard**: Progress tracking and analytics
- **Water Intake Tracking**: Hydration monitoring
- **Barcode Scanner**: Quick food entry via scanning
- **PWA Support**: Offline functionality and mobile app-like experience
- **Internationalization**: Multi-language support
- **AI Recommendations**: Personalized nutrition suggestions
- **Voice Commands**: Hands-free interaction
- **Third-party Integrations**: Fitness tracker synchronization

### Target Audience
- Health-conscious individuals tracking their diet
- Fitness enthusiasts monitoring macros
- People with dietary restrictions (keto, vegan, diabetic)
- Nutritionists and dietitians
- Athletes needing precise nutritional monitoring
- Weight loss seekers following structured meal plans

## Technical Implementation

### Architecture

The application is built using a component-based architecture with React and TypeScript. Key architectural features include:

- **Custom Hooks**: Encapsulate and reuse complex logic
- **Service Layer**: Abstract core functionality like storage and authentication
- **Type Safety**: Comprehensive TypeScript types for all data structures
- **Error Handling**: Robust error management with user-friendly feedback
- **Strict modularity**: Each feature is self-contained in its own folder under `app/` (see PROJECT_BLUEPRINT.md)

### Key Files and Components

- **App.tsx**: Main application component with routing and authentication state
- **components/NutritionTracker.tsx**: Core nutrition tracking functionality
- **components/MealPlanner.tsx**: Main meal planning interface
- **components/meal-planning/**: Specialized meal planning components
  - **MealPlanCreator.tsx**: Wizard for creating new meal plans
  - **MealPlanViewer.tsx**: Detailed view of existing meal plans
  - **MealAdder.tsx**: Interface for adding meals to plans
- **services/auth.ts**: Authentication service with token management
- **services/storage.ts**: Data persistence service
- **utils/logger.ts**: Logging utility with multiple log levels
- **utils/dateUtils.ts**: Date formatting and manipulation utilities
- **hooks/useAuth.ts**: Authentication hook for components

## Implementation Phases (Summary)
- **Phase 1:** Critical issues (routing, CSS, security, DB, auth, validation, accessibility, responsive design)
- **Phase 2:** High priority (performance, state, tests, monitoring, SEO, PWA, validation, caching, i18n, security headers, CSRF, images, CI/CD)
- **Phase 3:** Core features (water tracker, barcode, food logger, meal planning, analytics, achievements, data portability)
- **Phase 4:** Medium fixes (state, error handling, caching, monitoring, service worker, images, CSRF, rate limiting, API docs)
- **Phase 5:** Enhancements (dark mode, customization, voice, AI, integrations)

## Security & Performance (Highlights)
- NextAuth.js, JWT, RBAC, session management
- Zod validation, SQLi/XSS/CSRF protection
- CSP, security headers, rate limiting
- Code splitting, image optimization, caching, DB optimization, monitoring

## Testing & Quality Assurance
- Unit, integration, and E2E tests (Jest, Playwright)
- Accessibility (WCAG 2.1 AA), performance audits (Lighthouse)
- Security audits, code quality, pre-commit hooks

## Deployment & CI/CD
- GitHub Actions: lint, type-check, test, audit, build, deploy
- Vercel hosting, environment management, monitoring

## Troubleshooting
- See DEVELOPER_GUIDE.mdC for error handling, build/test issues, and debug tools

## Project Status Summary
- All core features and technical requirements completed
- Production-ready, accessible, secure, and performant
- See PROJECT_BLUEPRINT.md for architecture and future plans

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation
1. Clone the repository
```bash
git clone https://github.com/yourusername/nutrition-tracker.git
cd nutrition-tracker
```
2. Install dependencies
```bash
npm install
# or
yarn install
```
3. Start the development server
```bash
npm start
# or
yarn start
```
4. Open your browser to `http://localhost:3000`

## Future Enhancements
- Data Visualization: Charts and graphs for nutrition trends
- Social Features: Share meal plans and progress with friends
- AI Recommendations: Smart meal suggestions based on preferences and goals
- Barcode Scanner: Scan food packages for quick nutritional information
- Export/Import: Export data to CSV or PDF formats

---

## See Also
- [Project Blueprint](PROJECT_BLUEPRINT.md)
- [Developer Guide](.cursor/DEVELOPER_GUIDE.mdC)
- [API Reference](API.md) 