import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// Requires GROQ_API_KEY in server/.env (free, no card - get one at console.groq.com/keys).
// Groq exposes an OpenAI-compatible chat completions endpoint.
// Uses plain fetch so no extra SDK dependency is needed - Node 18+ has a
// built-in global fetch.
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b'

const SYSTEM_PROMPT = `You are a careful, conservative medical triage assistant inside a healthcare app called MediCare+.
A patient will describe their symptoms in free text. Respond with ONLY a JSON object (no markdown, no prose before or after) matching this exact shape:

{
  "summary": "one sentence summary of what the patient described",
  "possible_conditions": [
    { "condition": "string", "specialty": "string (e.g. Cardiologist, General Physician)", "likelihood": "low|medium|high", "explanation": "one short sentence" }
  ],
  "urgency": "low|medium|high|emergency",
  "recommendation": "one short actionable sentence, e.g. what type of doctor to see and how soon",
  "disclaimer": "a short sentence reminding the user this is not a diagnosis"
}

Rules:
- List at most 4 possible_conditions, ordered by likelihood.
- If symptoms suggest a medical emergency (e.g. chest pain, difficulty breathing, stroke signs, severe bleeding), set urgency to "emergency" and recommend calling emergency services or visiting an ER immediately.
- Never invent lab results or prescribe medication or dosages.
- Keep every string field short (under 25 words).
- Output must be valid JSON and nothing else.`

router.post('/symptom-check', requireAuth, async (req, res) => {
  const { symptoms } = req.body || {}
  if (!symptoms || typeof symptoms !== 'string' || !symptoms.trim()) {
    return res.status(400).json({ error: 'Please describe your symptoms first.' })
  }
  if (symptoms.length > 1000) {
    return res.status(400).json({ error: 'Please keep your description under 1000 characters.' })
  }

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    return res.status(503).json({
      error: 'AI symptom analysis isn\'t configured yet. Add GROQ_API_KEY to server/.env to enable it (see README).',
    })
  }

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 700,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: symptoms.trim() },
        ],
      }),
    })

    if (!response.ok) {
      const errBody = await response.json().catch(() => null)
      console.error('Groq API error', response.status, errBody)
      return res.status(502).json({ error: 'AI symptom analysis is temporarily unavailable. Please try again shortly.' })
    }

    const data = await response.json()
    const messageText = data.choices?.[0]?.message?.content
    if (!messageText) {
      return res.status(502).json({ error: 'AI symptom analysis returned an unexpected response.' })
    }

    let parsed
    try {
      // The model is instructed to return pure JSON, but strip any stray
      // markdown code fences defensively in case it doesn't.
      const cleaned = messageText.replace(/^```json\s*|```\s*$/g, '').trim()
      parsed = JSON.parse(cleaned)
    } catch (parseErr) {
      console.error('Failed to parse AI symptom-check response', parseErr, messageText)
      return res.status(502).json({ error: 'AI symptom analysis returned an unexpected format. Please try again.' })
    }

    return res.json(parsed)
  } catch (err) {
    console.error('symptom-check error', err)
    return res.status(500).json({ error: 'AI symptom analysis failed. Please try again shortly.' })
  }
})

export default router