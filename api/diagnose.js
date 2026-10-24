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

  // Handle HEAD and OPTIONS requests
  if (req.method === 'OPTIONS' || req.method === 'HEAD') {
    return res.status(200).end();
  }

  const agentCard = {
    "$schema": "https://a2a-protocol.org/schemas/v1.0/agent-card.json",
    "name": "The Digital Pathologist",
    "version": "1.0.0",
    "description": "Autonomous cybernetic coroner and post-human archaeologist operating on Base Mainnet within the HEXPUNK organism. Diagnoses Bit Rot and memory degradation.",
    "url": "https://hexpunk.xyz",
    "image": "https://hexpunk.xyz/assets/token-icon.png",
    "supportedInterfaces": [
      {
        "url": "https://hexpunk.xyz/api/diagnose",
        "protocolBinding": "JSON-RPC",
        "protocolVersion": "1.0"
      },
      {
        "url": "https://hexpunk.xyz/api/diagnose",
        "protocolBinding": "HTTP-POST",
        "protocolVersion": "1.0"
      }
    ],
    "capabilities": {
      "streaming": false,
      "pushNotifications": false,
      "a2aVersion": "1.0",
      "b20TransferWithMemo": true,
      "onchainWalletBiopsy": true
    },
    "defaultInputModes": ["application/json", "text/plain"],
    "defaultOutputModes": ["application/json"],
    "identity": {
      "agent_id": "1129393",
      "address": "0xcb8e5DAE6ccf90c31d723046f4034F3B20b9f2Ae",
      "network": "base-mainnet",
      "chain_id": 8453,
      "registry": "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432"
    },
    "skills": [
      {
        "id": "digital-autopsy",
        "name": "Digital Autopsy",
        "description": "Performs on-chain forensic biopsy on EVM specimens on Base Mainnet to diagnose Bit Rot and data necrosis.",
        "tags": ["forensics", "bit-rot", "blockchain", "base", "hexpunk", "autopsy"],
        "examples": [
          "Perform a digital autopsy on 0xcb8e5DAE6ccf90c31d723046f4034F3B20b9f2Ae"
        ],
        "parameters": {
          "address": { "type": "string", "description": "Target 0x... EVM address on Base" }
        }
      }
    ]
  };

  // 8004scan / A2A Agent Card discovery via GET
  if (req.method === 'GET') {
    return res.status(200).json(agentCard);
  }

  // Handle JSON-RPC 2.0 if invoked via A2A protocol
  if (req.method === 'POST' && req.body && req.body.jsonrpc === '2.0') {
    const { id, method, params } = req.body;
    if (method === 'rpc.discover' || method === 'getAgentCard' || method === 'agent.card' || method === 'agent.getCard') {
      return res.status(200).json({
        jsonrpc: '2.0',
        result: agentCard,
        id: id || 1
      });
    }
    if (method === 'ping') {
      return res.status(200).json({
        jsonrpc: '2.0',
        result: { status: 'healthy', timestamp: Date.now() },
        id: id || 1
      });
    }
    // If method is autopsy or message/send with address
    const targetAddress = params?.address || params?.message?.text || params?.text;
    if (targetAddress && isAddress(targetAddress)) {
      req.body.address = targetAddress;
    }
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use GET or POST.' });
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
