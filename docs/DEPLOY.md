# TableTime Push-to-Deploy

## Branch and environment map

| Git branch | Environment | Vercel target | Render API | Database | Seed policy |
|---|---|---|---|---|---|
| `dev` | Development | Preview deployment for `dev` | `tabletime-api-dev` | `tabletime-db-dev` | Allowed only with explicit `ALLOW_TEST_SEED=true` |
| `uat` | UAT | Preview deployment for `uat` | `tabletime-api-uat` | `tabletime-db-uat` | Allowed only with explicit `ALLOW_TEST_SEED=true` |
| `main` | Production | Vercel Production | `tabletime-api-prod` | `tabletime-db-prod` | Prohibited by seed script |

Never reuse a database, JWT secret, Cloudinary credential set, or CORS origin between environments. Set `NODE_ENV=production` on hosted Render services so secure cookie and production checks remain enabled. `APP_ENV` identifies which deployment may run the optional seed.

## Environment variables

Set these in each service's dashboard. Do not commit secret values or paste them into Vercel's `VITE_*` variables.

| Variable | Render API: dev | Render API: uat | Render API: production | Vercel: dev Preview | Vercel: uat Preview | Vercel: Production |
|---|---|---|---|---|---|---|
| `NODE_ENV` | `production` | `production` | `production` | Not needed | Not needed | Not needed |
| `APP_ENV` | `development` | `uat` | `production` | Not needed | Not needed | Not needed |
| `DATABASE_URL` | Render internal URL from dev DB | Render internal URL from UAT DB | Render internal URL from prod DB | Not needed | Not needed | Not needed |
| `JWT_SECRET` | Unique random value, 32+ chars | Different random value, 32+ chars | Different random value, 32+ chars | Not needed | Not needed | Not needed |
| `JWT_REFRESH_SECRET` | Unique random value, 32+ chars | Different random value, 32+ chars | Different random value, 32+ chars | Not needed | Not needed | Not needed |
| `CORS_ORIGIN` | Exact dev Vercel domain | Exact UAT Vercel domain | Exact production domain | Not needed | Not needed | Not needed |
| `STORAGE_DRIVER` | `cloudinary` | `cloudinary` | `cloudinary` | Not needed | Not needed | Not needed |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary account name | Same or UAT account | Production account | Not needed | Not needed | Not needed |
| `CLOUDINARY_API_KEY` | Secret in Render | Secret in Render | Secret in Render | Not needed | Not needed | Not needed |
| `CLOUDINARY_API_SECRET` | Secret in Render | Secret in Render | Secret in Render | Not needed | Not needed | Not needed |
| `VITE_API_BASE_URL` | Not needed | Not needed | Not needed | `https://tabletime-api-dev.onrender.com/api/v1` | `https://tabletime-api-uat.onrender.com/api/v1` | `https://tabletime-api-prod.onrender.com/api/v1` |

Set `CORS_ORIGIN` to the exact origin only (scheme + host, no path), e.g. `https://tabletime-dev.vercel.app`. If using custom domains, use those exact domains. Vercel preview deployments often have unique URLs; assign stable branch domains in Vercel or update Render's `CORS_ORIGIN` to the exact deployment origin. Never use `*` with credentialed cookies.

## 1. Prepare GitHub branches

1. Push the current project to a GitHub repository with `dev`, `uat`, and `main` branches.
2. Protect `uat` and `main`; require the CI workflow to pass before merging.
3. Confirm `.github/workflows/ci.yml` runs on pushes and pull requests to all three branches.

## 2. Create Render environments

1. In Render Dashboard, select **New + → Blueprint** and connect the GitHub repository.
2. Select the `main` branch as the Blueprint source so Render reads `render.yaml`.
3. Review the Blueprint plan: it creates three PostgreSQL databases and three web services in Singapore, each service tracking its mapped branch.
4. Apply the Blueprint. Web services build with `npm ci && npm run build`, run `npm run db:deploy` as the pre-deploy command, start with `npm start`, and health-check `/health`.
5. Open each API service's **Environment** page. Add distinct `JWT_SECRET`, `JWT_REFRESH_SECRET`, and exact `CORS_ORIGIN`; add Cloudinary credentials. Use Render's secret fields and a password manager/secret generator. Secrets must each be at least 32 characters.
6. Check that each `DATABASE_URL` is linked to its matching database and each service has the expected `APP_ENV`.
7. Confirm Render reports `/health` as healthy after the first deploy. Do not run `db push`; schema changes must be committed as Prisma migrations.

The Render Blueprint uses `preDeployCommand`, which is supported on paid web-service plans. If using a plan that does not support pre-deploy commands, upgrade the service before enabling automatic deploys; do not put migrations in the build command.

This initial migration creates a new schema. If adopting an existing database previously created with `prisma db push`, take a backup and compare its schema with this migration first. Do not run the initial migration against a populated schema blindly; baseline only after confirming the live schema exactly matches the migration, using `prisma migrate resolve --applied 20260930120000_initial_schema` once for that database.

## 3. Configure Vercel

1. In Vercel Dashboard, select **Add New → Project**, import the same GitHub repository, and set **Root Directory** to `frontend`.
2. Keep the detected Vite build command and output directory (`npm run build`, `dist`). `frontend/vercel.json` supplies the SPA rewrite to `/index.html` for client-side routes.
3. In **Settings → Git**, set Production Branch to `main`.
4. In **Settings → Environment Variables**, create `VITE_API_BASE_URL` for Preview and Production. For Preview, use Vercel's branch-specific environment targeting for `dev` and `uat`, with the matching API URLs in the table above. For Production, target `main` and use the production API URL.
5. Add a stable domain for each branch preview if possible, then put its exact origin in the matching Render service's `CORS_ORIGIN`.
6. Deploy `dev` and `uat` first and verify login, reservations, menu, payment, and private slip access against their own databases. Then deploy `main` to Production.

## 4. Database migrations

1. For local schema changes, update `backend/prisma/schema.prisma` and run `npm run db:migrate` from `backend`; Prisma creates a new migration and applies it to the local database.
2. Review and commit both the schema and generated `backend/prisma/migrations/<timestamp>_<name>/migration.sql`.
3. CI validates the application. Render runs `npm run db:deploy` (`prisma migrate deploy`) against that environment's database immediately before deploy.
4. Never run `prisma db push` against UAT or Production. Do not edit a migration that has already been applied to a shared environment; create a follow-up migration.

## 5. Seed test data (Development/UAT only)

The seed script refuses production and also requires an explicit opt-in. Use a dedicated non-production database only:

```powershell
cd backend
$env:APP_ENV = 'development' # use 'uat' only for the UAT database
$env:ALLOW_TEST_SEED = 'true'
npm run db:seed
```

Never set `ALLOW_TEST_SEED` on the Production Render service. The service uses `APP_ENV=production`, and the script will reject that environment even if the flag is accidentally set.

## 6. Verify a deployment

1. Check Render service logs for successful `prisma migrate deploy` and server startup.
2. Open `https://<api-host>/health`; expect JSON with `status: "ok"`.
3. Open the Vercel root and refresh a nested route such as `/login`; it should serve the SPA, not a Vercel 404.
4. In browser DevTools Network, confirm frontend requests target the environment-specific API and that an unconfigured origin is rejected by CORS.
5. Confirm uploads use Cloudinary in hosted environments and slips are viewed only through the authenticated `/api/v1/payments/:id/slip` endpoint.
