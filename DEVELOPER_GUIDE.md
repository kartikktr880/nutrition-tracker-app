# Nutrition Tracker Developer Guide

Welcome to the Nutrition Tracker project! This guide will help you get started as a developer, understand the project structure, follow best practices, and contribute effectively.

---

## Table of Contents
- [Project Structure](#project-structure)
- [Setup & Installation](#setup--installation)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Debugging](#debugging)
- [Deployment](#deployment)
- [Common Issues & Tips](#common-issues--tips)
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

- Use feature branches for new work: `git checkout -b feature/your-feature`
- Commit often with clear messages: `git commit -m "feat: Add new meal planner UI"`
- Pull latest changes before pushing: `git pull origin main`
- Push your branch: `git push origin feature/your-feature`
- Open a Pull Request for review
- Address code review feedback promptly

---

## Coding Standards

- **Language:** TypeScript (strict mode)
- **Framework:** React (with Next.js)
- **Linting:** ESLint (`npm run lint`)
- **Formatting:** Prettier (`npm run lint:fix`)
- **Naming:** Use descriptive, camelCase for variables/functions, PascalCase for components
- **Components:** Prefer functional components and hooks
- **State:** Use React context or providers for global state
- **API:** Use async/await, handle errors gracefully
- **Security:** Never commit secrets; use environment variables

---

## Testing

- **Unit tests:** Located in `src/__tests__` and `components/__tests__`
- **Integration tests:** Located in `tests/integration/`
- **Run all tests:**
  ```bash
  npm test
  ```
- **Type checking:**
  ```bash
  npm run type-check
  ```
- **Coverage reports:**
  ```bash
  npm run coverage
  ```

---

## Debugging

- Use browser dev tools for UI debugging
- Use `console.log` or breakpoints for backend/API debugging
- Check logs in the terminal for server errors
- Use `npm run lint` to catch code issues early

---

## Deployment

- **Build the app:**
  ```bash
  npm run build
  ```
- **Deploy to Vercel, Netlify, or your preferred host**
- **Set environment variables on your host**
- **Monitor logs and analytics after deployment**

---

## Common Issues & Tips

- **TypeScript errors:** Run `npm run type-check` and fix all errors before committing
- **Dependency issues:** Delete `node_modules` and `package-lock.json`, then run `npm install`
- **Database errors:** Check your `.env` and run `npx prisma migrate dev`
- **API errors:** Check authentication/session and request payloads
- **Stuck build:** Try `npm run clean` (if available) or clear cache

---

## Resources
- [README.md](./README.md)
- [API.md](./API.md)
- [Prisma Docs](https://www.prisma.io/docs/)
- [Next.js Docs](https://nextjs.org/docs)
- [React Docs](https://reactjs.org/docs/getting-started.html)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

Happy coding! If you have questions, open an issue or ask in Discussions. 