import { ethers } from "ethers";
import VotingSystemABI from "../contracts/VotingSystem.json";
import { Candidate } from "../types/candidate";
import { cache } from "../lib/cache";
import * as demo from "./demo-backend";

// Demo mode — when set, every blockchain call routes to Supabase-backed
// mocks (see demo-backend.ts). OFF by default: the live contract at
// CONTRACT_ADDRESS already has real elections, so we want the app to
// read those. Set VITE_DEMO_MODE=true to use the Supabase mock backend
// for development / screenshots / offline testing.
export const IS_DEMO_MODE =
  (import.meta.env.VITE_DEMO_MODE as string | undefined)?.toLowerCase() ===
  'true';

// Contract address from deployment
export const CONTRACT_ADDRESS =
  (import.meta.env.VITE_CONTRACT_ADDRESS as string | undefined) ??
  '0xc0895D39fBBD1918067d5Fa41beDAF51d36665B5';

// RPC URL — prefer a private endpoint via VITE_RPC_URL (Alchemy / dRPC /
// QuickNode), otherwise fall back to the free public Polygon Amoy RPC.
// The public RPC is shared, slow, and rate-limited; a private one is
// 5-10x faster.
const PUBLIC_AMOY_RPC = 'https://rpc-amoy.polygon.technology/';
export const ALCHEMY_URL =
  (import.meta.env.VITE_RPC_URL as string | undefined) ?? PUBLIC_AMOY_RPC;
const IS_PRIVATE_RPC = ALCHEMY_URL !== PUBLIC_AMOY_RPC;

// Multicall3 — same address on every EVM chain including Polygon Amoy.
// Lets us batch many view calls into a single RPC roundtrip.
const MULTICALL3_ADDRESS = '0xcA11bde05977b3631167028862bE2a173976CA11';
const MULTICALL3_ABI = [
  'function aggregate3((address target, bool allowFailure, bytes callData)[] calls) external payable returns ((bool success, bytes returnData)[])',
];

// Block explorer — PolygonScan Amoy is the official Polygon testnet explorer.
// (OKLink retired their Amoy support; links there 404.)
export const EXPLORER_BASE_URL = 'https://amoy.polygonscan.com';
export const explorerTxUrl = (hash: string) => `${EXPLORER_BASE_URL}/tx/${hash}`;
export const explorerAddressUrl = (address: string) =>
  `${EXPLORER_BASE_URL}/address/${address}`;
export const explorerBlockUrl = (block: number | string) =>
  `${EXPLORER_BASE_URL}/block/${block}`;

// Etherscan V2 API — unified across all supported chains via `chainid`.
// A free key at https://etherscan.io/myapikey works for Polygon Amoy.
const ETHERSCAN_V2_API = 'https://api.etherscan.io/v2/api';
const POLYGON_AMOY_CHAIN_ID = 80002;
const ETHERSCAN_API_KEY = import.meta.env.VITE_ETHERSCAN_API_KEY as
  | string
  | undefined;
export const HAS_ETHERSCAN_KEY = !!ETHERSCAN_API_KEY;

// Types for blockchain interactions
export interface ElectionInfo {
  name: string;
  startTime: Date;
  endTime: Date;
  active: boolean;
  candidateCount: number;
}

export interface Transaction {
  hash: string;
  timestamp: Date;
  from: string;
  to: string;
  value: string;
  method: string;
  blockNumber: number;
  status: string;
}

export interface PaginatedTransactions {
  transactions: Transaction[];
  hasMore: boolean;
  nextBlock?: number;
}

export interface TransactionResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
  electionId?: number;
  from?: string;
  to?: string;
  blockNumber?: number;
}

// Enhanced rate limiter with retry logic.
// Public Amoy RPC rate-limits aggressively (~10 req/s), so we throttle.
// Private RPCs (Alchemy/dRPC) can handle hundreds of req/s, so we go full speed.
class RateLimiter {
  private requestQueue: Array<() => void> = [];
  private isProcessing = false;
  private lastRequestTime = 0;
  private readonly minInterval = IS_PRIVATE_RPC ? 0 : 150;
  private readonly maxRetries = 3;
  private readonly retryDelay = 2000; // 2 seconds between retries

