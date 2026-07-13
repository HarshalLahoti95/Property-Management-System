# Property Management System (PMS) Monorepo

Welcome to the PMS Monorepo. This repository houses all applications and shared packages for the Property Management System under a single unified workspace using **pnpm workspaces** and **TypeScript**.

## Project Structure

```
root/
├── .github/                # GitHub configurations (CI/CD, templates)
├── apps/
│   ├── api/                # NestJS Backend API Application (@pms/api)
│   └── web/                # Next.js Frontend Application (@pms/web)
├── docs/                   # Documentation files
├── packages/               # Shared Workspace Packages
│   ├── config/             # Shared system configurations (@pms/config)
│   ├── types/              # Common TypeScript interfaces (@pms/types)
│   ├── ui/                 # Shared UI components library (@pms/ui)
│   └── utils/              # Helper utilities and functions (@pms/utils)
├── scripts/                # Utility shell scripts
├── package.json            # Root workspace configuration
├── pnpm-workspace.yaml     # pnpm workspace definition
└── README.md               # You are here!
```

---

## Workspace Mechanisms (How Workspaces Work)

This project leverages **pnpm workspaces** to manage packages and dependencies within the repository.

1. **Workspace Definition**: The `pnpm-workspace.yaml` file in the root tells pnpm that any subfolders under `apps/` and `packages/` are part of the workspace.
2. **Local Symlinking**: When you run `pnpm install`, pnpm resolves internal dependencies (such as `@pms/types` or `@pms/ui`) by symlinking them directly from the local filesystem (`packages/*`) to each application's local `node_modules/@pms/` folder.
3. **Importing Shared Packages**: Applications can import shared packages directly as if they were NPM packages:
   ```typescript
   import { User } from '@pms/types';
   import { APP_CONFIG } from '@pms/config';
   ```
4. **Local Updates**: Changes made to shared packages are instantly reflected in the running applications without needing an intermediate publish or build step.

---

## How to Install Dependencies

To install all dependencies and set up the local symlinks across the entire workspace, run the following command in the workspace root:

```bash
pnpm install
```

*Note: If you do not have `pnpm` installed globally, you can prefix it using `npx`:*

```bash
npx pnpm install
```

---

## How to Start the Applications

You can start both applications at the same time, or start them individually.

### 1. Start Both Applications Simultaneously
We have configured a recursive script at the root `package.json` to start all applications in development mode:

```bash
pnpm dev
```
*(Or `npx pnpm dev`)*

### 2. Start a Specific Application

To start only the backend API:
```bash
pnpm --filter @pms/api start:dev
```

To start only the frontend Web application:
```bash
pnpm --filter @pms/web dev
```

---

## Workspace Package Inventory

| Package Name | Path | Description |
|---|---|---|
| `@pms/web` | `apps/web` | Next.js frontend (App Router, TypeScript, TailwindCSS, ESLint) |
| `@pms/api` | `apps/api` | NestJS backend (TypeScript) |
| `@pms/ui` | `packages/ui` | Shared UI components |
| `@pms/types` | `packages/types` | Shared TypeScript types/interfaces |
| `@pms/utils` | `packages/utils` | Shared utility/helper functions |
| `@pms/config` | `packages/config` | Shared configurations |
