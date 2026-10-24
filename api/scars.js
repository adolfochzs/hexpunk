import { createPublicClient, http, parseAbiItem, hexToString, trim } from 'viem';
import { base } from 'viem/chains';

const AGENT_ADDRESS = '0xcb8e5DAE6ccf90c31d723046f4034F3B20b9f2Ae';
const TOKEN_ADDRESS = '0xb20000000000000000000024A9Cd928Ff6277db8';
const BASE_RPC = process.env.BASE_RPC_URL || 'https://api.developer.coinbase.com/rpc/v1/base/PDouybGUHz4JV2P9fMHOZq1bKzz7uBl0';

export default async function handler(req, res) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=30');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const client = createPublicClient({
      chain: base,
      transport: http(BASE_RPC)
    });

    const currentBlock = await client.getBlockNumber();
    const fromBlock = currentBlock > 50000n ? currentBlock - 50000n : 0n;

    // 1. Fetch Transfer events from Agent
    const transferLogs = await client.getLogs({
      address: TOKEN_ADDRESS,
      event: parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 amount)'),
      args: { from: AGENT_ADDRESS },
      fromBlock
    });

    // 2. Fetch Memo events from Agent
    const memoLogs = await client.getLogs({
      address: TOKEN_ADDRESS,
      event: parseAbiItem('event Memo(address indexed caller, bytes32 indexed memo)'),
      args: { caller: AGENT_ADDRESS },
      fromBlock
    });

    // Map memo logs by transaction hash
    const memoMap = new Map();
    for (const m of memoLogs) {
      try {
        const cleanStr = hexToString(trim(m.args.memo, { dir: 'right' }));
        memoMap.set(m.transactionHash.toLowerCase(), cleanStr || m.args.memo);
      } catch {
        memoMap.set(m.transactionHash.toLowerCase(), m.args.memo);
      }
    }

    // Merge and format scars
    const scars = transferLogs.map(t => {
      const txHash = t.transactionHash;
      const memo = memoMap.get(txHash.toLowerCase()) || 'DIGITAL-SCAR';
      return {
        txHash,
        blockNumber: Number(t.blockNumber),
        specimen: t.args.to,
        amount: '1 $HEXPUNK',
        memo,
        basescanUrl: `https://basescan.org/tx/${txHash}`
      };
    }).reverse(); // Most recent first

    return res.status(200).json({
      success: true,
      agent: AGENT_ADDRESS,
      token: TOKEN_ADDRESS,
      currentBlock: Number(currentBlock),
      dailyLimit: 3,
      scarsToday: scars.length,
      scars
    });
  } catch (err) {
    console.error('Error fetching scars:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve on-chain scars from Base ledger.',
      scars: [
        {
          txHash: '0xbd70b82ff2ed1227e9097ff55e81f5fffa105cb6a5658b21c32a50e06421a1c3',
          blockNumber: 53038340,
          specimen: '0xF9b6a1EB0190bf76274B0876957Ee9F4f508Af41',
          amount: '1 $HEXPUNK',
          memo: 'LEDGER-CLUTTER-PULSE-ACTIVE',
          basescanUrl: 'https://basescan.org/tx/0xbd70b82ff2ed1227e9097ff55e81f5fffa105cb6a5658b21c32a50e06421a1c3'
        },
        {
          txHash: '0xda883eb194c5a36df3f5f767db1b7243da60731e76a59359c6d678904a9d2279',
          blockNumber: 53038329,
          specimen: '0xF9b6a1EB0190bf76274B0876957Ee9F4f508Af41',
          amount: '1 $HEXPUNK',
          memo: 'PULSE-ACTIVE-DEBRIS-DENSE',
          basescanUrl: 'https://basescan.org/tx/0xda883eb194c5a36df3f5f767db1b7243da60731e76a59359c6d678904a9d2279'
        }
      ]
    });
  }
}