  async executeRequest<T>(requestFn: () => Promise<T>): Promise<T> {
    // Fast path for private RPCs: skip the serializing queue entirely so
    // Promise.all() fan-outs actually run in parallel.
    if (this.minInterval === 0) {
      return this.retryRequest(requestFn);
    }

    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          const result = await this.retryRequest(requestFn);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      this.processQueue();
    });
  }

  private async retryRequest<T>(requestFn: () => Promise<T>): Promise<T> {
    let lastError: any;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await requestFn();
      } catch (error: any) {
        lastError = error;
        
        // Check if it's a temporary Alchemy API error
        const isTemporaryError = error?.info?.error?.code === -32001 || 
                                error?.info?.error?.message?.includes("Unable to complete request") ||
                                error?.info?.error?.message?.includes("Internal error");
        
        if (isTemporaryError && attempt < this.maxRetries) {
          console.log(`Alchemy API temporary error, retrying attempt ${attempt}/${this.maxRetries}...`);
          await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
          continue;
        }
        
        throw error;
      }
    }
    
    throw lastError;
  }

  private async processQueue() {
    if (this.isProcessing || this.requestQueue.length === 0) return;
    
    this.isProcessing = true;
    
    while (this.requestQueue.length > 0) {
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      
      if (timeSinceLastRequest < this.minInterval) {
        await new Promise(resolve => setTimeout(resolve, this.minInterval - timeSinceLastRequest));
      }
      
      const request = this.requestQueue.shift();
      if (request) {
        this.lastRequestTime = Date.now();
        await request();
      }
    }
    
    this.isProcessing = false;
  }
}

const rateLimiter = new RateLimiter();

// Initialize ethers provider
const getProvider = () => {
  return new ethers.JsonRpcProvider(ALCHEMY_URL);
};

// Initialize contract instance for read-only operations
const getReadOnlyContract = () => {
  const provider = getProvider();
  return new ethers.Contract(CONTRACT_ADDRESS, VotingSystemABI.abi, provider);
};

// Create an election
export const createElection = async (
  name: string,
  startTime: Date,
  endTime: Date,
  candidateNames: string[],
  candidateParties: string[],
): Promise<TransactionResult> => {
  if (IS_DEMO_MODE) {
    return demo.createElection(name, startTime, endTime, candidateNames, candidateParties);
  }
  if (!window.ethereum) {
    return { success: false, error: "MetaMask is not installed!" };
  }

  try {
    console.log("Creating election with parameters:", {
      name,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      candidateNames,
      candidateParties
    });
    
    await window.ethereum.request({ method: 'eth_requestAccounts' });
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(CONTRACT_ADDRESS, VotingSystemABI.abi, signer);

    // Convert dates to Unix timestamps
    const startTimeUnix = BigInt(Math.floor(startTime.getTime() / 1000));
    const endTimeUnix = BigInt(Math.floor(endTime.getTime() / 1000));

    console.log("Converted timestamps:", {
      startTimeUnix: startTimeUnix.toString(),
      endTimeUnix: endTimeUnix.toString()
    });

    try {
      // Send the transaction
      console.log("Sending transaction to create election...");
      const tx = await contract.createElection(
        name,
        startTimeUnix,
        endTimeUnix,
        candidateNames,
        candidateParties
      );
      
      console.log("Transaction sent:", tx.hash);
      
      // Wait for transaction confirmation
      console.log("Waiting for transaction confirmation...");
      const receipt = await tx.wait();
      console.log("Transaction confirmed:", receipt);
      
      // Safely extract properties from receipt
      const result: TransactionResult = { 
        success: true, 
        transactionHash: receipt.hash || tx.hash,
        from: typeof receipt.from === 'string' ? receipt.from : undefined,
        to: typeof receipt.to === 'string' ? receipt.to : undefined,
        blockNumber: typeof receipt.blockNumber === 'number' || 
                    typeof receipt.blockNumber === 'bigint' ? 
                    Number(receipt.blockNumber) : undefined
      };
      
      // Import the resetAllVoterStatus function from supabase.ts dynamically
      try {
        // Reset all voter status to 'N' for the new election
        const { resetAllVoterStatus } = await import('./supabase');
        await resetAllVoterStatus();
        console.log("Reset all voter status to 'N' for the new election");
      } catch (resetError) {
        console.error("Error resetting voter status:", resetError);
        // Continue with the success result even if reset fails
      }
      
      console.log("Returning successful result:", result);
      return result;
    } catch (error: any) {
      console.error("Contract error creating election:", error);
      
      // Check for specific errors and provide clearer messages
      let errorMessage = "Failed to create election";
      
      if (error.message) {
        if (error.message.includes("coalesce")) {
          errorMessage = "Transaction processing error. Please try again with a different time range.";
        } else if (error.message.includes("user rejected")) {
          errorMessage = "Transaction was rejected by the user.";
        } else if (error.message.includes("insufficient funds")) {
          errorMessage = "Insufficient funds to complete the transaction.";
        } else {
          errorMessage = error.message;
        }
      }
      
      return { 
        success: false, 
        error: errorMessage
      };
    }
  } catch (error: any) {
    console.error("Election creation error:", error);
    return { 
      success: false, 
      error: error.message || "Failed to connect to wallet" 
    };
  }
};

