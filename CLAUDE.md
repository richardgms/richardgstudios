# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Richard G Studios** is a Next.js 16 AI-powered workspace with two modules:
- **NanoBanana Studio**: Prompt exploration, AI image/video generation via Google Gemini API
- **PromptSave**: Personal prompt vault with folders, drag-and-drop reordering, and color tagging

## Commands

```bash
npm run dev       # Dev server on localhost:3000
npm run build     # Production build
npm run start     # Serve production build
npm run lint      # ESLint (next/core-web-vitals + TypeScript)
```

## Architecture

### Module System
The app uses Next.js route groups for module isolation:
- `src/app/(studio)/` — Studio routes (browse, studio, brainstorm, projects, gallery, favorites, history, trash)
- `src/app/(promptsave)/` — PromptSave routes (vault)
- `src/app/page.tsx` — Hub page (module selector)
- `src/components/module-rail.tsx` — Left icon rail for module switching

### Key Libraries
- **State**: Zustand (`src/lib/store.ts`) — single `useAppStore` for UI, generation, attachments, and session state
- **Database**: better-sqlite3 with SQLite (`src/lib/db.ts`) — 11 tables + FTS5 virtual table, WAL mode, soft deletes
- **AI**: `@google/genai` — Gemini models for image generation, Veo for video
- **UI**: Tailwind CSS 4, Framer Motion, Lucide React icons

### Database
SQLite database created at runtime in `data/studio.db`. Schema and migrations are in `src/lib/db.ts`. Key tables: `projects`, `sessions`, `generations`, `chat_sessions`, `chat_messages`, `ps_folders`, `ps_prompts`, `character_vault`.

### Image Generation Flow
1. Client sends prompt + model + attachments to `POST /api/generate`
2. Zod validation (`GenerateSchema`)
3. Attachments processed (base64, 4MB limit)
4. Gemini API call (model selected from `src/lib/model-config.ts`)
5. Result saved to `storage/` directory + database record
6. Video generation uses async polling via `useVideoPolling` hook

### Supported Models (defined in `src/lib/model-config.ts`)
- `flash`, `nb-pro`, `pro` — image generation (up to 8 attachment slots)
- `imagen` — Imagen 4.0 Ultra (no attachments)
- `veo-3.1`, `veo-3.1-fast` — video generation (1 attachment)

### Attachment System
Slot-based (0–8 slots per model). Each slot stores base64 image data + position/scale metadata. Compression handled by `src/lib/image-utils.ts`.

## Environment

Requires `GEMINI_API_KEY` in `.env.local`.

## Path Alias

`@/*` maps to `./src/*` (configured in tsconfig.json).

## Style Conventions

- Dark theme with indigo accent (#6366f1)
- Custom fonts: Outfit (display), Inter (body), JetBrains Mono (code)
- Heavy use of `"use client"` directives — most components are client-side
- SVG animations loaded via `next/dynamic` to avoid SSR issues
- README is in Portuguese
