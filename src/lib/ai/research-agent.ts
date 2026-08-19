import { createAdminClient } from '@/utils/supabase/admin'
import { authorizePayment } from '../payments/treasury'
import { settleSession, type PayoutEntry } from '../payments/botchain'
import { embedQuery, cosineSimilarity, parseVector } from './embeddings'
import { z } from 'zod'

const evaluationSchema = z.object({
  relevant: z.boolean(),
  contributionScore: z.number().min(0).max(1),
  reasoning: z.string()
})

const finalOutputSchema = z.object({
  answer: z.string(),
})

// Basic helper for Gemini REST API
async function callGeminiJSON(prompt: string, schema: any) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set')

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
      }
    })
  })

  const data = await response.json()
  
  if (!response.ok) {
    throw new Error(`Gemini API Error: ${data.error?.message || 'Unknown'}`)
  }

  try {
    const jsonString = data.candidates[0].content.parts[0].text
    const parsed = JSON.parse(jsonString)
    return schema.parse(parsed)
  } catch (e) {
    throw new Error('Failed to parse Gemini output according to Zod schema')
  }
}

async function callOpenRouterJSON(prompt: string, schema: any) {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error('OPENROUTER_API_KEY is not set')

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'anthropic/claude-3-haiku',
      max_tokens: 700,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' }
    })
  })
  
  const data = await response.json()
  
  if (!response.ok) {
    throw new Error(`OpenRouter API Error: ${data.error?.message || 'Unknown'}`)
  }

  try {
    const jsonString = data.choices[0].message.content
    let cleanString = jsonString.trim()
    const firstBrace = cleanString.indexOf('{')
    const lastBrace = cleanString.lastIndexOf('}')
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleanString = cleanString.substring(firstBrace, lastBrace + 1)
    }
    const parsed = JSON.parse(cleanString)
    return schema.parse(parsed)
  } catch (e) {
    throw new Error('Failed to parse OpenRouter output according to Zod schema')
  }
}

async function callOpenAIJSON(prompt: string, schema: any) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set')

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: process.env.OPENAI_RESEARCH_MODEL || 'gpt-4o-mini',
      max_tokens: 700,
      messages: [
        {
          role: 'system',
          content: 'Return only a valid JSON object matching the requested schema. Do not use markdown code fences.'
        },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' }
    })
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(`OpenAI API Error: ${data.error?.message || 'Unknown'}`)
  }

  try {
    const parsed = JSON.parse(data.choices[0].message.content)
    return schema.parse(parsed)
  } catch {
    throw new Error('Failed to parse OpenAI output according to Zod schema')
  }
}

async function callAnthropicJSON(prompt: string, schema: any) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set')

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 700,
      system: 'You must return a valid JSON object matching the requested schema. Output only the raw JSON without any markdown code blocks.',
      messages: [{ role: 'user', content: prompt }]
    })
  })
  
  const data = await response.json()
  
  if (!response.ok) {
    throw new Error(`Anthropic API Error: ${data.error?.message || 'Unknown'}`)
  }

  try {
    const jsonString = data.content[0].text
    let cleanString = jsonString.trim()
    const firstBrace = cleanString.indexOf('{')
    const lastBrace = cleanString.lastIndexOf('}')
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleanString = cleanString.substring(firstBrace, lastBrace + 1)
    }
    const parsed = JSON.parse(cleanString)
    return schema.parse(parsed)
  } catch (e) {
    throw new Error('Failed to parse Anthropic output according to Zod schema')
  }
}

async function callLLM(prompt: string, schema: any, onProgress?: (msg: string) => void) {
  try {
    return await callGeminiJSON(prompt, schema)
  } catch (e: any) {
    console.warn(`Agent 1 API failed: ${e.message}. Falling back...`)
    if (process.env.ANTHROPIC_API_KEY) {
      if (onProgress) onProgress('Agent 1 rate limited. Falling back to Agent 2 (Secondary Node)...')
      return await callAnthropicJSON(prompt, schema)
    }
    if (process.env.OPENROUTER_API_KEY) {
      if (onProgress) onProgress('Agent 1 rate limited. Falling back to Agent 2 (Secondary Node)...')
      return await callOpenRouterJSON(prompt, schema)
    }
    if (process.env.OPENAI_API_KEY) {
      if (onProgress) onProgress('Primary agents unavailable. Falling back to OpenAI research agent...')
      return await callOpenAIJSON(prompt, schema)
    }
    throw e
  }
}

// Per-source context budget shown to the LLM (in chunks of ~1000 chars).
// Chunks are ranked by embedding similarity to the query; chunks without
// embeddings (older sources) fall back to document order.
const TOP_CHUNKS_PER_SOURCE = 8

