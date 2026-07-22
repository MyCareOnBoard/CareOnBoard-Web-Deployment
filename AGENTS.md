# Repository Guidelines

## Project Structure & Module Organization

This repository hosts Firebase Functions v2 and Firestore configuration for CareOnboard. Root files such as `firebase.json`, `firestore.rules`, and `firestore.indexes.json` control deployment and database behavior. Runtime code lives in `functions/`; `functions/index.js` registers every deployable function.

Keep HTTP endpoints grouped by audience in `functions/routes/` (`agency-routes/`, `application-routes/`, `shared-routes/`, and others). Put reusable business logic in `functions/services/` or `functions/utils/`, request guards in `functions/middleware/`, scheduled work in `functions/scheduled/`, and Firestore event handlers in `functions/triggers/`. Tests belong in `functions/test/*.test.js`; a few utility-specific tests are colocated beside their modules. Treat `functions/old/` as archival code, not an implementation template.

## Build, Test, and Development Commands

Run package commands from `functions/` using Node 22.

- `pnpm install` installs dependencies from `functions/pnpm-lock.yaml`.
- `pnpm test` runs all native Node test files once.
- `node --test test/example.test.js` runs one focused test file.
- `node --check index.js` checks a module for syntax errors.
- `pnpm serve` starts the Functions emulator.
- `pnpm logs` reads Firebase Functions logs.
- `pnpm deploy:batched` deploys functions in controlled batches.
- `pnpm deploy:indexes` deploys Firestore rules and indexes.

For a targeted manual deployment, run from `functions/`: `firebase deploy --only functions:agencyApplicants,functions:notificationDeliveryTrigger --project care-on-board`.

## Coding Style & Naming Conventions

Use CommonJS (`require`/`module.exports`), two-space indentation, semicolons, and double quotes, matching nearby files. Use `camelCase` for functions and variables, `PascalCase` for constructors, and kebab-case filenames such as `reference-confirmation-service.js`. Keep route modules thin by injecting dependencies and moving reusable logic into services. Register new exported functions in `functions/index.js` and preserve deployed export names unless a migration is intentional.

## Testing Guidelines

Tests use `node:test` and `node:assert/strict`. Name files `*.test.js` and describe observable behavior, authorization boundaries, database selection, retries, and error semantics. Use isolated fake Firestore clients rather than production services. Add regression coverage for every fix. Before submission, run focused tests, `pnpm test`, syntax checks for changed modules, and `git diff --check`.

## Commit & Pull Request Guidelines

Follow Conventional Commits, for example `feat(references): add confirmation workflows` or `ci(functions): configure deploy secrets`. Keep commits focused. Pull requests should summarize API or data-model impact, list tests, identify functions requiring deployment, and note any Firestore index, rule, parameter, or secret changes.

## Security & Configuration

Never commit service-account JSON, `.env` files, tokens, keys, or real healthcare data. Define sensitive values with Firebase `defineSecret`; use `defineString` or deployment environment files only for non-secret parameters. Preserve authentication, agency isolation, and named-database selection through the existing middleware and `getDb` patterns. Test destructive migrations against emulators and retain their explicit production confirmation guards.
