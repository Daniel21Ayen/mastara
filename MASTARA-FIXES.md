# Mastara loading and real-data fixes

Copy these files over the repo (same paths). Then:

1. Set `apps/mobile/.env.local`: `EXPO_PUBLIC_API_URL=http://<your PC LAN IP>:4001` (phone on same Wi-Fi, port 4001 open).
2. Fresh dev database (old rows have random ids): `npx prisma migrate reset` in packages/database, then
   `npm run db:seed:reference --workspace=@mastara/database` (set REDIS_URL so the catalog cache is bumped).
3. `npm run generate:seed -- --check` must say OK. Restart Expo with `--clear`.
4. Rotate the DB/Redis password `da2112` (it was committed in .env) and remove .env from git history.
5. `npm run db:seed:demo` is for development only; it refuses to run when NODE_ENV=production.

Not included: real notes and quiz questions (add via admin portal / CSV import), Amharic text review,
updates to existing tests (academicApi.test.ts, catalogSync.test.ts) if they fail.

## Update 2 (from your Expo Go log)
- "Fetch request has been canceled" is a timeout: the phone could not reach the API in time. It is now reported as a timeout.
- Removed the deprecated InteractionManager and the duplicate startup catalog sync.
- eas.json: release profiles now carry EXPO_PUBLIC_API_URL (replace the placeholder), auto version code.