// Get active election ID
export const getActiveElectionId = async (): Promise<number> => {
  if (IS_DEMO_MODE) return demo.getActiveElectionId();
  const cacheKey = 'activeElectionId';
  const cached = cache.get<number>(cacheKey);
  if (cached !== null) return cached;

  const contract = getReadOnlyContract();
  try {
    const currentId = await rateLimiter.executeRequest(async () => {
      return await contract.currentElectionId();
    });
    const result = Number(currentId);
    cache.set(cacheKey, result, 30000); // Cache for 30 seconds
    return result;
  } catch (error: any) {
    console.error("Error getting active election ID:", error);
    
    // Check for specific Alchemy API errors
    if (error?.info?.error?.code === -32001) {
      console.error("Alchemy API Error: Your new Alchemy project may need Enhanced APIs enabled for Polygon Amoy");
    } else if (error?.info?.error?.code === -32000) {
      console.error("Alchemy API Error: Internal error - check if Enhanced APIs are enabled");
    }
    
    return 0;
  }
};

// Get election info with caching
export const getElectionInfo = async (electionId: number): Promise<ElectionInfo | null> => {
  if (IS_DEMO_MODE) return demo.getElectionInfo(electionId);
  const cacheKey = `electionInfo_${electionId}`;
  const cached = cache.get<ElectionInfo | null>(cacheKey);
  if (cached !== null) return cached;

  const contract = getReadOnlyContract();
  try {
    const info = await rateLimiter.executeRequest(async () => {
      return await contract.getElectionInfo(electionId);
    });

    const result = {
      name: info.name,
      startTime: new Date(Number(info.startTime) * 1000),
      endTime: new Date(Number(info.endTime) * 1000),
      active: info.active,
      candidateCount: Number(info.candidateCount)
    };
    
    cache.set(cacheKey, result, 120000); // Cache for 2 minutes
    return result;
  } catch (error) {
    console.error(`Error getting election info for ID ${electionId}:`, error);
    cache.set(cacheKey, null, 30000); // Cache error for 30 seconds
    return null;
  }
};

// -----------------------------------------------------------------------
// Multicall3 batching
// -----------------------------------------------------------------------
// One RPC roundtrip can fetch info + candidates + total votes for many
// elections at once. Each election normally takes 3 separate RPC calls;
// with multicall, N elections take 1 call total.

export interface ElectionBundle {
  info: ElectionInfo;
  candidates: Candidate[];
  totalVotes: number;
}

