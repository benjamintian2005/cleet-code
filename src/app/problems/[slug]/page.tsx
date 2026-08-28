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

        <p className="mt-4 whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">
          {problem.description}
        </p>

        <div className="mt-4 rounded-lg border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="font-medium text-zinc-500">Example input</div>
          <div className="mt-1 font-mono text-zinc-800 dark:text-zinc-200">{problem.example.input}</div>
          <div className="mt-2 text-zinc-500">{problem.example.note}</div>
        </div>

        <PromptRunner slug={problem.slug} />
      </main>
    </div>
  );
}
