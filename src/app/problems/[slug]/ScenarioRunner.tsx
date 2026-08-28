"use client";

import { useState } from "react";
import { MAX_TURNS, MAX_QUESTIONS } from "@/lib/grading";

interface CaseResult {
  label: string;
  pass: boolean;
  reason: string;
}

interface Usage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

interface ScoreBreakdown {
  turnBase: number;
  tokenPenalty: number;
  score: number;
}

interface TurnResult {
  code: string;
  rawResponse: string;
  visibleResults: CaseResult[];
  hidden: { passed: number; total: number; results?: CaseResult[] };
  usage: Usage;
  cumulativeTokens: number;
  tokenBudget: number;
  turnNumber: number;
  maxTurns: number;
  solved: boolean;
  outOfTurns: boolean;
  score: number;
  scoreBreakdown?: ScoreBreakdown;
}

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

function ResultList({ results }: { results: CaseResult[] }) {
  return (
    <ul className="mt-2 space-y-2">
      {results.map((r, i) => (
        <li
          key={i}
          className={`rounded-lg border p-3 text-sm ${
            r.pass
              ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30"
              : "border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/30"
          }`}
        >
          <div className="flex items-center justify-between gap-4">
            <span className={`font-medium ${r.pass ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"}`}>
              {r.pass ? "Pass" : "Fail"}
            </span>
            <span className="truncate font-mono text-xs text-zinc-500">{r.label}</span>
          </div>
          {!r.pass && <div className="mt-1 text-rose-700 dark:text-rose-400">{r.reason}</div>}
        </li>
      ))}
    </ul>
  );
}

function buildSeedText(qaMessages: ConversationMessage[]): string {
  if (qaMessages.length === 0) return "";
  let text = "Clarifications gathered before implementing:\n\n";
  for (let i = 0; i < qaMessages.length; i += 2) {
    text += `Q: ${qaMessages[i].content}\nA: ${qaMessages[i + 1]?.content ?? ""}\n\n`;
  }
  return text;
}

