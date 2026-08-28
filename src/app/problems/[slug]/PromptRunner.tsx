"use client";

import { useState } from "react";

interface CaseResult {
  label: string;
  pass: boolean;
  reason: string;
}

interface Summary {
  passed: number;
  total: number;
  allPassed: boolean;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export function PromptRunner({ slug, initialPrompt }: { slug: string; initialPrompt: string }) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [results, setResults] = useState<CaseResult[] | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);

  async function run() {
    setRunning(true);
    setError(null);
    setResults(null);
    setSummary(null);
    setCode(null);
    try {
      const res = await fetch("/api/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, prompt }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Request failed with status ${res.status}`);
      }
      const data = await res.json();
      setCode(data.code);
      setResults(data.results);
      setSummary(data.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="mt-6">
      <label htmlFor="prompt" className="block text-sm font-medium text-zinc-500">
        Your prompt
      </label>
      <textarea
        id="prompt"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={16}
        className="mt-2 w-full rounded-lg border border-zinc-300 bg-white p-3 font-mono text-sm text-black dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
      />

      <button
        onClick={run}
        disabled={running || prompt.trim().length === 0}
        className="mt-3 rounded-full bg-black px-5 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-white dark:text-black"
      >
        {running ? "Generating + running…" : "Submit"}
      </button>

      {error && <p className="mt-3 text-sm text-rose-600 dark:text-rose-400">{error}</p>}

      {summary && (
        <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-baseline justify-between">
            <span
              className={`text-lg font-semibold ${
                summary.allPassed
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {summary.passed}/{summary.total} test cases passed
            </span>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-3 text-sm text-zinc-600 dark:text-zinc-400">
            <div>
              <div className="text-xs uppercase tracking-wide text-zinc-400">Input tokens</div>
              <div className="font-mono text-black dark:text-zinc-100">{summary.inputTokens}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-zinc-400">Output tokens</div>
              <div className="font-mono text-black dark:text-zinc-100">{summary.outputTokens}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-zinc-400">Total tokens</div>
              <div className="font-mono text-black dark:text-zinc-100">{summary.totalTokens}</div>
            </div>
          </div>
        </div>
      )}

      {code && (
        <div className="mt-4">
          <div className="text-xs uppercase tracking-wide text-zinc-400">
            Code your prompt produced
          </div>
          <pre className="mt-1 overflow-x-auto rounded-lg border border-zinc-200 bg-white p-3 text-sm text-zinc-800 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200">
            <code className="font-mono">{code}</code>
          </pre>
        </div>
      )}

      {results && (
        <ul className="mt-4 space-y-2">
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
      )}
    </div>
  );
}
