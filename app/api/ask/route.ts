import { NextRequest, NextResponse } from "next/server";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

export async function POST(request: NextRequest) {
  try {
    const { question, word } = await request.json();

    if (!question || !word) {
      return NextResponse.json(
        { error: "Missing question or word" },
        { status: 400 }
      );
    }

    const context = `
You are a French tutor. The student is studying this word:

**Word:** ${word.fr}
**English:** ${word.en}
**Type:** ${word.type}
${word.gender ? `**Gender:** ${word.gender}` : ""}
**Key forms:** ${word.key_forms}
**Example sentence:** ${word.example}
**Common mistake:** ${word.trap}

Answer the student's question concisely in 2-3 sentences. Be encouraging.
    `.trim();

    const response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY || "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 200,
        system: context,
        messages: [
          {
            role: "user",
            content: question,
          },
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error?.message || "Anthropic API error" },
        { status: response.status }
      );
    }

    const answerText =
      data.content[0]?.type === "text" ? data.content[0].text : "";

    return NextResponse.json({ response: answerText });
  } catch (error) {
    console.error("Ask route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
