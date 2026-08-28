import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getProblem } from "@/lib/problems";

export const maxDuration = 60;

const GRADING_MODEL = anthropic("claude-haiku-4-5-20251001");

const requestSchema = z.object({
  slug: z.string(),
  prompt: z.string().min(1).max(4000),
});

interface CaseResult {
  input: string;
  output: string;
  pass: boolean;
  reason: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const { slug, prompt } = parsed.data;

  const problem = getProblem(slug);
  if (!problem) {
    return NextResponse.json({ error: "Unknown problem." }, { status: 404 });
  }

  const results: CaseResult[] = [];

  for (const testCase of problem.testCases) {
    try {
      const { text, usage } = await generateText({
        model: GRADING_MODEL,
        system: prompt,
        prompt: testCase.input,
        temperature: 0,
      });

      const { pass, reason } = testCase.validate(text);

      results.push({
        input: testCase.input,
        output: text,
        pass,
        reason,
        inputTokens: usage.inputTokens ?? 0,
        outputTokens: usage.outputTokens ?? 0,
        totalTokens: usage.totalTokens ?? 0,
      });
    } catch (err) {
      results.push({
        input: testCase.input,
        output: "",
        pass: false,
        reason: err instanceof Error ? `Model call failed: ${err.message}` : "Model call failed.",
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
      });
    }
  }

  const passed = results.filter((r) => r.pass).length;
  const summary = {
    passed,
    total: results.length,
    allPassed: passed === results.length,
    inputTokens: results.reduce((sum, r) => sum + r.inputTokens, 0),
    outputTokens: results.reduce((sum, r) => sum + r.outputTokens, 0),
    totalTokens: results.reduce((sum, r) => sum + r.totalTokens, 0),
  };

  return NextResponse.json({ results, summary });
}
