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
- [Expert Error Prevention Guide](#expert-error-prevention-guide)
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
  - Never "force" extra properties into an object literal unless you are intentionally using a type assertion (and document why).

### 3. Error Handling
- Always handle errors gracefully.
  - Use `try/catch` for async code.
  - Log errors with context: `logError('Description:', error);`
  - Never reference an error variable that isn't in scope.

### 4. Testing Discipline
- Keep tests up to date with code changes.
- Mock only what you need in tests, and ensure your mocks match the real class or function signatures.
- Run `npm test` after every significant change.

### 5. Linting and Formatting
- Run `npm run lint` and `npm run lint:fix` before every commit.
- Fix all lint errors and warnings.
  - Don't ignore import order, unused variables, or formatting issues.
- Use Prettier or your team's formatter for consistent code style.

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

- Adding properties to objects that aren't in the type/interface.
- Using variables (like `error`) that aren't defined in the current scope.
- Ignoring or suppressing errors without a clear reason.
- Not updating tests or types after a refactor.
- Pushing code with failing type, lint, or test checks.

---

## 🏆 Pro Tips from Real Debugging Experience

- If you see a type error about "property X does not exist," check the type definition and update it if needed.
- If you need to log extra info, use a `details` property or update the type, don't just add new properties.
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

## 🎯 Expert Error Prevention Guide

### **🚨 CRITICAL: Pre-Development Validation**

Before writing any code, always validate your understanding:

1. **Type Analysis:**
   ```bash
   # Check existing types for your feature area
   grep -r "interface\|type" types/ | grep -i "your-feature"
   grep -r "interface\|type" lib/validations/ | grep -i "your-feature"
   ```

2. **Component Analysis:**
   ```bash
   # Find existing components in your feature area
   find components/ -name "*.tsx" -exec grep -l "your-feature" {} \;
   ```

3. **API Analysis:**
   ```bash
   # Check existing API routes
   find app/api/ pages/api/ -name "*.ts" -exec grep -l "your-feature" {} \;
   ```

### **📋 Feature Addition: Zero-Error Workflow**

#### **Phase 1: Planning & Validation (MANDATORY)**
```bash
# 1. Create feature branch
git checkout -b feature/your-feature-name

# 2. Validate current state
npm run type-check
npm run lint
npm test
npm run build

# 3. Document your plan
echo "# Feature: Your Feature Name" > FEATURE_PLAN.md
echo "- Purpose: [What this feature does]" >> FEATURE_PLAN.md
echo "- Files to modify: [List all files]" >> FEATURE_PLAN.md
echo "- New files to create: [List all new files]" >> FEATURE_PLAN.md
echo "- Types to add/modify: [List all type changes]" >> FEATURE_PLAN.md
```

#### **Phase 2: Type-First Development**
```typescript
// 1. ALWAYS start with types (in types/your-feature.ts)
export interface YourFeatureData {
  id: string;
  name: string;
  // Add ALL properties you need
}

export interface YourFeatureState {
  data: YourFeatureData[];
  loading: boolean;
  error: string | null;
}

// 2. Create validation schemas (in lib/validations/your-feature.ts)
import { z } from 'zod';

export const yourFeatureSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  // Add ALL validations
});
```

#### **Phase 3: Component Development**
```typescript
// 1. Create component with proper types
interface YourFeatureProps {
  data: YourFeatureData[];
  onUpdate: (data: YourFeatureData) => void;
}

export const YourFeature: React.FC<YourFeatureProps> = ({ data, onUpdate }) => {
  // 2. Use proper error handling
  const handleSubmit = async (formData: YourFeatureData) => {
    try {
      await onUpdate(formData);
    } catch (error) {
      logError('YourFeature: Failed to update', error);
      // Handle error appropriately
    }
  };

  return (
    // Your JSX here
  );
};
```

#### **Phase 4: Testing Before Implementation**
```typescript
// 1. Write tests FIRST (in components/__tests__/YourFeature.test.tsx)
import { render, screen, fireEvent } from '@testing-library/react';
import { YourFeature } from '../YourFeature';

describe('YourFeature', () => {
  it('should render correctly', () => {
    const mockData: YourFeatureData[] = [];
    const mockOnUpdate = jest.fn();
    
    render(<YourFeature data={mockData} onUpdate={mockOnUpdate} />);
    
    expect(screen.getByText('Your Feature')).toBeInTheDocument();
  });

  it('should handle errors gracefully', () => {
    // Test error scenarios
  });
});
```

#### **Phase 5: Implementation with Validation**
```bash
# After each significant change, run:
npm run type-check
npm run lint
npm test
npm run build

# If any step fails, STOP and fix before continuing
```

### **🔄 Feature Updates: Safe Modification Workflow**

#### **Step 1: Impact Analysis**
```bash
# Find all usages of what you're changing
grep -r "functionName\|componentName\|typeName" . --exclude-dir=node_modules
grep -r "import.*YourComponent" . --exclude-dir=node_modules
```

#### **Step 2: Backup Current State**
```bash
# Create backup branch
git checkout -b backup/feature-name-$(date +%Y%m%d)
git push origin backup/feature-name-$(date +%Y%m%d)

# Return to your feature branch
git checkout feature/your-feature
```

#### **Step 3: Update Types First**
```typescript
// 1. Update the type definition
export interface UpdatedFeatureData {
  id: string;
  name: string;
  newProperty: string; // Add new property
  // Remove deprecated properties
}

// 2. Update validation schema
export const updatedFeatureSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  newProperty: z.string().optional(),
});
```

#### **Step 4: Update All Usages**
```bash
# Find all files using the old type
grep -r "OldFeatureData" . --exclude-dir=node_modules

# Update each file systematically
# Run type-check after each file update
npm run type-check
```

#### **Step 5: Update Tests**
```typescript
// Update existing tests to match new interface
describe('UpdatedFeature', () => {
  it('should handle new property', () => {
    const mockData: UpdatedFeatureData = {
      id: '1',
      name: 'Test',
      newProperty: 'value'
    };
    // Test implementation
  });
});
```

### **🗑️ Feature Removal: Complete Cleanup Workflow**

#### **Step 1: Comprehensive Analysis**
```bash
# Find ALL references to the feature
grep -r "featureName\|FeatureName\|FEATURE_NAME" . --exclude-dir=node_modules
find . -name "*.tsx" -o -name "*.ts" | xargs grep -l "featureName"
```

#### **Step 2: Remove in Logical Order**
```bash
# 1. Remove API routes first
rm app/api/feature-name/route.ts
rm pages/api/feature-name.ts

# 2. Remove components
rm components/FeatureName.tsx
rm components/__tests__/FeatureName.test.tsx

# 3. Remove types
# Edit types/feature.ts and remove related interfaces

# 4. Remove services
rm services/feature-service.ts

# 5. Remove from pages/routes
# Edit relevant page files
```

#### **Step 3: Update Dependencies**
```bash
# Remove imports from all files
grep -r "import.*FeatureName" . --exclude-dir=node_modules
# Update each file to remove the import
```

#### **Step 4: Clean Database (if applicable)**
```sql
-- If the feature has database tables
-- Create migration to remove tables
-- Update Prisma schema
```

### **🔀 Feature Merging: Conflict Prevention Strategy**

#### **Pre-Merge Validation**
```bash
# 1. Ensure your branch is up to date
git checkout main
git pull origin main
git checkout feature/your-feature
git merge main

# 2. Resolve any conflicts
# 3. Run all checks
npm run type-check
npm run lint
npm test
npm run build

# 4. If any check fails, DO NOT MERGE
```

#### **Merge Conflict Resolution**
```bash
# When conflicts occur:
# 1. Identify the conflict files
git status

# 2. Open each conflicted file
# 3. Look for conflict markers: <<<<<<< HEAD, =======, >>>>>>>
# 4. Decide which changes to keep
# 5. Remove conflict markers
# 6. Save the file
# 7. Add resolved files
git add resolved-file.tsx

# 8. Continue merge
git merge --continue
```

### **🚨 Common Error Patterns & Prevention**

#### **TypeScript Errors**
```typescript
// ❌ WRONG: Adding properties not in type
const user: User = {
  id: '1',
  name: 'John',
  extraProperty: 'value' // TypeScript error!
};

// ✅ CORRECT: Update type first
interface User {
  id: string;
  name: string;
  extraProperty?: string; // Add to type
}

// ❌ WRONG: Using undefined variables
try {
  // some async operation
} catch (error) {
  console.log(error.message); // error might be undefined
}

// ✅ CORRECT: Proper error handling
try {
  // some async operation
} catch (error) {
  if (error instanceof Error) {
    logError('Operation failed:', error);
  } else {
    logError('Unknown error occurred:', error);
  }
}
```

#### **React Component Errors**
```typescript
// ❌ WRONG: Missing required props
<YourComponent /> // Missing required 'data' prop

// ✅ CORRECT: Provide all required props
<YourComponent data={mockData} onUpdate={handleUpdate} />

// ❌ WRONG: Incorrect prop types
<YourComponent data="string" /> // data should be array

// ✅ CORRECT: Match prop types
<YourComponent data={[]} onUpdate={handleUpdate} />
```

#### **API Route Errors**
```typescript
// ❌ WRONG: No error handling
export async function POST(request: Request) {
  const data = await request.json();
  // Process data without error handling
  return Response.json({ success: true });
}

// ✅ CORRECT: Proper error handling
export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // Validate data
    const validatedData = yourFeatureSchema.parse(data);
    
    // Process data
    const result = await processData(validatedData);
    
    return Response.json({ success: true, data: result });
  } catch (error) {
    logError('POST /api/feature failed:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### **🔍 Validation Scripts for Error Prevention**

Create these scripts in your `package.json`:

```json
{
  "scripts": {
    "validate:all": "npm run type-check && npm run lint && npm test && npm run build",
    "validate:types": "npm run type-check",
    "validate:lint": "npm run lint",
    "validate:test": "npm test",
    "validate:build": "npm run build",
    "pre-commit": "npm run validate:all",
    "feature-check": "npm run validate:all && echo '✅ All checks passed - safe to commit!'"
  }
}
```

### **📊 Error Prevention Checklist**

Before every commit, run this checklist:

```bash
#!/bin/bash
# save as scripts/pre-commit-check.sh

echo "🔍 Running pre-commit validation..."

# Type checking
echo "📝 Checking TypeScript..."
npm run type-check
if [ $? -ne 0 ]; then
    echo "❌ TypeScript errors found!"
    exit 1
fi

# Linting
echo "🧹 Checking linting..."
npm run lint
if [ $? -ne 0 ]; then
    echo "❌ Linting errors found!"
    exit 1
fi

# Tests
echo "🧪 Running tests..."
npm test
if [ $? -ne 0 ]; then
    echo "❌ Tests failed!"
    exit 1
fi

# Build
echo "🏗️ Building project..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "✅ All checks passed! Safe to commit."
```

### **🎯 Expert Tips for Zero-Error Development**

1. **Always start with types** - Define your data structures before writing any code
2. **Write tests first** - TDD helps catch errors early
3. **Use strict TypeScript** - Never disable strict mode
4. **Validate at boundaries** - Always validate data at API boundaries
5. **Handle errors explicitly** - Never let errors bubble up silently
6. **Use proper logging** - Log errors with context for debugging
7. **Review your own code** - Read your code as if you're reviewing someone else's
8. **Keep commits small** - Small commits are easier to debug and revert
9. **Use feature flags** - For risky changes, use feature flags to roll back quickly
10. **Monitor in production** - Set up error monitoring to catch issues early

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