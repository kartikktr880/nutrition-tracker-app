# Nutrition Tracker Developer Guide (Expert Edition)

Welcome to the Nutrition Tracker project! This guide is your comprehensive, step-by-step manual for working on this codebase. Whether you are fixing bugs, adding features, or maintaining the project, following this guide will help you avoid errors and ensure high-quality, maintainable code.

---

## Table of Contents
- [Project Structure](#project-structure)
- [Setup & Installation](#setup--installation)
- [Development Workflow](#development-workflow)
- [How to Fix Errors](#how-to-fix-errors)
- [How to Add, Update, or Remove Features](#how-to-add-update-or-remove-features)
- [Coding Standards & Best Practices](#coding-standards--best-practices)
- [Testing & Quality Assurance](#testing--quality-assurance)
- [Build & Deployment](#build--deployment)
- [Common Pitfalls & How to Avoid Them](#common-pitfalls--how-to-avoid-them)
- [Resources](#resources)

---

## Project Structure

```
Nutrition tracker/
├── app/                # Next.js app directory (API routes, components)
├── components/         # Shared React components
├── lib/                # Utility libraries (prisma, auth, etc.)
├── pages/              # Next.js legacy pages and API routes
├── public/             # Static assets (images, icons)
├── scripts/            # Utility scripts
├── services/           # Business logic and integrations
├── styles/             # CSS and style files
├── tests/              # Integration and unit tests
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
├── prisma/             # Prisma schema and migrations
├── config/             # Environment and security configs
├── README.md           # Main documentation
├── API.md              # API documentation
├── DEVELOPER_GUIDE.md  # This file
└── ...
```

---

## Setup & Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/nutrition-tracker.git
   cd nutrition-tracker
   ```
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Set up environment variables:**
   - Copy `config/env.example` to `.env` and fill in required values.
4. **Set up the database:**
   ```bash
   npx prisma migrate dev --name init
   npx prisma generate
   ```
5. **Start the development server:**
   ```bash
   npm start
   ```
   The app will be available at `http://localhost:3000`.

---

## Development Workflow

**Always follow this workflow to avoid errors:**

1. **Pull latest changes:**
   ```bash
   git pull origin main
   ```
2. **Create a new branch for your work:**
   ```bash
   git checkout -b feature/your-feature
   ```
3. **Make your changes (see below for best practices).**
4. **Run all checks before committing:**
   - TypeScript: `npm run type-check`
   - Lint: `npm run lint`
   - Tests: `npm test`
   - Build: `npm run build`
5. **Commit with a clear message:**
   ```bash
   git commit -m "feat: Add new meal planner UI"
   ```
6. **Push your branch:**
   ```bash
   git push origin feature/your-feature
   ```
7. **Open a Pull Request for review.**
8. **Address code review feedback promptly.**

---

## How to Fix Errors

1. **TypeScript Errors:**
   - Run: `npm run type-check`
   - Read the error message and file/line number.
   - Fix the type or code as needed.
   - Re-run until zero errors.

2. **Linting Errors:**
   - Run: `npm run lint`
   - Use `npm run lint:fix` for auto-fixes.
   - Manually fix remaining issues.

3. **Test Failures:**
   - Run: `npm test`
   - Read the test output and debug the code or test.
   - Add or update tests as needed.

4. **Build Errors:**
   - Run: `npm run build`
   - Fix any errors or warnings.

5. **Runtime Errors:**
   - Use the app, check browser/server logs.
   - Add error boundaries and logging.
   - Fix logic or data issues.

6. **Security/Performance/Accessibility:**
   - Run audits (see below) and fix all issues.

**Never ignore errors or warnings! Always fix them before merging.**

---

## How to Add, Update, or Remove Features

### **Adding a Feature**
1. **Plan:** Write down what you want to add and why.
2. **Create a new branch.**
3. **Write/update types first (in `types/` or `lib/validations/`).**
4. **Write/update tests for the new feature.**
5. **Implement the feature in small, logical commits.**
6. **Update documentation if needed.**
7. **Run all checks (type, lint, test, build).**
8. **Open a Pull Request.**

### **Updating a Feature**
1. **Understand the existing code and tests.**
2. **Update types and tests first.**
3. **Make the code change.**
4. **Update docs if needed.**
5. **Run all checks.**
6. **Open a Pull Request.**

### **Removing a Feature**
1. **Find all code, types, and tests related to the feature.**
2. **Remove code, types, and tests in small commits.**
3. **Update docs and UI as needed.**
4. **Run all checks.**
5. **Open a Pull Request.**

**Checklist for Any Change:**
- [ ] Types updated
- [ ] Tests updated/added/removed
- [ ] Docs updated
- [ ] All checks pass (type, lint, test, build)
- [ ] Code reviewed

---

## Coding Standards & Best Practices

- **TypeScript:** Always use strict types. Never use `any` unless absolutely necessary (and document why).
- **React:** Use functional components and hooks. Use error boundaries for critical UI.
- **Naming:** Use descriptive, camelCase for variables/functions, PascalCase for components.
- **State:** Use React context/providers for global state.
- **API:** Use async/await, handle errors gracefully.
- **Security:** Never commit secrets. Use environment variables.
- **Code Reviews:** Always get a review before merging.
- **Documentation:** Update docs for any public API or major change.
- **Commits:** Make small, focused commits with clear messages.

---

## Testing & Quality Assurance

- **Unit tests:** In `src/__tests__` and `components/__tests__`.
- **Integration tests:** In `tests/integration/`.
- **Run all tests:**
  ```bash
  npm test
  ```
- **Type checking:**
  ```bash
  npm run type-check
  ```
- **Linting:**
  ```bash
  npm run lint
  npm run lint:fix
  ```
- **Coverage reports:**
  ```bash
  npm run coverage
  ```
- **Accessibility:** Use tools like axe, Lighthouse, or browser dev tools.
- **Performance:** Use Lighthouse, WebPageTest, or similar.
- **Security:** Run `npm audit` and fix vulnerabilities.

---

## Build & Deployment

- **Build the app:**
  ```bash
  npm run build
  ```
- **Deploy to Vercel, Netlify, or your preferred host.**
- **Set environment variables on your host.**
- **Monitor logs and analytics after deployment.**

---

## 🛡️ Expert Coding Guidelines for Nutrition Tracker

### 1. Strict Type Safety
- Never ignore TypeScript errors. Always run `npm run type-check` before committing.
- Use explicit types for all function arguments, return values, and object shapes.
- Avoid `any` unless absolutely necessary, and always document why if you must use it.
- When using external types (e.g., from libraries), always check their definitions before extending or using them in your code.

### 2. Respect Type Definitions
- Only use properties defined in the type/interface.
  - If you need to add a property (e.g., `userId`, `action`, `endpoint`), update the type definition in `/types` or `/utils` first.
  - Never “force” extra properties into an object literal unless you are intentionally using a type assertion (and document why).

### 3. Error Handling
- Always handle errors gracefully.
  - Use `try/catch` for async code.
  - Log errors with context: `logError('Description:', error);`
  - Never reference an error variable that isn’t in scope.

### 4. Testing Discipline
- Keep tests up to date with code changes.
- Mock only what you need in tests, and ensure your mocks match the real class or function signatures.
- Run `npm test` after every significant change.

### 5. Linting and Formatting
- Run `npm run lint` and `npm run lint:fix` before every commit.
- Fix all lint errors and warnings.
  - Don’t ignore import order, unused variables, or formatting issues.
- Use Prettier or your team’s formatter for consistent code style.

### 6. Documentation and Comments
- Document all public functions, classes, and complex logic.
- If you use a workaround (like `as any`), add a comment explaining why and, if possible, a TODO for a better solution.

### 7. Type-Driven Development
- Start by defining or updating types before writing new features or refactoring.
- Use types as contracts between modules and teams.

### 8. Safe Refactoring
- When changing a type/interface, search the codebase for all usages and update them.
- After refactoring, run type-check, lint, and tests to catch regressions.

### 9. Consistent Logging
- Use the provided logging utilities (`logError`, `logWarn`, `logInfo`, `logDebug`) for all logs.
- Never log sensitive data.

### 10. Code Review Checklist
- [ ] Types are correct and up to date.
- [ ] No TypeScript, lint, or test errors.
- [ ] No unused or commented-out code.
- [ ] All new code is documented.
- [ ] All changes are tested.

---

## 🧑‍💻 Step-by-Step Workflow for New Developers

1. Pull the latest code and dependencies.
2. Create a new branch for your work.
3. Define or update types for your feature or fix.
4. Write or update tests.
5. Implement your code.
6. Run:
   - `npm run type-check`
   - `npm run lint`
   - `npm test`
   - `npm run build`
7. Fix all errors and warnings.
8. Document your changes.
9. Commit and push your branch.
10. Open a Pull Request and request review.
11. Respond to feedback and update your code as needed.
12. Merge only when all checks pass.

---

## 🚩 Common Pitfalls to Avoid (Expanded)

- Adding properties to objects that aren’t in the type/interface.
- Using variables (like `error`) that aren’t defined in the current scope.
- Ignoring or suppressing errors without a clear reason.
- Not updating tests or types after a refactor.
- Pushing code with failing type, lint, or test checks.

---

## 🏆 Pro Tips from Real Debugging Experience

- If you see a type error about “property X does not exist,” check the type definition and update it if needed.
- If you need to log extra info, use a `details` property or update the type, don’t just add new properties.
- When in doubt, read the type definition!
- If you must use `as any`, add a comment and open a TODO to fix it later.
- Always run all checks before pushing or merging.

---

## ✅ Pull Request Checklist Template

Before submitting a PR, copy and fill out this checklist in your PR description:

```
### Pull Request Checklist
- [ ] My branch is up to date with main
- [ ] All TypeScript checks pass (`npm run type-check`)
- [ ] All lint checks pass (`npm run lint`)
- [ ] All tests pass (`npm test`)
- [ ] The app builds successfully (`npm run build`)
- [ ] Types are correct and up to date
- [ ] No unused or commented-out code
- [ ] All new code is documented
- [ ] All changes are tested
- [ ] No secrets or sensitive data in code or logs
- [ ] I have reviewed the code for security and performance
- [ ] I have updated documentation as needed
- [ ] I have requested a code review
```

---

## 🛠️ Setting Up Pre-Commit Hooks for Code Quality

To prevent errors from reaching the repository, set up pre-commit hooks using [Husky](https://typicode.github.io/husky/):

1. **Install Husky:**
   ```bash
   npm install husky --save-dev
   npx husky install
   npm set-script prepare "husky install"
   ```
2. **Add Pre-Commit Hook:**
   ```bash
   npx husky add .husky/pre-commit "npm run type-check && npm run lint && npm test"
   ```
3. **Verify:**
   - Now, every time you commit, type-check, lint, and tests will run automatically. The commit will be blocked if any check fails.

---

## 🏅 Maintaining Code Quality: Expert Recommendations

- **Always run all checks before pushing or merging.**
- **Keep dependencies up to date** and run `npm audit` regularly.
- **Review all code for security, performance, and accessibility.**
- **Write clear, descriptive commit messages.**
- **Use feature branches for all work.**
- **Never commit secrets or sensitive data.**
- **Document all public APIs and major changes.**
- **Refactor regularly to keep code clean and maintainable.**
- **Encourage code reviews and pair programming.**
- **Automate as much as possible (CI/CD, formatting, testing).**

---

## 📚 Additional Resources for Developers

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Husky Docs](https://typicode.github.io/husky/)
- [Prettier](https://prettier.io/)
- [ESLint](https://eslint.org/)
- [Jest](https://jestjs.io/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [OWASP Top 10 Security](https://owasp.org/www-project-top-ten/)

---

**By following this guide, you will avoid common mistakes and ensure your work is error-free, maintainable, and production-ready. If you have questions, open an issue or ask in Discussions.** 