export function ScenarioRunner({ slug }: { slug: string }) {
  const [phase, setPhase] = useState<"questions" | "building">("questions");
  const [cumulativeTokens, setCumulativeTokens] = useState(0);

  const [qaMessages, setQaMessages] = useState<ConversationMessage[]>([]);
  const [qaInput, setQaInput] = useState("");
  const [qaRunning, setQaRunning] = useState(false);
  const [qaError, setQaError] = useState<string | null>(null);
  const questionsAsked = qaMessages.length / 2;

  const [buildConversation, setBuildConversation] = useState<ConversationMessage[]>([]);
  const [buildTurns, setBuildTurns] = useState<TurnResult[]>([]);
  const [buildInput, setBuildInput] = useState("");
  const [buildRunning, setBuildRunning] = useState(false);
  const [buildError, setBuildError] = useState<string | null>(null);

  const lastBuildTurn = buildTurns[buildTurns.length - 1];
  const finished = lastBuildTurn ? lastBuildTurn.solved || lastBuildTurn.outOfTurns : false;
  const nextTurnNumber = buildTurns.length + 1;

  async function askQuestion() {
    setQaRunning(true);
    setQaError(null);
    const next: ConversationMessage[] = [...qaMessages, { role: "user", content: qaInput }];
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, messages: next }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Request failed with status ${res.status}`);
      }
      const data = await res.json();
      setQaMessages([...next, { role: "assistant", content: data.answer }]);
      setCumulativeTokens((t) => t + (data.usage?.totalTokens ?? 0));
      setQaInput("");
    } catch (err) {
      setQaError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setQaRunning(false);
    }
  }

  async function submitBuild() {
    setBuildRunning(true);
    setBuildError(null);
    const seed = buildConversation.length === 0 ? buildSeedText(qaMessages) : "";
    const content = seed ? `${seed}${buildInput}` : buildInput;
    const nextConversation: ConversationMessage[] = [...buildConversation, { role: "user", content }];
    try {
      const res = await fetch("/api/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, messages: nextConversation, cumulativeTokensBeforeTurn: cumulativeTokens }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Request failed with status ${res.status}`);
      }
      const data: TurnResult = await res.json();
      setBuildConversation([...nextConversation, { role: "assistant", content: data.rawResponse }]);
      setBuildTurns([...buildTurns, data]);
      setCumulativeTokens(data.cumulativeTokens);
      setBuildInput("");
    } catch (err) {
      setBuildError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBuildRunning(false);
    }
  }

  if (phase === "questions") {
    return (
      <div className="mt-6">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Questions ({questionsAsked}/{MAX_QUESTIONS})
          </span>
          <span className="font-mono text-xs text-zinc-500">{cumulativeTokens} tokens so far</span>
        </div>

        {qaMessages.length > 0 && (
          <ul className="mt-3 space-y-3">
            {Array.from({ length: questionsAsked }).map((_, i) => (
              <li key={i} className="rounded-lg border border-zinc-200 bg-white p-3 text-sm dark:border-zinc-800 dark:bg-zinc-950">
                <div className="text-xs uppercase tracking-wide text-zinc-400">You asked</div>
                <div className="mt-1 text-zinc-800 dark:text-zinc-200">{qaMessages[i * 2].content}</div>
                <div className="mt-2 text-xs uppercase tracking-wide text-zinc-400">Answer</div>
                <div className="mt-1 text-zinc-600 dark:text-zinc-400">{qaMessages[i * 2 + 1].content}</div>
              </li>
            ))}
          </ul>
        )}

        {questionsAsked < MAX_QUESTIONS && (
          <div className="mt-4">
            <textarea
              value={qaInput}
              onChange={(e) => setQaInput(e.target.value)}
              rows={2}
              placeholder="Ask the stakeholder something specific…"
              className="w-full rounded-lg border border-zinc-300 bg-white p-3 text-sm text-black dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            />
            <button
              onClick={askQuestion}
              disabled={qaRunning || qaInput.trim().length === 0}
              className="mt-2 rounded-full bg-black px-5 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-white dark:text-black"
            >
              {qaRunning ? "Asking…" : "Ask"}
            </button>
            {qaError && <p className="mt-2 text-sm text-rose-600 dark:text-rose-400">{qaError}</p>}
          </div>
        )}

        <button
          onClick={() => setPhase("building")}
          className="mt-4 block rounded-full border border-zinc-300 px-5 py-2 text-sm font-medium text-black dark:border-zinc-700 dark:text-zinc-50"
        >
          {questionsAsked === 0 ? "Skip questions, start building" : `Done asking — start building (${questionsAsked} asked)`}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-6">
      {qaMessages.length > 0 && (
        <details className="mb-6 rounded-lg border border-zinc-200 bg-white p-3 text-sm dark:border-zinc-800 dark:bg-zinc-950">
          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Your {questionsAsked} question{questionsAsked === 1 ? "" : "s"}
          </summary>
          <ul className="mt-2 space-y-2">
            {Array.from({ length: questionsAsked }).map((_, i) => (
              <li key={i}>
                <div className="text-zinc-800 dark:text-zinc-200">Q: {qaMessages[i * 2].content}</div>
                <div className="text-zinc-600 dark:text-zinc-400">A: {qaMessages[i * 2 + 1].content}</div>
              </li>
            ))}
          </ul>
        </details>
      )}

      {buildTurns.map((turn, i) => (
        <div key={i} className="mb-6 border-b border-zinc-200 pb-6 dark:border-zinc-800">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Build turn {turn.turnNumber} / {turn.maxTurns}
            </span>
            <span className="font-mono text-xs text-zinc-500">
              {turn.usage.totalTokens} tokens this turn · {turn.cumulativeTokens}/{turn.tokenBudget} cumulative
            </span>
          </div>

          <div className="text-xs uppercase tracking-wide text-zinc-400">Your message</div>
          <pre className="mt-1 max-h-40 overflow-y-auto whitespace-pre-wrap rounded-lg border border-zinc-200 bg-white p-3 font-mono text-xs text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
            {buildConversation[i * 2].content}
          </pre>

          <div className="mt-3 text-xs uppercase tracking-wide text-zinc-400">Code it produced</div>
          <pre className="mt-1 overflow-x-auto rounded-lg border border-zinc-200 bg-white p-3 text-sm text-zinc-800 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200">
            <code className="font-mono">{turn.code}</code>
          </pre>

          <div className="mt-3 text-xs uppercase tracking-wide text-zinc-400">Visible tests</div>
          <ResultList results={turn.visibleResults} />

          <div className="mt-3 text-xs uppercase tracking-wide text-zinc-400">Hidden tests</div>
          {turn.hidden.results ? (
            <ResultList results={turn.hidden.results} />
          ) : (
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {turn.hidden.passed}/{turn.hidden.total} passing — details hidden until you solve it or run out of turns.
            </p>
          )}

          {turn.solved && turn.scoreBreakdown && (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-400">
              <div>
                <span className="font-semibold">Solved on build turn {turn.turnNumber}.</span> Score: {turn.score}/100
              </div>
              <div className="mt-1 text-sm">
                {turn.scoreBreakdown.turnBase} for solving on turn {turn.turnNumber}
                {turn.scoreBreakdown.tokenPenalty > 0 && (
                  <> − {turn.scoreBreakdown.tokenPenalty} for using {turn.cumulativeTokens} tokens (budget {turn.tokenBudget})</>
                )}
              </div>
            </div>
          )}
          {turn.outOfTurns && (
            <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-400">
              Out of turns — hidden tests revealed above. Score: 0/100 ({turn.cumulativeTokens} tokens used total)
            </div>
          )}
        </div>
      ))}

      {!finished && (
        <>
          <label htmlFor="build-prompt" className="block text-sm font-medium text-zinc-500">
            {buildTurns.length === 0 ? "Build instructions" : `Follow-up (turn ${nextTurnNumber} of ${MAX_TURNS})`}
          </label>
          {buildTurns.length === 0 && qaMessages.length > 0 && (
            <p className="mt-1 text-xs text-zinc-500">
              Your clarifications above are included automatically — just write what you want built.
            </p>
          )}
          <textarea
            id="build-prompt"
            value={buildInput}
            onChange={(e) => setBuildInput(e.target.value)}
            rows={buildTurns.length === 0 ? 8 : 6}
            placeholder={buildTurns.length === 0 ? "Implement it based on what you learned…" : "Tell it what to fix…"}
            className="mt-2 w-full rounded-lg border border-zinc-300 bg-white p-3 font-mono text-sm text-black dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />

          <button
            onClick={submitBuild}
            disabled={buildRunning || buildInput.trim().length === 0}
            className="mt-3 rounded-full bg-black px-5 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-white dark:text-black"
          >
            {buildRunning ? "Generating + running…" : buildTurns.length === 0 ? "Submit" : "Send follow-up"}
          </button>

          {buildError && <p className="mt-3 text-sm text-rose-600 dark:text-rose-400">{buildError}</p>}
        </>
      )}
    </div>
  );
}
