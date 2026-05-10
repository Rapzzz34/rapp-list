# NeonWatch

Personal media tracker untuk Korean dramas, webtoons, short Chinese dramas, dan konten Indonesia. Dark neon aesthetic dengan purple accent.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — jalankan API server (port 8080)
- `pnpm --filter @workspace/drakor-list run dev` — jalankan frontend (port dinamis)
- `pnpm run typecheck` — full typecheck semua package
- `pnpm run build` — typecheck + build semua package
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks dan Zod schemas dari OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL`, `DEFAULT_OBJECT_STORAGE_BUCKET_ID`, `PRIVATE_OBJECT_DIR`, `PUBLIC_OBJECT_SEARCH_PATHS`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19 + Vite, TailwindCSS, shadcn/ui, wouter (routing), TanStack Query
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (dari OpenAPI spec)
- Build: esbuild (CJS bundle)
- Object Storage: Replit Object Storage (Google Cloud Storage backend)

## Where things live

- `lib/db/src/schema/media.ts` — DB schema (source of truth)
- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth untuk API contract)
- `lib/api-client-react/src/generated/` — generated React Query hooks
- `lib/api-zod/src/generated/` — generated Zod schemas
- `lib/object-storage-web/src/` — `useUpload` hook untuk file upload dari frontend
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/api-server/src/lib/` — objectStorage.ts, objectAcl.ts, storage.ts utilities
- `artifacts/drakor-list/src/pages/` — halaman utama (dashboard, category-list)

## Architecture decisions

- Contract-first API: OpenAPI spec → codegen → typed hooks dan Zod validators
- Object storage pakai two-step presigned URL flow: frontend minta URL ke `/api/storage/uploads/request-url`, lalu upload langsung ke GCS
- `imageUrl` di DB menyimpan serving URL lengkap (`/api/storage/objects/uploads/uuid`) bukan objectPath
- UI labels dalam Bahasa Indonesia
- Edit/delete buttons selalu visible (bukan hover-only) — user preference kuat

## Product

- Dashboard: stat pills (total, nonton, selesai, planned), global progress bar, category rows dengan progress
- Category list: filter status + genre, episode tracking (+1 ep / ✓ Selesai untuk movie), poster upload langsung dari device
- 4 kategori: K-Dramas, Webtoons, Short Dracin, Indo
- 4 status: Plan to Watch, Watching, Completed, Dropped

## User preferences

- UI dalam Bahasa Indonesia
- Tombol edit/delete selalu visible (JANGAN hidden on hover)
- Upload gambar dari file (bukan URL input)
- Dark neon aesthetic, purple primary

## Gotchas

- Jalankan `pnpm --filter @workspace/api-spec run codegen` setelah update openapi.yaml
- Jalankan `pnpm --filter @workspace/db run push` setelah update DB schema
- Jangan pakai `pnpm dev` di root workspace — gunakan workflow per artifact
- Object storage `objectPath` dari presigned URL response perlu di-prefix `/api/storage` untuk serving URL

## Pointers

- See the `pnpm-workspace` skill untuk workspace structure, TypeScript setup, dan package details