function selectRelevantChunks(
  chunks: { chunk_text: string, embedding: string | number[] | null }[],
  queryEmbedding: number[] | null
): string {
  let ranked = chunks
  if (queryEmbedding) {
    const scored = chunks.map((c, i) => {
      const v = parseVector(c.embedding)
      return { i, score: v ? cosineSimilarity(queryEmbedding, v) : -1 }
    })
    // If nothing has embeddings every score is -1 and document order is preserved (stable sort)
    scored.sort((a, b) => b.score - a.score)
    ranked = scored.slice(0, TOP_CHUNKS_PER_SOURCE)
      .sort((a, b) => a.i - b.i) // restore document order for readability
      .map(s => chunks[s.i])
  } else {
    ranked = chunks.slice(0, TOP_CHUNKS_PER_SOURCE)
  }
  return ranked.map(c => c.chunk_text).join('\n[...]\n')
}

export async function runResearchAgent(
  sessionId: string,
  query: string,
  initialBudget: number,
  walletAddress: string | undefined,
  onProgress?: (msg: string) => void
) {
  let maxBudget = initialBudget;
  let totalSpentOnSources = 0;
  const platformFee = 0.20; // Ensure we keep $0.20 as platform revenue per prompt
  
  try {
  const supabase = createAdminClient()

  if (onProgress) onProgress('Agent 1 initialized. Connecting to Treasury and querying network...')

  // 1. Fetch available registered sources
  const { data: sources, error: sourcesError } = await supabase
    .from('sources')
    .select('id, url, title, price_usdc, source_chunks(chunk_text, embedding)')
    .eq('status', 'extracted')

  if (sourcesError || !sources) throw new Error('Failed to fetch sources')

  // Embed the query once for chunk-level retrieval across all sources.
  // If embedding fails (e.g. quota), fall back to document-order chunk selection.
  let queryEmbedding: number[] | null = null
  try {
    queryEmbedding = await embedQuery(query)
  } catch (e: any) {
    console.warn('Query embedding failed, falling back to document-order retrieval:', e.message)
    if (onProgress) onProgress('Vector index unavailable. Falling back to sequential scan...')
  }

  const purchasedSources: any[] = []
  const relevantSources: any[] = []
  let allocatedBudget = 0;
  
  // 2. Evaluate Sources and Execute Payments
  if (onProgress) onProgress(`Found ${sources.length} registered sources. Beginning evaluation...`)
  for (const source of sources) {
    if (onProgress) onProgress(`Evaluating relevance of: ${source.title}`)
    // Only evaluate sources we can afford within our remaining allocated budget
    if (allocatedBudget + parseFloat(source.price_usdc) > initialBudget) continue

    const sourceContent = selectRelevantChunks(source.source_chunks, queryEmbedding)

    const evalPrompt = `
      Evaluate the relevance and contribution of the following source text to the user's research query.
      Query: "${query}"
      Source Content: "${sourceContent}"
      
      Return a JSON object matching this schema:
      {
        "relevant": boolean,
        "contributionScore": number (0 to 1),
        "reasoning": string
      }
    `
    
    let evaluation
    try {
      evaluation = await callLLM(evalPrompt, evaluationSchema, onProgress)
    } catch (e) {
      console.warn(`Evaluation failed for source ${source.id}`)
      continue
    }

    // Record decision
    await supabase.from('citation_decisions').insert({
      session_id: sessionId,
      source_id: source.id,
      contribution_score: evaluation.contributionScore,
      accepted: evaluation.relevant && evaluation.contributionScore >= 0.5,
      reasoning: evaluation.reasoning
    })
    
    // If deemed highly relevant, add to context
    if (evaluation.relevant && evaluation.contributionScore >= 0.5) {
      relevantSources.push({
        id: source.id,
        title: source.title,
        url: source.url,
        content: sourceContent,
        price_usdc: source.price_usdc
      })
      allocatedBudget += parseFloat(source.price_usdc);
      if (onProgress) onProgress(`Evaluated ${source.title}. Score: ${evaluation.contributionScore.toFixed(2)}. Deemed highly relevant, adding to context...`)
    } else {
      if (onProgress) onProgress(`Evaluated ${source.title}. Score: ${evaluation.contributionScore.toFixed(2)}. Not relevant enough, skipping.`)
    }
  }

  // 3. Generate Final Grounded Answer
  if (onProgress) onProgress(`Synthesis phase. Generating factual answer grounded exclusively in relevant citations...`)
  
  let finalPrompt = `
    Answer the following query using ONLY the provided sources. 
    You must ground every factual claim in these explicitly provided citations.
    Query: "${query}"
    
    Available Sources:
  `
  
  relevantSources.forEach((s, index) => {
    finalPrompt += `\n[Source ${index + 1}] (ID: ${s.id}, Title: ${s.title}):\n${s.content}\n`
  })

  finalPrompt += `
    Return a JSON object matching this schema:
    {
      "answer": "Your detailed answer..."
    }

    The answer must read as natural prose — do NOT add bracketed IDs, footnote markers, or "[Source 1]"-style references inside it. Every source listed above already has payment reserved for it regardless of what this text contains, so there is no need to mark citations inline; just write a clear, accurate answer grounded in the sources provided.
  `

  const finalOutput = await callLLM(finalPrompt, finalOutputSchema, onProgress)

  // 4. Authorize Payments for every source the evaluation step already deemed
  // relevant (step 2), not the model's self-reported citationsUsed from this
  // second call. In practice the model sometimes writes an accurate answer
  // grounded in a source's content but still omits it from citationsUsed —
  // e.g. when it already "knows" the fact confidently enough that it doesn't
  // feel it needs to cite it, even though the source was what earned its
  // place in this prompt and had budget reserved for it. Evaluation is the
  // real relevance gate; treat it as the payment trigger too.
  if (onProgress) onProgress(`Authorizing payments for ${relevantSources.length} citation(s) evaluated as relevant...`)

  const payouts: PayoutEntry[] = []
  const authRecords: { authorizationId: string; sourceId: string }[] = []

  for (const source of relevantSources) {
    try {
      const { authorizationId, recipient, amountUsdt } = await authorizePayment(sessionId, source.id, parseFloat(source.price_usdc))

      payouts.push({ recipient, amountUsdt })
      authRecords.push({ authorizationId, sourceId: source.id })
      purchasedSources.push({
        id: source.id,
        title: source.title,
        url: source.url,
        content: source.content,
      })

      maxBudget -= amountUsdt;
      totalSpentOnSources += amountUsdt;
      if (onProgress) onProgress(`Authorized $${amountUsdt.toFixed(2)} for ${source.title}`)
    } catch (e: any) {
      console.error(`Failed to authorize payment for source ${source.id}:`, e.message)
      if (onProgress) onProgress(`Payment authorization failed for ${source.title}.`)
    }
  }

  // 5. Settle every citation payout AND the unspent-budget refund in one BOT Chain transaction
  // Waive the platform fee if no sources were useful (100% full refund)
  const actualPlatformFee = totalSpentOnSources > 0 ? platformFee : 0;
  const unspentBudget = Math.max(initialBudget - totalSpentOnSources - actualPlatformFee, 0);
  const refundAmount = walletAddress && unspentBudget >= 0.05 ? unspentBudget : 0;

  if (payouts.length > 0 || refundAmount > 0) {
    if (onProgress) onProgress(`Settling ${payouts.length} citation payment(s)${refundAmount > 0 ? ` and a $${refundAmount.toFixed(2)} refund` : ''} on BOT Chain...`)
    try {
      const txHash = await settleSession(sessionId, payouts, walletAddress, refundAmount)

      for (const rec of authRecords) {
        await supabase.from('payment_authorizations').update({ status: 'settled' }).eq('authorization_id', rec.authorizationId)
        await supabase.from('payment_settlements').insert({
          authorization_id: rec.authorizationId,
          transaction_hash: txHash,
          status: 'settled'
        })
      }

      for (const p of purchasedSources) {
        (p as any).receipt = { transactionHash: txHash }
      }

      if (onProgress) onProgress(`Settled on BOT Chain. Tx: ${txHash}`)
    } catch (err: any) {
      console.error('BOT Chain settlement failed:', err)
      if (onProgress) onProgress(`Settlement failed: ${err.message}. Authorized payments remain pending — no funds moved.`)
    }
  } else if (walletAddress) {
    if (onProgress) onProgress(`Unspent budget is $${unspentBudget.toFixed(2)} (below $0.05 minimum threshold). Retained by Treasury.`)
  }

  return {
    answer: finalOutput.answer,
    citationsUsed: purchasedSources,
    purchasedSources
  }

  } catch (err: any) {
    // --- Crash / Failure Full Refund Mechanism ---
    if (walletAddress) {
      if (onProgress) onProgress(`Research execution failed. Initiating full refund of $${initialBudget.toFixed(2)}...`)
      try {
        const txHash = await settleSession(sessionId, [], walletAddress, initialBudget);
        if (onProgress) onProgress(`Refunded $${initialBudget.toFixed(2)} on BOT Chain. Tx: ${txHash}`)
      } catch (refundErr: any) {
        console.error("Crash Refund failed:", refundErr);
      }
    }
    throw err;
  }
}
