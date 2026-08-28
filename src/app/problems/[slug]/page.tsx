import Link from "next/link";
import { notFound } from "next/navigation";
import { getScenario } from "@/lib/scenarios";
import { ScenarioRunner } from "./ScenarioRunner";

export default async function ScenarioPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const scenario = getScenario(slug);
  if (!scenario) notFound();

  return (
    <div className="flex flex-1 justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="w-full max-w-2xl px-6 py-16">
        <Link href="/" className="text-sm text-zinc-500 hover:underline">
          ← All scenarios
        </Link>

        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
          {scenario.title}
        </h1>
        <span className="mt-1 inline-block text-sm font-medium capitalize text-zinc-500">
          {scenario.difficulty}
        </span>

        <p className="mt-4 whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">{scenario.briefing}</p>

        {scenario.brokenCode && (
          <div className="mt-4">
            <div className="text-xs uppercase tracking-wide text-zinc-400">Current implementation</div>
            <pre className="mt-1 overflow-x-auto rounded-lg border border-zinc-200 bg-white p-3 text-sm text-zinc-800 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200">
              <code className="font-mono">{scenario.brokenCode}</code>
            </pre>
          </div>
        )}

        <p className="mt-4 text-sm text-zinc-500">
          You get up to 5 questions and then up to 3 build turns. Only a couple of
          example tests show full detail — the rest only tell you how many are
          passing, so the questions you ask are what actually move your score.
        </p>

        <ScenarioRunner slug={scenario.slug} />
      </main>
    </div>
  );
}
