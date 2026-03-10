// Netlify serverless function — proxies quiz requests to Gemini API

const ALLOWED_EXAMS = ["aplus_core1", "aplus_core2", "networkplus", "securityplus"];
const MAX_QUESTIONS = 5;

const EXAM_LABELS = {
  aplus_core1: "CompTIA A+ Core 1 (220-1201) — covers mobile devices, networking, hardware, virtualization, cloud computing, and hardware/network troubleshooting",
  aplus_core2: "CompTIA A+ Core 2 (220-1202) — covers operating systems, security, software troubleshooting, and operational procedures",
  networkplus: "CompTIA Network+ (N10-009) — covers network fundamentals, implementations, operations, security, and troubleshooting",
  securityplus: "CompTIA Security+ (SY0-701) — covers threats, vulnerabilities, architecture, operations, and incident response"
};

exports.handler = async function (event) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: "API key not configured" }) };
  }

  let exam, count;
  try {
    const body = JSON.parse(event.body);
    exam = body.exam;
    count = Math.min(Math.max(parseInt(body.count, 10) || 5, 1), MAX_QUESTIONS);
  } catch (e) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid request body" }) };
  }

  if (!ALLOWED_EXAMS.includes(exam)) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid exam type" }) };
  }

  const prompt = `Generate exactly ${count} multiple-choice practice questions for the ${EXAM_LABELS[exam]} certification exam.

Requirements:
- Each question must have exactly 4 answer options
- Only one option should be correct
- Include a brief explanation for why the correct answer is right
- Questions should cover a variety of exam objectives
- Questions should be realistic exam-style, scenario-based when appropriate
- Do NOT use actual exam questions — create original practice questions

Respond with ONLY a valid JSON array. No markdown, no code fences, no extra text. Each element must follow this exact structure:
[
  {
    "q": "The question text",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "answer": 0,
    "explanation": "Why the correct answer is right"
  }
]

The "answer" field is the zero-based index of the correct option.`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const requestBody = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.9,
        maxOutputTokens: 8192,
        responseMimeType: "application/json"
      }
    });

    // Retry up to 3 times with exponential backoff for rate limits
    let res;
    for (let attempt = 0; attempt < 3; attempt++) {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: requestBody
      });

      if (res.status === 429 && attempt < 2) {
        const wait = (attempt + 1) * 2000; // 2s, 4s
        await new Promise(r => setTimeout(r, wait));
        continue;
      }
      break;
    }

    if (!res.ok) {
      const errText = await res.text();
      console.error("Gemini API error:", res.status, errText);
      if (res.status === 429) {
        return { statusCode: 429, headers, body: JSON.stringify({ error: "Too many requests. Please wait a moment and try again." }) };
      }
      return { statusCode: 502, headers, body: JSON.stringify({ error: "Quiz generation failed. Status: " + res.status }) };
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      console.error("Empty Gemini response:", JSON.stringify(data));
      return { statusCode: 502, headers, body: JSON.stringify({ error: "Empty response from quiz service" }) };
    }

    // Strip markdown code fences if present
    const cleaned = text.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
    const questions = JSON.parse(cleaned);

    if (!Array.isArray(questions) || questions.length === 0) {
      return { statusCode: 502, headers, body: JSON.stringify({ error: "Invalid response format" }) };
    }

    for (const q of questions) {
      if (!q.q || !Array.isArray(q.options) || q.options.length !== 4 ||
          typeof q.answer !== "number" || q.answer < 0 || q.answer > 3 || !q.explanation) {
        return { statusCode: 502, headers, body: JSON.stringify({ error: "Malformed question data" }) };
      }
    }

    return { statusCode: 200, headers, body: JSON.stringify({ questions }) };

  } catch (err) {
    console.error("Function error:", err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Internal server error: " + err.message }) };
  }
};
