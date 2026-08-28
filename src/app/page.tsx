import Link from "next/link";
import { SCENARIOS } from "@/lib/scenarios";

const DIFFICULTY_STYLE: Record<string, string> = {
  easy: "text-emerald-600 dark:text-emerald-400",
  medium: "text-amber-600 dark:text-amber-400",
  hard: "text-rose-600 dark:text-rose-400",
};

const KIND_LABEL: Record<string, string> = {
  clarify: "Clarify",
  debug: "Debug",
};

export default function Home() {
  return (
    <div className="flex flex-1 justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="w-full max-w-2xl px-6 py-16">
        <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
          cleet-code
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Each scenario is a deliberately vague ticket or bug report — the requirements
          that matter aren&apos;t in the brief. Ask a stakeholder questions to uncover
          them, then prompt a coding model to build or fix it. Hidden tests cover
          exactly the things nobody asked about.
        </p>

        <ul className="mt-10 divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {SCENARIOS.map((s) => (
            <li key={s.slug}>
              <Link
                href={`/problems/${s.slug}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-zinc-100 dark:hover:bg-zinc-900"
              >
                <span className="font-medium text-black dark:text-zinc-50">{s.title}</span>
                <span className="flex items-center gap-3">
                  <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                    {KIND_LABEL[s.kind]}
                  </span>
                  <span className={`text-sm font-medium capitalize ${DIFFICULTY_STYLE[s.difficulty]}`}>
                    {s.difficulty}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
