// src/utils/blockchain.ts
import { ethers } from "ethers";
import VotingSystemABI from "../contracts/VotingSystem.json";
import { Candidate } from "../types/candidate";

// Contract address - using the proxy address
export const CONTRACT_ADDRESS = "0xc0895D39fBBD1918067d5Fa41beDAF51d36665B5";

// Alchemy provider URL
export const ALCHEMY_URL = "https://polygon-amoy.g.alchemy.com/v2/E822ZzOp7UFQy6Zt82uF4hzcdklL-qoe";

// Types for blockchain interactions
interface ElectionInfo {
  name: string;
  startTime: Date;
  endTime: Date;
  active: boolean;
  upcoming: boolean;
  candidateCount: number;
}

// Initialize ethers provider
const getProvider = (): ethers.JsonRpcProvider => {
  return new ethers.JsonRpcProvider(ALCHEMY_URL);
};

// Initialize contract instance for read-only operations
const getReadOnlyContract = (): ethers.Contract => {
  const provider = getProvider();
  return new ethers.Contract(CONTRACT_ADDRESS, VotingSystemABI.abi, provider);
};

// Get active election ID
export const getActiveElectionId = async (): Promise<number> => {
  const contract = getReadOnlyContract();

  try {
    const currentId = await contract.currentElectionId();
    console.log("Current election ID:", currentId.toString());

    // Check from newest to oldest
    for (let id = Number(currentId); id > 0; id--) {
      try {
        const info = await contract.getElectionInfo(id);
        if (!info || !info.exists) continue;

        const now = Math.floor(Date.now() / 1000);
        const startTime = Number(info.startTime);
        const endTime = Number(info.endTime);

        if (now >= startTime && now <= endTime) {
          console.log(`Found active election: ${id}`);
          return id;
        }
      } catch (error) {
        console.error(`Error checking election ${id}:`, error);
      }
    }

    return 0;
  } catch (error) {
    console.error("Error getting active election ID:", error);
    return 0;
  }
};

// Get all elections
export const getAllElections = async (): Promise<number[]> => {
  const contract = getReadOnlyContract();
  const elections: number[] = [];

  try {
    const currentId = await contract.currentElectionId();
    console.log("Getting all elections up to ID:", currentId.toString());

    for (let id = 1; id <= Number(currentId); id++) {
      try {
        const info = await contract.getElectionInfo(id);
        if (info && info.exists) {
          elections.push(id);
        }
      } catch (error) {
        console.error(`Error checking election ${id}:`, error);
      }
    }

    console.log("Found elections:", elections);
    return elections;
  } catch (error) {
    console.error("Error getting all elections:", error);
    return [];
  }
};

// Get election info
export const getElectionInfo = async (electionId: number): Promise<ElectionInfo | null> => {
  if (electionId <= 0) return null;

  const contract = getReadOnlyContract();

  try {
    console.log(`Getting election info for ID ${electionId}`);
    const info = await contract.getElectionInfo(electionId);
    console.log("Raw election info:", info);

    if (!info || !info.exists) return null;

    const now = Math.floor(Date.now() / 1000);
    const startTime = Number(info.startTime);
    const endTime = Number(info.endTime);

    return {
      name: info.name,
      startTime: new Date(startTime * 1000),
      endTime: new Date(endTime * 1000),
      active: now >= startTime && now <= endTime,
      upcoming: now < startTime,
      candidateCount: Number(info.candidateCount)
    };
  } catch (error) {
    console.error(`Error getting election info for ID ${electionId}:`, error);
    return null;
  }
};

// Get total votes in an election
export const getTotalVotes = async (electionId: number): Promise<number> => {
  const contract = getReadOnlyContract();

  try {
    console.log(`Getting total votes for election ${electionId}`);
    const total = await contract.getTotalVotes(electionId);
    return Number(total);
  } catch (error) {
    console.error(`Error getting total votes for election ${electionId}:`, error);
    return 0;
  }
};

