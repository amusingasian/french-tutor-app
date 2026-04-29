import { NextRequest, NextResponse } from "next/server";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

export async function POST(request: NextRequest) {
  try {
    const { sentence, word } = await request.json();

    if (!sentence || !word) {
      return NextResponse.json(
        { error: "Missing sentence or word" },
        { status: 400 }
      );
    }

    const context = `
You are a rigorous French grammar tutor. Grade the student's sentence strictly.

The student was asked to write a sentence using this word:
**Word:** ${word.fr} (${word.en})
**Example:** ${word.example}

Respond ONLY with valid JSON (no markdown, no backticks, no preamble):
{
  "score": <0-10>,
  "corrected": "<the ideal sentence in French>",
  "used_target_word": <true|false>,
  "mistakes": [
    {"original": "<phrase they wrote wrong>", "issue": "<explanation>"}
  ],
  "encouragement": "<1-2 sentence encouragement>"
}

Be strict but fair. Deduct points for grammar, spelling, word order, tense, gender/number agreement.
    `.trim();

    const response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY || "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 500,
        system: context,
        messages: [
          {
            role: "user",
            content: `Grade this sentence: "${sentence}"`,
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

    const responseText =
      data.content[0]?.type === "text" ? data.content[0].text : "";

    let parsed;
    try {
      parsed = JSON.parse(responseText);
    } catch {
      parsed = { response: responseText };
    }

    return NextResponse.json({ response: JSON.stringify(parsed, null, 2) });
  } catch (error) {
    console.error("Grade route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
