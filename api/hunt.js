export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { code, language = "code" } = req.body || {};

    if (!code) {
      return res.status(400).json({ error: "No code provided" });
    }

    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(500).json({ error: "OPENROUTER_API_KEY is missing" });
    }

    const prompt = `You are a brilliant code educator. Analyze the following ${language} code and return ONLY a valid JSON object. No markdown. No backticks. No extra text.

The JSON must follow this EXACT structure:
{
  "overview": "A clear 1-2 sentence description of what this code does overall",
  "language": "${language}",
  "complexity": "Beginner | Intermediate | Advanced",
  "totalLines": 0,
  "lines": [
    {
      "lineNumber": 1,
      "code": "exact code text of this line",
      "explanation": "Clear, detailed explanation of what this line does and why it matters",
      "type": "import | declaration | assignment | loop | condition | function_def | return | print | expression | comment | other",
      "isIterative": false,
      "iterationNote": null,
      "iterationCount": null
    }
  ]
}

Rules:
- Include EVERY line from the user's code.
- Include blank lines too, using code: "".
- lineNumber must match the original code line number.
- totalLines must equal the number of returned line objects.
- For loop lines and lines inside loops, set isIterative to true.
- For non-loop lines, set isIterative to false, iterationNote to null, and iterationCount to null.
- Return only raw JSON.

Code:
${code}`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`
      },
      body: JSON.stringify({
        model: "google/gemma-4-26b-a4b-it:free",
        max_tokens: 2000,

        messages: [
          {
            role: "user",
            content: prompt
          }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(data);
      return res.status(response.status).json({
        error: data?.error?.message || "OpenRouter request failed"
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        content: [
          {
            text: data?.choices?.[0]?.message?.content || ""
          }
        ]
      }
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: err.message || "Server error"
    });
  }
}
