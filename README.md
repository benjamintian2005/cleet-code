# Cleet Code

**[cleet-code.vercel.app](https://cleet-code.vercel.app/)**

LeetCode for prompting. Each scenario is a deliberately vague ticket or bug report — the requirements
that matter aren't in the brief. Ask a stakeholder questions to uncover them,
then prompt a coding model to build or fix it. Hidden tests cover exactly the
things nobody asked about.

You get up to 5 questions and then up to 3 build turns per scenario. Only a
couple of example tests show full detail — the rest only tell you how many
are passing, so the questions you ask are what actually move your score.
Solving earlier scores higher (100 / 70 / 40 for turns 1 / 2 / 3), and total
token usage across the whole attempt can pull the score down from there.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the result.

The `/api/ask` and `/api/grade` routes need an Anthropic API key (via
`@ai-sdk/anthropic`), `@vercel/sandbox` credentials to execute generated code,
and a `SCORE_SIGNING_SECRET` to sign the cumulative-token total carried
between requests.

## Commands

```bash
npm run dev     # start the dev server
npm run build   # production build
npm run start   # run the production build
npm run lint    # eslint
```

See `CLAUDE.md` for architecture notes.
