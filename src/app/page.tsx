import Link from "next/link";
import { PROBLEMS } from "@/lib/problems";

const DIFFICULTY_STYLE: Record<string, string> = {
  easy: "text-emerald-600 dark:text-emerald-400",
  medium: "text-amber-600 dark:text-amber-400",
  hard: "text-rose-600 dark:text-rose-400",
};

export default function Home() {
  return (
    <div className="flex flex-1 justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="w-full max-w-2xl px-6 py-16">
        <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
          cleet-code
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          LeetCode, but the thing you&apos;re optimizing is the prompt, not the code.
          Each problem gives you a task and an output contract — write a system
          prompt that makes the model satisfy it across every hidden test case.
        </p>

        <ul className="mt-10 divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {PROBLEMS.map((p) => (
            <li key={p.slug}>
              <Link
                href={`/problems/${p.slug}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-zinc-100 dark:hover:bg-zinc-900"
              >
                <span className="font-medium text-black dark:text-zinc-50">{p.title}</span>
                <span className={`text-sm font-medium capitalize ${DIFFICULTY_STYLE[p.difficulty]}`}>
                  {p.difficulty}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
