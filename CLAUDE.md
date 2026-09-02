# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## What this is

Cleet Code ("LeetCode for prompting") is a Next.js app that flips the usual coding-challenge format: each
scenario is a deliberately vague ticket or bug report. The requirements that
actually matter are withheld from the brief and only surface through a
simulated stakeholder's answers during a Q&A phase. The solver then writes
natural-language build/fix instructions that get sent to an LLM code-generation
model, and the resulting Python is executed against hidden tests in a sandbox.
The game rewards asking good clarifying questions, not raw coding — the model
does the coding.

## Commands

```bash
npm run dev     # start the Next.js dev server
npm run build   # production build
npm run start   # run the production build
npm run lint    # eslint (flat config, eslint-config-next)
```

There is no test suite in this repo — grading correctness is the product
itself (see Architecture below), not something covered by a `test` script.

Requires `SCORE_SIGNING_SECRET` (HMAC key for `token-integrity.ts`) and
whatever env vars `@ai-sdk/anthropic` and `@vercel/sandbox` need (Anthropic API
key, Vercel sandbox credentials) to run the `/api/ask` and `/api/grade` routes
locally.

## Architecture

**Scenario data (`src/lib/scenarios.ts`)** is the single source of truth for
the whole app. Each `Scenario` has:
- `briefing` — shown to the solver, deliberately underspecified.
- `hiddenContext` — the real requirements, never shown directly. Only reachable
  through persona answers in the Q&A phase, and it's what the `testCases` are
  derived from.
- `testCases` — each with a `check(value)` function run against the parsed
  return value of the generated Python function. Only the first
  `visibleCount` show full pass/fail detail before the attempt ends; the rest
  are aggregate-only ("N/M passing") until the scenario is solved or turns run
  out, so guessing without asking questions is punished.
- `tokenBudget` — rough LLM token budget across the whole attempt (questions +
  build turns), enforced as a scoring penalty, not a hard cutoff.

`personaPromptFor(scenario)` builds the system prompt for the Q&A-phase
persona (product manager for `"clarify"` scenarios, support engineer for
`"debug"` ones). The persona is instructed to answer only the specific
question asked, redirect broad/bundled questions, and stay in character
against prompt-injection attempts. `leakFraction()` + `LEAK_FRACTION_THRESHOLD`
are a deterministic backstop independent of the persona's own behavior: it
extracts the concrete facts (numbers, quoted strings) out of `hiddenContext`
and blocks any single answer that reproduces too large a fraction of them
verbatim, in case the LLM persona ignores its instructions and volunteers the
full spec.

**Two API routes, two different LLMs, two different jobs:**
- `POST /api/ask` (`src/app/api/ask/route.ts`) — runs the Q&A persona
  (`claude-haiku-4-5`) against the scenario's `hiddenContext`, capped at
  `MAX_QUESTIONS` (5) user turns.
- `POST /api/grade` (`src/app/api/grade/route.ts`) — takes the solver's build
  instructions (optionally multi-turn, capped at `MAX_TURNS` = 3), generates
  Python with a second Anthropic call constrained to return exactly one
  fenced code block defining `scenario.functionName`, executes it against all
  `testCases` inside an ephemeral `@vercel/sandbox` (5s per-case alarm-based
  timeout via a generated `runner.py`), and grades the result. The sandbox is
  always deleted (`deleteOrphanSnapshots: true`) in a `finally`, never just
  stopped — stopped sandboxes leave filesystem snapshots that quietly burn the
  Hobby plan's snapshot quota.

**Scoring (`src/lib/grading.ts`)** — solving earlier costs less: turn 1 = 100,
turn 2 = 70, turn 3 = 40, never solving = 0. Total token usage across the
*whole* attempt (all Q&A + all build turns) can only pull the score down from
whatever the turn number sets as ceiling, capped at a 20-point penalty — it
can't erase the turn-based credit entirely.

**Token accounting has no database.** The running cumulative-token total is
carried between requests as an HMAC-signed opaque string
(`src/lib/token-integrity.ts`, `SCORE_SIGNING_SECRET`) that the client stores
and replays on every subsequent `/api/ask` / `/api/grade` call. The server
verifies the signature and ignores/reset-to-zero anything tampered with or
missing, so a client can't edit the displayed token count to erase its own
penalty — only the server-signed value is trusted.

**Rate limiting (`src/lib/rate-limit.ts`)** is intentionally best-effort:
in-memory, per-warm-instance, resets on cold start, not shared across
regions/instances. That's a known, accepted limitation for a Hobby-tier
deployment meant to deter casual scripted abuse of endpoints backed by a real
Anthropic API key and real sandbox spend — not to be an airtight distributed
limiter. Don't "fix" this with a bigger in-memory structure; a real fix means
provisioning a shared store (e.g. Upstash/Vercel KV).

**Frontend** — `src/app/page.tsx` lists scenarios; `src/app/problems/[slug]/`
is a server component (`page.tsx`) rendering scenario metadata plus a single
client component, `ScenarioRunner.tsx`, which owns all Q&A/build/scoring
state machine logic and talks to the two API routes directly via `fetch`.

## Adding a new scenario

Add an entry to `SCENARIOS` in `src/lib/scenarios.ts`. Keep `briefing` genuinely
underspecified and put every fact a solver needs in `hiddenContext` as either a
number or a `"quoted"` term — `leakFraction()`'s fact-extraction only catches
those, and needs at least 3 distinct facts to activate at all (scenarios with
fewer, e.g. bug reports with no numbers/names, get no leak-detection backstop
and rely solely on the persona prompt). Write `testCases` so the ones beyond
`visibleCount` actually probe the hidden requirements — that's what makes
asking questions the correct strategy instead of guessing.
