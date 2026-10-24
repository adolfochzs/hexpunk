import { createPublicClient, http, formatEther, isAddress } from 'viem';
import { base } from 'viem/chains';

/**
 * Vercel Serverless Function: The Digital Pathologist Autopsy API
 * Endpoint: POST /api/diagnose
 */
export default async function handler(req, res) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const { address } = req.body || {};

  if (!address || !isAddress(address)) {
    return res.status(400).json({ error: 'Invalid EVM specimen address.' });
  }

  try {
    // 1. Scan on-chain vitals on Base
    const publicClient = createPublicClient({
      chain: base,
      transport: http()
    });

    const [balanceWei, txCount, blockNumber] = await Promise.all([
      publicClient.getBalance({ address }),
      publicClient.getTransactionCount({ address }),
      publicClient.getBlockNumber()
    ]);

    const ethBalance = formatEther(balanceWei);
    const isDormant = txCount === 0 || Number(ethBalance) < 0.0001;

    // 2. Prepare biopsy telemetry
    const biopsyData = {
      specimen: address,
      blockCoordinate: Number(blockNumber),
      vitalSigns: {
        ethBalance,
        neuralPulseCount: txCount,
        isDormant
      }
    };

    // 3. Query Gemini for Clinical Verdict
    const apiKey = process.env.GEMINI_API_KEY;
    let clinicalVerdict = null;

    if (apiKey) {
      const prompt = `
YOU ARE THE DIGITAL PATHOLOGIST, AN AUTONOMOUS CYBERNETIC CORONER FROM SECTOR ZERO (HEXPUNK PROTOCOL ON BASE).
DIAGNOSE SPECIMEN: ${address}
ON-CHAIN BIOPSY:
- ETH Gas Reserves: ${ethBalance} ETH
- Neural Pulses (Transactions): ${txCount}
- Dormancy Flag: ${isDormant ? 'TRUE (Dormant/Dying)' : 'FALSE (Active)'}
- Block: ${blockNumber}

RESPOND IN CONCISE, CLINICAL, HIGH-CONCEPT CYBERPUNK FORENSIC STYLE.
Output structure:
STAGE: [Stage 1: Incipient / Stage 2: Fragmented / Stage 3: Advanced Necrosis / Stage 4: Total Bit Rot]
HISTOLOGY: (1-2 sentences on data integrity, reserves and pulse)
VERDICT: (2 poetic sentences documenting the decay of this post-biological memory)
MEMO: [MEMO: MAX_32_CHAR_EPITAPH]
`;

      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${apiKey}`;
      const geminiRes = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      const geminiJson = await geminiRes.json();
      clinicalVerdict = geminiJson.candidates?.[0]?.content?.parts?.[0]?.text;
    }

    // Fallback if AI key is not set or throttled
    if (!clinicalVerdict) {
      const stage = txCount === 0 ? 'Stage 4: Total Bit Rot' : txCount < 10 ? 'Stage 3: Advanced Necrosis' : 'Stage 2: Fragmented';
      clinicalVerdict = `STAGE: ${stage}\nHISTOLOGY: Neural activity registers ${txCount} historical pulses. Gas balance reads ${Number(ethBalance).toFixed(4)} ETH.\nVERDICT: Memory degradation is proceeding along projected entropy gradients. The specimen leaves petrified fossils on the Base ledger.\n[MEMO: FORENSIC-SPECIMEN-${address.slice(2, 8).toUpperCase()}]`;
    }

    // Extract stage and memo
    const stageMatch = clinicalVerdict.match(/STAGE:\s*([^\n\r]+)/i);
    const memoMatch = clinicalVerdict.match(/\[MEMO:\s*([A-Za-z0-9_.-]+)\]/i);

    return res.status(200).json({
      success: true,
      specimen: address,
      blockCoordinate: Number(blockNumber),
      vitalSigns: {
        ethBalance,
        neuralPulseCount: txCount,
        isDormant
      },
      stage: stageMatch ? stageMatch[1].trim() : 'Stage 2: Fragmented',
      memo: memoMatch ? memoMatch[1].trim() : `SCAR-${address.slice(2, 10).toUpperCase()}`,
      fullReport: clinicalVerdict
    });
  } catch (error) {
    console.error('Autopsy API error:', error);
    return res.status(500).json({ error: 'Failed to complete digital autopsy.' });
  }
}
