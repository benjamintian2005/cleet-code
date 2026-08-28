import { anthropic } from "@ai-sdk/anthropic";
import { Sandbox } from "@vercel/sandbox";
import { generateText } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getProblem } from "@/lib/problems";
import { MAX_TURNS, computeScore } from "@/lib/grading";

export const maxDuration = 60;

const GRADING_MODEL = anthropic("claude-haiku-4-5-20251001");

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(6000),
});

const requestSchema = z.object({
  slug: z.string(),
  messages: z.array(messageSchema).min(1).max(2 * MAX_TURNS - 1),
  /** Sum of input+output tokens from prior turns of this same attempt. 0 on turn 1. */
  cumulativeTokensBeforeTurn: z.number().min(0).max(1_000_000).default(0),
});

interface CaseResult {
  label: string;
  pass: boolean;
  reason: string;
}

function systemPromptFor(functionName: string): string {
  return `You are a Python code generation engine embedded in an automated grading pipeline.
You will receive a coding problem and instructions from a user attempting to solve it,
possibly across multiple turns of conversation as they refine their instructions.

Respond with ONLY a single fenced Python code block and nothing else — no explanation
before or after it.

The code block must define a top-level function named exactly \`${functionName}\` that
implements the solution. Include any necessary imports inside the code block. Do not
include example usage, print statements, or tests.`;
}

function extractPythonCode(text: string): string {
  const match = text.match(/```(?:python)?\s*\n?([\s\S]*?)```/i);
  return (match ? match[1] : text).trim();
}

function buildRunnerScript(functionName: string, testCasesB64: string): string {
  return `import json, base64, signal, sys

class TestTimeout(Exception):
    pass

def _handler(signum, frame):
    raise TestTimeout()

signal.signal(signal.SIGALRM, _handler)

with open("solution.py") as f:
    code = f.read()

namespace = {}
try:
    exec(code, namespace)
except Exception as e:
    print(json.dumps({"execError": f"{type(e).__name__}: {e}"}))
    sys.exit(0)

fn = namespace.get(${JSON.stringify(functionName)})
if fn is None:
    print(json.dumps({"execError": "function " + ${JSON.stringify(functionName)} + " was not defined"}))
    sys.exit(0)

test_cases = json.loads(base64.b64decode(${JSON.stringify(testCasesB64)}).decode())

results = []
for args in test_cases:
    signal.alarm(5)
    try:
        value = fn(*args)
        json.dumps(value)
        results.append({"ok": True, "value": value})
    except TestTimeout:
        results.append({"ok": False, "error": "timed out after 5s"})
    except Exception as e:
        results.append({"ok": False, "error": f"{type(e).__name__}: {e}"})
    finally:
        signal.alarm(0)

print(json.dumps(results))
`;
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const { slug, messages, cumulativeTokensBeforeTurn } = parsed.data;

  if (messages[messages.length - 1].role !== "user") {
    return NextResponse.json({ error: "Conversation must end with a user turn." }, { status: 400 });
  }
  const turnNumber = messages.filter((m) => m.role === "user").length;
  if (turnNumber > MAX_TURNS) {
    return NextResponse.json({ error: `Max ${MAX_TURNS} turns exceeded.` }, { status: 400 });
  }

  const problem = getProblem(slug);
  if (!problem) {
    return NextResponse.json({ error: "Unknown problem." }, { status: 404 });
  }

  let rawResponse: string;
  let usage: { inputTokens?: number; outputTokens?: number; totalTokens?: number };
  try {
    const result = await generateText({
      model: GRADING_MODEL,
      system: systemPromptFor(problem.functionName),
      messages,
      temperature: 0,
      maxOutputTokens: 1024,
    });
    rawResponse = result.text;
    usage = result.usage;
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? `Code generation failed: ${err.message}` : "Code generation failed." },
      { status: 502 },
    );
  }

  const code = extractPythonCode(rawResponse);
  const turnUsage = {
    inputTokens: usage.inputTokens ?? 0,
    outputTokens: usage.outputTokens ?? 0,
    totalTokens: usage.totalTokens ?? 0,
  };

  const testArgs = problem.testCases.map((t) => t.args);
  const testCasesB64 = Buffer.from(JSON.stringify(testArgs)).toString("base64");

  let sandbox: Sandbox | undefined;
  let rawResults: Array<{ ok: boolean; value?: unknown; error?: string }> | { execError: string };
  try {
    sandbox = await Sandbox.create({ timeout: 60_000 });
    await sandbox.writeFiles([
      { path: "solution.py", content: Buffer.from(code) },
      { path: "runner.py", content: Buffer.from(buildRunnerScript(problem.functionName, testCasesB64)) },
    ]);
    const run = await sandbox.runCommand({ cmd: "python3", args: ["runner.py"] });
    const stdout = await run.stdout();
    const stderr = await run.stderr();

    try {
      rawResults = JSON.parse(stdout.trim());
    } catch {
      rawResults = { execError: stderr.trim() || stdout.trim() || "Runner produced no output." };
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? `Sandbox execution failed: ${err.message}` : "Sandbox execution failed." },
      { status: 502 },
    );
  } finally {
    if (sandbox) await sandbox.stop();
  }

  let allResults: CaseResult[];
  if (!Array.isArray(rawResults)) {
    const reason = `Generated code failed to load: ${rawResults.execError}`;
    allResults = problem.testCases.map((t) => ({ label: t.label, pass: false, reason }));
  } else {
    allResults = problem.testCases.map((testCase, i) => {
      const r = rawResults[i] as { ok: boolean; value?: unknown; error?: string } | undefined;
      if (!r || !r.ok) {
        return { label: testCase.label, pass: false, reason: r?.error ?? "No result returned." };
      }
      const { pass, reason } = testCase.check(r.value);
      return { label: testCase.label, pass, reason };
    });
  }

  const visibleResults = allResults.slice(0, problem.visibleCount);
  const hiddenResults = allResults.slice(problem.visibleCount);
  const hiddenPassed = hiddenResults.filter((r) => r.pass).length;

  const solved = allResults.every((r) => r.pass);
  const outOfTurns = !solved && turnNumber >= MAX_TURNS;
  const finalReveal = solved || outOfTurns;

  const cumulativeTokens = cumulativeTokensBeforeTurn + turnUsage.totalTokens;
  const breakdown = computeScore(turnNumber, cumulativeTokens, problem.tokenBudget);
  const score = solved ? breakdown.score : 0;

  return NextResponse.json({
    code,
    rawResponse,
    visibleResults,
    hidden: {
      passed: hiddenPassed,
      total: hiddenResults.length,
      results: finalReveal ? hiddenResults : undefined,
    },
    usage: turnUsage,
    cumulativeTokens,
    tokenBudget: problem.tokenBudget,
    turnNumber,
    maxTurns: MAX_TURNS,
    solved,
    outOfTurns,
    score,
    scoreBreakdown: solved ? breakdown : undefined,
  });
}