export const getElectionsBundle = async (
  electionIds: number[]
): Promise<Map<number, ElectionBundle>> => {
  if (IS_DEMO_MODE) return demo.getElectionsBundle(electionIds);
  const result = new Map<number, ElectionBundle>();
  if (electionIds.length === 0) return result;

  // Serve from cache where possible, only fetch the gaps.
  const missing: number[] = [];
  for (const id of electionIds) {
    const info = cache.get<ElectionInfo>(`electionInfo_${id}`);
    const candidates = cache.get<Candidate[]>(`candidates_${id}`);
    const totalVotes = cache.get<number>(`totalVotes_${id}`);
    if (info && candidates && totalVotes !== null) {
      result.set(id, { info, candidates, totalVotes });
    } else {
      missing.push(id);
    }
  }
  if (missing.length === 0) return result;

  const provider = getProvider();
  const votingIface = new ethers.Interface(VotingSystemABI.abi);
  const multicall = new ethers.Contract(
    MULTICALL3_ADDRESS,
    MULTICALL3_ABI,
    provider
  );

  // 3 calls per election: getElectionInfo, getAllCandidates, getTotalVotes
  const calls = missing.flatMap((id) => [
    {
      target: CONTRACT_ADDRESS,
      allowFailure: true,
      callData: votingIface.encodeFunctionData('getElectionInfo', [id]),
    },
    {
      target: CONTRACT_ADDRESS,
      allowFailure: true,
      callData: votingIface.encodeFunctionData('getAllCandidates', [id]),
    },
    {
      target: CONTRACT_ADDRESS,
      allowFailure: true,
      callData: votingIface.encodeFunctionData('getTotalVotes', [id]),
    },
  ]);

  try {
    const returned: Array<{ success: boolean; returnData: string }> =
      await rateLimiter.executeRequest(() =>
        multicall.aggregate3.staticCall(calls)
      );

    missing.forEach((id, i) => {
      const infoRes = returned[i * 3];
      const candRes = returned[i * 3 + 1];
      const totalRes = returned[i * 3 + 2];

      if (!infoRes.success || !candRes.success || !totalRes.success) return;

      const decodedInfo = votingIface.decodeFunctionResult(
        'getElectionInfo',
        infoRes.returnData
      );
      const decodedCand = votingIface.decodeFunctionResult(
        'getAllCandidates',
        candRes.returnData
      );
      const decodedTotal = votingIface.decodeFunctionResult(
        'getTotalVotes',
        totalRes.returnData
      );

      const info: ElectionInfo = {
        name: decodedInfo[0],
        startTime: new Date(Number(decodedInfo[1]) * 1000),
        endTime: new Date(Number(decodedInfo[2]) * 1000),
        active: decodedInfo[3],
        candidateCount: Number(decodedInfo[4]),
      };
      const candidates: Candidate[] = (decodedCand[0] as string[]).map(
        (name, idx) => ({
          name,
          party: decodedCand[1][idx],
          votes: Number(decodedCand[2][idx]),
          index: idx,
        })
      );
      const totalVotes = Number(decodedTotal[0]);

      cache.set(`electionInfo_${id}`, info, 120000);
      cache.set(`candidates_${id}`, candidates, 60000);
      cache.set(`totalVotes_${id}`, totalVotes, 60000);
      result.set(id, { info, candidates, totalVotes });
    });
  } catch (error) {
    console.error('Multicall failed, falling back to per-election calls:', error);
    // Fallback: hit the individual cached functions in parallel.
    await Promise.all(
      missing.map(async (id) => {
        const [info, candidates, totalVotes] = await Promise.all([
          getElectionInfo(id),
          getAllCandidates(id),
          getTotalVotes(id),
        ]);
        if (info) result.set(id, { info, candidates, totalVotes });
      })
    );
  }

  return result;
};

// Get all candidates for an election with caching
export const getAllCandidates = async (electionId: number): Promise<Candidate[]> => {
  if (IS_DEMO_MODE) return demo.getAllCandidates(electionId);
  const cacheKey = `candidates_${electionId}`;
  const cached = cache.get<Candidate[]>(cacheKey);
  if (cached !== null) return cached;

  const contract = getReadOnlyContract();
  try {
    const result = await rateLimiter.executeRequest(async () => {
      return await contract.getAllCandidates(electionId);
    });

    const candidates = result.names.map((name: string, i: number) => ({
      name,
      party: result.parties[i],
      votes: Number(result.votesCounts[i]),
      index: i
    }));
    
    cache.set(cacheKey, candidates, 60000); // Cache for 1 minute
    return candidates;
  } catch (error) {
    console.error(`Error getting candidates for election ${electionId}:`, error);
    const emptyResult: Candidate[] = [];
    cache.set(cacheKey, emptyResult, 30000); // Cache empty result for 30 seconds
    return emptyResult;
  }
};

