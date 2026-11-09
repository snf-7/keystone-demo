# Keystone

Arabic-first (RTL) succession tool: who to promote, promote vs. hire, estimated Saudization impact.
**Demo build:** no database. Fictional data for "شركة الريادة للتوزيع" is generated in memory at startup
(`server/db/seedData.ts`); vacancies and decisions live in memory and reset when the server restarts.

```bash
npm install
npm run dev                  # API :3001 + Vite :5173 -> http://localhost:5173/radar
npm test
npm run build && npm start   # Express serves dist/ on $PORT (default 3001)
```

## Logic stubs (yours to write) — `server/logic/`
`scoring.ts`, `chain.ts`, `nitaqat.ts`, `cost.ts`, `skills.ts` return mock data.
Nationality/gender are stripped in `server/analysis.ts` (`toCandidate`) before `scoreCandidates`;
`server/__tests__/protected.test.ts` fails if either reaches it.