// Get all candidates for an election
export const getAllCandidates = async (electionId: number): Promise<Candidate[]> => {
  if (electionId <= 0) return [];

  const contract = getReadOnlyContract();

  try {
    console.log(`Getting candidates for election ${electionId}`);
    const result = await contract.getAllCandidates(electionId);
    console.log("Raw candidates response:", result);

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

// Get completed elections
export const getCompletedElections = async (): Promise<number[]> => {
  const contract = getReadOnlyContract();
  const completed: number[] = [];

  try {
    const currentId = await contract.currentElectionId();
    const now = Math.floor(Date.now() / 1000);

    for (let id = 1; id <= Number(currentId); id++) {
      try {
        const info = await contract.getElectionInfo(id);
        if (info && info.exists && now > Number(info.endTime)) {
          completed.push(id);
        }
      } catch (error) {
        console.error(`Error checking completed election ${id}:`, error);
      }
    }

    return completed;
  } catch (error) {
    console.error("Error getting completed elections:", error);
    return [];
  }
};

// Helper function to generate SHA-256 hash of NIN
export const hashNIN = async (nin: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(nin);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = "0x" + hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return hashHex;
};

// Admin Operations
export const isAdmin = async (address: string): Promise<boolean> => {
  try {
    console.log("Checking admin status for address:", address);
    const contract = getReadOnlyContract();
    const admin = await contract.admin();
    console.log("Contract admin address:", admin);
    const isMatch = admin.toLowerCase() === address.toLowerCase();
    console.log("Is admin match?", isMatch);
    return isMatch;
  } catch (error) {
    console.error("Error checking admin status:", error);
    return false;
  }
};

// Get transactions for our contract
export const getContractTransactions = async (): Promise<Transaction[]> => {
  try {
    const provider = getProvider();
    const transactions: Transaction[] = [];

    // Check recent transactions
    const latestBlock = await provider.getBlockNumber();
    console.log("Latest block:", latestBlock);

    const searchRange = 1000; // Look back this many blocks
    const startBlock = Math.max(0, latestBlock - searchRange);

    console.log(`Searching blocks from ${startBlock} to ${latestBlock}`);

    // For each recent block, check transactions
    for (let i = latestBlock; i >= startBlock && transactions.length < 20; i -= 100) {
      try {
        const block = await provider.getBlock(i, true);
        if (!block || !block.transactions) continue;

        // Filter transactions involving our contract
        console.log(`Checking block ${i} transactions...`);
        for (const tx of block.transactions) {
          if (tx.to?.toLowerCase() === CONTRACT_ADDRESS.toLowerCase() ||
              tx.from?.toLowerCase() === CONTRACT_ADDRESS.toLowerCase()) {
            console.log(`Found contract transaction in block ${i}:`, tx.hash);

            const receipt = await provider.getTransactionReceipt(tx.hash);
            if (!receipt || !block) continue;

            // Try to decode the transaction input data
            let method = "Contract Interaction";
            if (tx.data) {
              const methodId = tx.data.slice(0, 10).toLowerCase();
              // These are the first 4 bytes of the keccak256 hash of the function signatures
              if (methodId === "0x9112c1eb") {
                method = "createElection";
              } else if (methodId === "0x0121b93f") {
                method = "castVote";
              }
            }

            const transaction: Transaction = {
              hash: tx.hash,
              timestamp: new Date(block.timestamp * 1000),
              from: tx.from,
              to: tx.to || "",
              method,
              blockNumber: tx.blockNumber || 0,
              status: receipt.status === 1 ? "Confirmed" : "Failed",
            };

            if (!transactions.some(t => t.hash === transaction.hash)) {
              transactions.push(transaction);
            }
          }
        }
      } catch (blockError) {
        console.error(`Error processing block ${i}:`, blockError);
        continue;
      }
    }

    return transactions;
  } catch (error) {
    console.error("Error fetching contract transactions:", error);
    return [];
  }
};

export interface Transaction {
  hash: string;
  timestamp: Date;
  from: string;
  to: string;
  method: string;
  blockNumber: number;
  status: string;
}

export interface Election {
  exists: boolean;
  name: string;
  startTime: string;
  endTime: string;
}