// Get total votes in an election with caching
export const getTotalVotes = async (electionId: number): Promise<number> => {
  if (IS_DEMO_MODE) return demo.getTotalVotes(electionId);
  const cacheKey = `totalVotes_${electionId}`;
  const cached = cache.get<number>(cacheKey);
  if (cached !== null) return cached;

  const contract = getReadOnlyContract();
  try {
    const total = await rateLimiter.executeRequest(async () => {
      return await contract.getTotalVotes(electionId);
    });
    const result = Number(total);
    cache.set(cacheKey, result, 60000); // Cache for 1 minute
    return result;
  } catch (error) {
    console.error(`Error getting total votes for election ${electionId}:`, error);
    cache.set(cacheKey, 0, 30000); // Cache error result for 30 seconds
    return 0;
  }
};

// Cast a vote
export const castVote = async (
  electionId: number,
  candidateIndex: number,
  voterNINHash: string
): Promise<TransactionResult> => {
  if (IS_DEMO_MODE) {
    // In demo mode, the voter address is whatever the mock wallet stored
    // in localStorage — see use-metamask.tsx demo branch.
    const voterAddress =
      localStorage.getItem('demo_wallet') ?? '0xDemoVoter';
    return demo.castVote(electionId, candidateIndex, voterNINHash, voterAddress);
  }
  if (!window.ethereum) {
    return { success: false, error: "MetaMask is not installed!" };
  }

  try {

    await window.ethereum.request({ method: 'eth_requestAccounts' });
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const address = await signer.getAddress();
    console.log("Voting from address:", address);
    
    // Create a unique voter hash that combines election ID and NIN hash
    // First ensure the NIN hash is in the correct format
    const cleanNINHash = voterNINHash.startsWith('0x') ? voterNINHash.slice(2) : voterNINHash;

    // Pack the election ID and NIN hash together and create a new hash
    const uniqueVoterHash = ethers.keccak256(
      ethers.solidityPacked(
        ['uint256', 'bytes32'],
        [electionId, `0x${cleanNINHash}`]
      )
    );

    console.log("Casting vote with:", {
      electionId,
      candidateIndex,
      uniqueVoterHash
    });

    // Create contract with explicit gas settings
    const contract = new ethers.Contract(CONTRACT_ADDRESS, VotingSystemABI.abi, signer);
    
    // Check if voter has already voted
    try {
      const hasVoted = await contract.hasVoted(electionId, uniqueVoterHash);
      console.log("Has voter already voted:", hasVoted);
      if (hasVoted) {
        return {
          success: false,
          error: "You have already voted in this election."
        };
      }
    } catch (err) {
      console.warn("Error checking if voter has voted:", err);
      // Continue anyway as the contract will enforce this
    }
    
    // Get gas estimate for better transaction parameters
    try {
      // Estimate gas for the transaction
      const gasEstimate = await contract.castVote.estimateGas(
        electionId, 
        candidateIndex, 
        uniqueVoterHash
      );
      console.log("Gas estimate for vote:", gasEstimate.toString());
      
      // Add 30% buffer to gas estimate
      const gasLimit = Math.ceil(Number(gasEstimate) * 1.3);
      console.log("Using gas limit:", gasLimit);
      
      // Send the transaction with explicit gas settings
      const tx = await contract.castVote(
        electionId, 
        candidateIndex, 
        uniqueVoterHash, 
        { gasLimit }
      );
      
      console.log("Vote transaction sent:", tx.hash);
      
      // Update voter status in database while transaction is confirming
      try {
        const { updateNINVerificationStatus } = await import('./supabase');
        await updateNINVerificationStatus(address, 'Y');
        console.log("Updated voter status to 'Y' in database");
      } catch (dbError) {
        console.error("Error updating voter status:", dbError);
        // Continue with blockchain transaction even if database update fails
      }
      
      // Wait for receipt
      console.log("Waiting for transaction confirmation...");
      const receipt = await tx.wait();
      console.log("Transaction confirmed:", receipt);

      // After successful vote, open the transaction on PolygonScan Amoy
      window.open(explorerTxUrl(receipt.hash), '_blank');

      return {
        success: true,
        transactionHash: receipt.hash,
        electionId,
        from: receipt.from,
        to: receipt.to,
        blockNumber: receipt.blockNumber
      };
    } catch (error: any) {
      console.error("Error in gas estimation or transaction:", error);
      
      // Special handling for common errors
      if (error.code === 4001) {
        return { success: false, error: "Transaction rejected by user." };
      } else if (error.code === -32603) {
        return { 
          success: false, 
          error: "MetaMask internal error. Please make sure you have enough MATIC for gas fees and try again."
        };
      } else if (error.reason && error.reason.includes("has already voted")) {
        return { success: false, error: "You have already voted in this election." };
      }
      
      return { success: false, error: error.message || "Unknown error during transaction" };
    }
  } catch (error: any) {
    console.error("Error casting vote:", error);
    
    // Format error message for better user experience
    let errorMessage = "Error casting vote";
    
    if (error.code === "ACTION_REJECTED") {
      errorMessage = "Transaction was rejected in your wallet";
    } else if (error.reason) {
      errorMessage = error.reason;
    } else if (error.message) {
      if (error.message.includes("coalesce")) {
        errorMessage = "Transaction error. Please check if you have enough MATIC for gas fees.";
      } else {
        errorMessage = error.message;
      }
    }
    
    return { success: false, error: errorMessage };
  }
};

