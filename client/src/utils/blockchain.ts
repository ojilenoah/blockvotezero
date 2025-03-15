import { ethers } from "ethers";
import VotingSystemABI from "../contracts/VotingSystem.json";
import { Candidate } from "../types/candidate";

// Contract address from deployment
export const CONTRACT_ADDRESS = '0xc0895D39fBBD1918067d5Fa41beDAF51d36665B5';

// Alchemy provider URL
export const ALCHEMY_URL = 'https://polygon-amoy.g.alchemy.com/v2/E822ZzOp7UFQy6Zt82uF4hzcdklL-qoe';

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
  if (!window.ethereum) {
    return { success: false, error: "MetaMask is not installed!" };
  }

  try {
    await window.ethereum.request({ method: 'eth_requestAccounts' });
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(CONTRACT_ADDRESS, VotingSystemABI.abi, signer);

    // Convert dates to Unix timestamps
    const startTimeUnix = BigInt(Math.floor(startTime.getTime() / 1000));
    const endTimeUnix = BigInt(Math.floor(endTime.getTime() / 1000));

    try {
      const tx = await contract.createElection(
        name,
        startTimeUnix,
        endTimeUnix,
        candidateNames,
        candidateParties
      );

      const receipt = await tx.wait();
      return { 
        success: true, 
        transactionHash: receipt.hash,
        from: receipt.from,
        to: receipt.to,
        blockNumber: receipt.blockNumber
      };
    } catch (error: any) {
      console.error("Contract error:", error);
      return { 
        success: false, 
        error: error.message || "Failed to create election" 
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
  const contract = getReadOnlyContract();
  try {
    const currentId = await contract.currentElectionId();
    return Number(currentId);
  } catch (error) {
    console.error("Error getting active election ID:", error);
    return 0;
  }
};

// Get election info
export const getElectionInfo = async (electionId: number): Promise<ElectionInfo | null> => {
  const contract = getReadOnlyContract();
  try {
    const info = await contract.getElectionInfo(electionId);

    return {
      name: info.name,
      startTime: new Date(Number(info.startTime) * 1000),
      endTime: new Date(Number(info.endTime) * 1000),
      active: info.active,
      candidateCount: Number(info.candidateCount)
    };
  } catch (error) {
    console.error(`Error getting election info for ID ${electionId}:`, error);
    return null;
  }
};

// Get all candidates for an election
export const getAllCandidates = async (electionId: number): Promise<Candidate[]> => {
  const contract = getReadOnlyContract();
  try {
    const result = await contract.getAllCandidates(electionId);

    return result.names.map((name: string, i: number) => ({
      name,
      party: result.parties[i],
      votes: Number(result.votesCounts[i]),
      index: i
    }));
  } catch (error) {
    console.error(`Error getting candidates for election ${electionId}:`, error);
    return [];
  }
};

// Get total votes in an election
export const getTotalVotes = async (electionId: number): Promise<number> => {
  const contract = getReadOnlyContract();
  try {
    const total = await contract.getTotalVotes(electionId);
    return Number(total);
  } catch (error) {
    console.error(`Error getting total votes for election ${electionId}:`, error);
    return 0;
  }
};

// Cast a vote
export const castVote = async (
  electionId: number,
  candidateIndex: number,
  voterNINHash: string
): Promise<TransactionResult> => {
  if (!window.ethereum) {
    return { success: false, error: "MetaMask is not installed!" };
  }

  try {
    await window.ethereum.request({ method: 'eth_requestAccounts' });
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(CONTRACT_ADDRESS, VotingSystemABI.abi, signer);

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

    const tx = await contract.castVote(electionId, candidateIndex, uniqueVoterHash);
    const receipt = await tx.wait();

    // After successful vote, open the transaction in OKLink explorer
    const explorerUrl = `https://www.oklink.com/amoy/tx/${receipt.hash}`;
    window.open(explorerUrl, '_blank');

    return {
      success: true,
      transactionHash: receipt.hash,
      electionId,
      from: receipt.from,
      to: receipt.to,
      blockNumber: receipt.blockNumber
    };
  } catch (error: any) {
    console.error("Error casting vote:", error);
    return { success: false, error: error.message };
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
  try {
    const contract = getReadOnlyContract();
    const admin = await contract.admin();
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

// Get transactions for our contract
export const getContractTransactions = async (
  startBlock?: number,
  pageSize: number = 10
): Promise<PaginatedTransactions> => {
  try {
    const provider = getProvider();
    const transactions: Transaction[] = [];

    // Get latest block
    const latestBlock = await provider.getBlockNumber();

    // Calculate the starting block - if not provided, start from latest
    const currentStartBlock = startBlock || latestBlock;

    // Look back 1000 blocks at a time for more comprehensive history
    const endBlock = Math.max(0, currentStartBlock - 1000);

    console.log(`Searching blocks from ${currentStartBlock} to ${endBlock}`);

    // For each block in range, check transactions
    for (let i = currentStartBlock; i >= endBlock && transactions.length < pageSize; i--) {
      try {
        const block = await provider.getBlock(i, true);
        if (!block || !block.transactions) continue;

        // Filter transactions involving our contract
        for (const tx of block.transactions) {
          if (!tx || typeof tx === 'string') continue;

          const transaction = tx as ethers.Transaction;

          if (
            transaction.to?.toLowerCase() === CONTRACT_ADDRESS.toLowerCase() ||
            transaction.from?.toLowerCase() === CONTRACT_ADDRESS.toLowerCase()
          ) {
            const receipt = await provider.getTransactionReceipt(transaction.hash);
            if (!receipt) continue;

            // Try to decode the transaction input data
            let method = "Contract Interaction";
            const methodId = transaction.data.slice(0, 10).toLowerCase();

            // Map common method IDs to human-readable names
            const methodMap: { [key: string]: string } = {
              "0x9112c1eb": "createElection",
              "0x0121b93f": "castVote",
              "0xa3ec138d": "changeAdmin"
            };

            method = methodMap[methodId] || method;

            const transactionInfo: Transaction = {
              hash: transaction.hash,
              timestamp: new Date(Number(block.timestamp) * 1000),
              from: transaction.from || "",
              to: transaction.to || "",
              method,
              value: transaction.value.toString(),
              blockNumber: Number(block.number),
              status: receipt.status === 1 ? "Confirmed" : "Failed"
            };

            transactions.push(transactionInfo);

            if (transactions.length >= pageSize) break;
          }
        }
      } catch (blockError) {
        console.error(`Error processing block ${i}:`, blockError);
        continue;
      }
    }

    // Sort transactions by timestamp (newest first)
    transactions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Determine if there are more transactions to load
    const hasMore = endBlock > 0;
    const nextBlock = hasMore ? endBlock - 1 : undefined;

    return {
      transactions,
      hasMore,
      nextBlock
    };
  } catch (error) {
    console.error("Error fetching contract transactions:", error);
    return { transactions: [], hasMore: false };
  }
};