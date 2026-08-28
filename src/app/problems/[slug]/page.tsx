import Link from "next/link";
import { notFound } from "next/navigation";
import { getProblem } from "@/lib/problems";
import { PromptRunner } from "./PromptRunner";

export default async function ProblemPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const problem = getProblem(slug);
  if (!problem) notFound();

  return (
    <div className="flex flex-1 justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="w-full max-w-2xl px-6 py-16">
        <Link href="/" className="text-sm text-zinc-500 hover:underline">
          ← All problems
        </Link>

        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
          {problem.title}
        </h1>
        <span className="mt-1 inline-block text-sm font-medium capitalize text-zinc-500">
          {problem.difficulty}
        </span>

        <p className="mt-4 text-sm text-zinc-500">
          Below is the problem, prefilled as your starting prompt. You get up to 3 turns:
          submit, see which tests pass, and send a follow-up instruction if you didn&apos;t
          nail it. Only a couple of example tests show full detail — the rest only tell you
          how many are passing, so patch the actual ambiguity, not the test suite. Solving in
          fewer turns scores higher.
        </p>

        <PromptRunner slug={problem.slug} initialPrompt={problem.statement} />
      </main>
    </div>
  );
}