// Helper function to generate SHA-256 hash of NIN
export const hashNIN = async (nin: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(nin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
};

// Check if address is admin
export const isAdmin = async (address: string): Promise<boolean> => {
  if (IS_DEMO_MODE) return demo.isAdmin(address);
  try {
    const contract = getReadOnlyContract();
    const admin = await rateLimiter.executeRequest(async () => {
      return await contract.admin();
    });
    return admin.toLowerCase() === address.toLowerCase();
  } catch (error) {
    console.error("Error checking admin status:", error);
    return false;
  }
};

// Interface for the Election
export interface Election {
  exists: boolean;
  name: string;
  startTime: string;
  endTime: string;
}

// Fetch real on-chain contract transactions.
//
// PRIMARY: Etherscan V2 API. Indexed, full history, one call, fast.
//   Needs a free API key in VITE_ETHERSCAN_API_KEY.
//
// FALLBACK: eth_getLogs walking. Used only when no API key is set. We
// walk backwards from `latestBlock` in 10k-block chunks, since public
// RPCs cap eth_getLogs ranges. Slow and prone to silent failures under
// rate-limiting — that's why Etherscan is preferred.
const BLOCK_WINDOW = 10_000;
const MAX_LOOKBACK_BLOCKS = 500_000;

// Reconstruct a transaction-like feed from contract STATE.
//
// The contract emits no events, so eth_getLogs can't find anything and
// Alchemy's getAssetTransfers ignores 0-value contract calls. BUT we can
// read state directly: getActiveElectionId gives us the count, then per
// election getElectionInfo + getAllCandidates + getTotalVotes tells us
// names, dates, candidates, and vote counts. From that we synthesise
// one createElection entry per election + N castVote entries per election.
//
// Tradeoff: tx hashes are synthetic (prefixed `0xstate:`), so they don't
// link to PolygonScan. The Etherscan path (if a key is set) wins for that.
async function buildTransactionsFromState(
  pageSize: number
): Promise<Transaction[]> {
  const nextId = await getActiveElectionId();
  if (nextId <= 1) return [];

  const ids = Array.from({ length: nextId - 1 }, (_, i) => nextId - 1 - i);
  const bundles = await getElectionsBundle(ids);

  let adminAddress = '0x0000000000000000000000000000000000000000';
  try {
    const contract = getReadOnlyContract();
    const a = await rateLimiter.executeRequest(() => contract.admin());
    if (typeof a === 'string') adminAddress = a;
  } catch (err) {
    console.warn('[blockchain] admin() lookup failed; using fallback', err);
  }

  const txs: Transaction[] = [];

  // Higher election ID → higher synthetic block so newest sorts first.
  // Within an election, the createElection event is at the base block
  // and votes are spaced after it.
  const BASE = 1_000_000;
  const SPACING = 1_000;

  for (const id of ids) {
    const b = bundles.get(id);
    if (!b?.info?.name) continue;

    const baseBlock = BASE + id * SPACING;

    // createElection — timestamp ~1h before election start (best guess)
    txs.push({
      hash: `0xstate:create:${id}`,
      timestamp: new Date(b.info.startTime.getTime() - 3_600_000),
      from: adminAddress,
      to: CONTRACT_ADDRESS,
      method: 'createElection',
      value: '0',
      blockNumber: baseBlock,
      status: 'Confirmed',
    });

    if (b.totalVotes === 0) continue;

    // castVote — spread N votes evenly between start and end
    const start = b.info.startTime.getTime();
    const end = b.info.endTime.getTime();
    const duration = Math.max(0, end - start);
    for (let i = 0; i < b.totalVotes; i++) {
      const ratio = b.totalVotes === 1 ? 0.5 : i / (b.totalVotes - 1);
      const ts = new Date(start + ratio * duration);
      txs.push({
        hash: `0xstate:vote:${id}:${i}`,
        timestamp: ts,
        from: '0xvoter',
        to: CONTRACT_ADDRESS,
        method: 'castVote',
        value: '0',
        blockNumber: baseBlock + i + 1,
        status: 'Confirmed',
      });
    }
  }

  // Newest first by synthetic block number
  txs.sort((a, b) => b.blockNumber - a.blockNumber);
  return txs.slice(0, pageSize);
}

export function isSyntheticTxHash(hash: string): boolean {
  return hash.startsWith('0xstate:');
}

async function fetchTransactionsViaEtherscan(
  apiKey: string,
  pageSize: number
): Promise<Transaction[]> {
  const url = new URL(ETHERSCAN_V2_API);
  url.searchParams.set('chainid', String(POLYGON_AMOY_CHAIN_ID));
  url.searchParams.set('module', 'account');
  url.searchParams.set('action', 'txlist');
  url.searchParams.set('address', CONTRACT_ADDRESS);
  url.searchParams.set('startblock', '0');
  url.searchParams.set('endblock', '99999999');
  url.searchParams.set('page', '1');
  url.searchParams.set('offset', String(Math.min(pageSize, 10_000)));
  url.searchParams.set('sort', 'desc');
  url.searchParams.set('apikey', apiKey);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Etherscan HTTP ${res.status}`);
  const data = await res.json();

  if (data.status === '0') {
    if (data.message === 'No transactions found') return [];
    throw new Error(`Etherscan: ${data.message ?? 'unknown error'}`);
  }
  if (data.status !== '1' || !Array.isArray(data.result)) {
    throw new Error('Etherscan: unexpected response shape');
  }

  // Decode each tx's method by parsing its calldata against our ABI.
  const iface = new ethers.Interface(VotingSystemABI.abi as ethers.InterfaceAbi);
  return data.result.map((tx: Record<string, string>) => {
    let method = 'unknown';
    try {
      if (tx.input && tx.input !== '0x') {
        const parsed = iface.parseTransaction({ data: tx.input });
        if (parsed?.name) method = parsed.name;
      }
    } catch {
      // Unknown selector — leave as 'unknown'.
    }
    return {
      hash: tx.hash,
      timestamp: new Date(Number(tx.timeStamp) * 1000),
      from: tx.from,
      to: tx.to,
      method,
      value: tx.value ?? '0',
      blockNumber: Number(tx.blockNumber),
      status: tx.txreceipt_status === '1' ? 'Confirmed' : 'Failed',
    } as Transaction;
  });
}

export const getContractTransactions = async (
  startBlock?: number,
  pageSize: number = 25
): Promise<PaginatedTransactions> => {
  if (IS_DEMO_MODE) return demo.getContractTransactions(startBlock, pageSize);
  const cacheKey = `transactions_${startBlock ?? 'latest'}_${pageSize}`;
  const cached = cache.get<PaginatedTransactions>(cacheKey);
  if (cached !== null) return cached;

  // Preferred: Etherscan when a key is configured — real tx hashes that
  // link out to PolygonScan.
  if (ETHERSCAN_API_KEY) {
    try {
      const transactions = await fetchTransactionsViaEtherscan(
        ETHERSCAN_API_KEY,
        pageSize
      );
      if (transactions.length > 0) {
        const result: PaginatedTransactions = {
          transactions,
          hasMore: transactions.length === pageSize,
          nextBlock: undefined,
        };
        cache.set(cacheKey, result, 120_000);
        return result;
      }
    } catch (err) {
      console.error(
        '[blockchain] Etherscan fetch failed, falling back to state:',
        err
      );
    }
  }

  // Default path: reconstruct from contract state — exactly how
  // Previous Elections works. Doesn't need any external API key, and
  // since the contract emits no events this is the only thing that
  // actually returns rows for this contract.
  try {
    const transactions = await buildTransactionsFromState(pageSize);
    const result: PaginatedTransactions = {
      transactions,
      hasMore: false,
      nextBlock: undefined,
    };
    cache.set(cacheKey, result, 60_000);
    return result;
  } catch (err) {
    console.error('[blockchain] State reconstruction failed:', err);
  }

  try {
    const provider = getProvider();
    const contract = new ethers.Contract(
      CONTRACT_ADDRESS,
      VotingSystemABI.abi as ethers.InterfaceAbi,
      provider
    );

    const latestBlock = await rateLimiter.executeRequest(() =>
      provider.getBlockNumber()
    );
    const topBlock = startBlock !== undefined ? startBlock : latestBlock;
    const floorBlock = Math.max(0, topBlock - MAX_LOOKBACK_BLOCKS);

    type RawEvent = { event: ethers.EventLog | ethers.Log; method: string };
    const allEvents: RawEvent[] = [];

    // Walk back in 10k-block chunks until we have enough events or we
    // hit the lookback floor.
    let toBlock = topBlock;
    let scannedFloor = topBlock;
    while (allEvents.length < pageSize && toBlock > floorBlock) {
      const fromBlock = Math.max(floorBlock, toBlock - BLOCK_WINDOW);
      scannedFloor = fromBlock;

      const [createEvents, voteEvents] = await Promise.all([
        rateLimiter
          .executeRequest(() =>
            contract.queryFilter(contract.filters.ElectionCreated(), fromBlock, toBlock)
          )
          .catch((e) => {
            console.error('ElectionCreated query failed:', e);
            return [] as ethers.EventLog[];
          }),
        rateLimiter
          .executeRequest(() =>
            contract.queryFilter(contract.filters.VoteCast(), fromBlock, toBlock)
          )
          .catch((e) => {
            console.error('VoteCast query failed:', e);
            return [] as ethers.EventLog[];
          }),
      ]);

      for (const event of createEvents) {
        allEvents.push({ event, method: 'createElection' });
      }
      for (const event of voteEvents) {
        allEvents.push({ event, method: 'castVote' });
      }

      if (fromBlock === 0) break;
      toBlock = fromBlock - 1;
    }

    const sorted = allEvents
      .sort((a, b) => b.event.blockNumber - a.event.blockNumber)
      .slice(0, pageSize);

    // Resolve receipts + blocks in parallel. Cache block lookups since
    // multiple events often share a block.
    const blockCache = new Map<number, Promise<ethers.Block | null>>();
    const getBlock = (n: number) => {
      if (!blockCache.has(n)) {
        blockCache.set(
          n,
          rateLimiter.executeRequest(() => provider.getBlock(n))
        );
      }
      return blockCache.get(n)!;
    };

    const transactions = await Promise.all(
      sorted.map(async ({ event, method }) => {
        const [receipt, block] = await Promise.all([
          rateLimiter.executeRequest(() =>
            provider.getTransactionReceipt(event.transactionHash)
          ),
          getBlock(event.blockNumber),
        ]);

        const blockTimestamp = block?.timestamp
          ? Number(block.timestamp) * 1000
          : Date.now();

        return {
          hash: event.transactionHash,
          timestamp: new Date(blockTimestamp),
          from: receipt?.from ?? '',
          to: CONTRACT_ADDRESS,
          method,
          value: '0',
          blockNumber: event.blockNumber,
          status: receipt?.status === 1 ? 'Confirmed' : 'Failed',
        } as Transaction;
      })
    );

    transactions.sort((a, b) => b.blockNumber - a.blockNumber);

    const hasMore = scannedFloor > 0;
    const nextBlock = hasMore ? scannedFloor - 1 : undefined;

    const result: PaginatedTransactions = { transactions, hasMore, nextBlock };
    cache.set(cacheKey, result, 120_000);
    return result;
  } catch (error) {
    console.error('Error fetching contract transactions:', error);
    const errorResult: PaginatedTransactions = { transactions: [], hasMore: false };
    cache.set(cacheKey, errorResult, 30_000);
    return errorResult;
  }
};