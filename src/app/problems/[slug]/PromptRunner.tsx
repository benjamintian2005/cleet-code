"use client";

import { useState } from "react";
import { MAX_TURNS } from "@/lib/grading";

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

interface TurnResult {
  code: string;
  rawResponse: string;
  visibleResults: CaseResult[];
  hidden: { passed: number; total: number; results?: CaseResult[] };
  usage: Usage;
  turnNumber: number;
  maxTurns: number;
  solved: boolean;
  outOfTurns: boolean;
  score: number;
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

export function PromptRunner({ slug, initialPrompt }: { slug: string; initialPrompt: string }) {
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [turns, setTurns] = useState<TurnResult[]>([]);
  const [input, setInput] = useState(initialPrompt);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lastTurn = turns[turns.length - 1];
  const finished = lastTurn ? lastTurn.solved || lastTurn.outOfTurns : false;
  const nextTurnNumber = turns.length + 1;

  async function submit() {
    setRunning(true);
    setError(null);
    const nextConversation: ConversationMessage[] = [...conversation, { role: "user", content: input }];
    try {
      const res = await fetch("/api/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, messages: nextConversation }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Request failed with status ${res.status}`);
      }
      const data: TurnResult = await res.json();
      setConversation([...nextConversation, { role: "assistant", content: data.rawResponse }]);
      setTurns([...turns, data]);
      setInput("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="mt-6">
      {turns.map((turn, i) => (
        <div key={i} className="mb-6 border-b border-zinc-200 pb-6 dark:border-zinc-800">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Turn {turn.turnNumber} / {turn.maxTurns}
            </span>
            <span className="font-mono text-xs text-zinc-500">
              {turn.usage.totalTokens} tokens this turn
            </span>
          </div>

          <div className="text-xs uppercase tracking-wide text-zinc-400">Your message</div>
          <pre className="mt-1 max-h-40 overflow-y-auto whitespace-pre-wrap rounded-lg border border-zinc-200 bg-white p-3 font-mono text-xs text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
            {conversation[i * 2].content}
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

          {turn.solved && (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-400">
              <span className="font-semibold">Solved on turn {turn.turnNumber}.</span> Score: {turn.score}/100
            </div>
          )}
          {turn.outOfTurns && (
            <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-400">
              Out of turns — hidden tests revealed above. Score: 0/100
            </div>
          )}
        </div>
      ))}

      {!finished && (
        <>
          <label htmlFor="prompt" className="block text-sm font-medium text-zinc-500">
            {turns.length === 0 ? "Your prompt" : `Follow-up (turn ${nextTurnNumber} of ${MAX_TURNS})`}
          </label>
          <textarea
            id="prompt"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={turns.length === 0 ? 16 : 6}
            placeholder={turns.length === 0 ? undefined : "Tell it what to fix…"}
            className="mt-2 w-full rounded-lg border border-zinc-300 bg-white p-3 font-mono text-sm text-black dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />

          <button
            onClick={submit}
            disabled={running || input.trim().length === 0}
            className="mt-3 rounded-full bg-black px-5 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-white dark:text-black"
          >
            {running ? "Generating + running…" : turns.length === 0 ? "Submit" : "Send follow-up"}
          </button>

          {error && <p className="mt-3 text-sm text-rose-600 dark:text-rose-400">{error}</p>}
        </>
      )}
    </div>
  );
}
