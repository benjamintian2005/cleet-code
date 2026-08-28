import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getScenario, personaPromptFor } from "@/lib/scenarios";
import { MAX_QUESTIONS } from "@/lib/grading";

export const maxDuration = 30;

const PERSONA_MODEL = anthropic("claude-haiku-4-5-20251001");

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(2000),
});

const requestSchema = z.object({
  slug: z.string(),
  messages: z.array(messageSchema).min(1).max(2 * MAX_QUESTIONS - 1),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const { slug, messages } = parsed.data;

  if (messages[messages.length - 1].role !== "user") {
    return NextResponse.json({ error: "Conversation must end with a user turn." }, { status: 400 });
  }
  const questionNumber = messages.filter((m) => m.role === "user").length;
  if (questionNumber > MAX_QUESTIONS) {
    return NextResponse.json({ error: `Max ${MAX_QUESTIONS} questions exceeded.` }, { status: 400 });
  }

  const scenario = getScenario(slug);
  if (!scenario) {
    return NextResponse.json({ error: "Unknown scenario." }, { status: 404 });
  }

  try {
    const result = await generateText({
      model: PERSONA_MODEL,
      system: personaPromptFor(scenario),
      messages,
      temperature: 0.6,
      maxOutputTokens: 150,
    });

    return NextResponse.json({
      answer: result.text,
      usage: {
        inputTokens: result.usage.inputTokens ?? 0,
        outputTokens: result.usage.outputTokens ?? 0,
        totalTokens: result.usage.totalTokens ?? 0,
      },
      questionNumber,
      maxQuestions: MAX_QUESTIONS,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? `Persona reply failed: ${err.message}` : "Persona reply failed." },
      { status: 502 },
    );
  }
}
