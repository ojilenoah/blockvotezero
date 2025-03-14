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
    console.log("Getting active election ID...");
    const currentId = await contract.currentElectionId();
    console.log("Current election ID:", currentId.toString());

    if (currentId > 0) {
      // Check current election first
      try {
        const info = await contract.electionInfo(currentId);
        console.log("Raw election info:", info);

        if (info && info.exists) {
          const now = Math.floor(Date.now() / 1000);
          const startTime = Number(info.startTime);
          const endTime = Number(info.endTime);

          console.log("Checking election times:", {
            now,
            startTime,
            endTime,
            active: now >= startTime && now <= endTime
          });

          if (now >= startTime && now <= endTime) {
            console.log(`Found active election: ${currentId}`);
            return Number(currentId);
          }
        }
      } catch (error) {
        console.error("Error checking current election:", error);
      }

      // If current election is not active, check recent ones
      for (let id = Number(currentId); id > Math.max(1, Number(currentId) - 5); id--) {
        try {
          const info = await contract.electionInfo(id);
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
    }

    console.log("No active election found");
    return 0;
  } catch (error) {
    console.error("Error getting active election ID:", error);
    return 0;
  }
};

// Get election info
export const getElectionInfo = async (electionId: number): Promise<ElectionInfo | null> => {
  const contract = getReadOnlyContract();

  try {
    console.log(`Getting election info for ID ${electionId}`);
    // Use electionInfo mapping instead of getElectionInfo function
    const info = await contract.electionInfo(electionId);
    console.log("Raw election info response:", info);

    if (!info || !info.exists) {
      console.log(`No election found for ID ${electionId}`);
      return null;
    }

    const now = Math.floor(Date.now() / 1000);
    const startTime = Number(info.startTime);
    const endTime = Number(info.endTime);
    const active = now >= startTime && now <= endTime;
    const upcoming = now < startTime;
    const candidateCount = Number(info.candidateCount);

    console.log("Processed election data:", {
      name: info.name,
      startTime,
      endTime,
      now,
      active,
      upcoming,
      candidateCount
    });

    return {
      name: info.name,
      startTime: new Date(startTime * 1000),
      endTime: new Date(endTime * 1000),
      active,
      upcoming,
      candidateCount
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
    console.log(`Getting candidates for election ${electionId}`);
    const result = await contract.getAllCandidates(electionId);
    console.log("Candidates response:", result);

    return result.names.map((name: string, i: number) => ({
      name,
      party: result.parties[i],
      votes: Number(result.votesCounts[i]),
      index: i,
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
    console.log(`Getting total votes for election ${electionId}`);
    const total = await contract.getTotalVotes(electionId);
    return Number(total);
  } catch (error) {
    console.error(`Error getting total votes for election ${electionId}:`, error);
    return 0;
  }
};

// Helper function to generate SHA-256 hash of NIN
export const hashNIN = async (nin: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(nin);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex =
    "0x" + hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return hashHex;
};

// Interface for the Election
export interface Election {
  exists: boolean;
  name: string;
  startTime: string;
  endTime: string;
}

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
          if (typeof tx === 'string') continue;

          if (
            tx.to?.toLowerCase() === CONTRACT_ADDRESS.toLowerCase() ||
            tx.from?.toLowerCase() === CONTRACT_ADDRESS.toLowerCase()
          ) {
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
              value: tx.value.toString(),
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

    // Add stored transactions
    const lastTxs = [
      localStorage.getItem("lastElectionCreationTx"),
      localStorage.getItem("lastVoteCastTx"),
    ];

    for (const txJson of lastTxs) {
      if (!txJson) continue;
      try {
        const txData = JSON.parse(txJson) as Transaction;
        if (!transactions.some((t) => t.hash === txData.hash)) {
          transactions.push(txData);
        }
      } catch (e) {
        console.error("Error parsing stored transaction:", e);
      }
    }

    // Sort transactions by timestamp (newest first)
    return transactions.sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
    );
  } catch (error) {
    console.error("Error fetching contract transactions:", error);
    return [];
  }
};


interface TransactionResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
  electionId?: number;
  from?: string;
  to?: string;
  blockNumber?: number;
}

interface Transaction {
  hash: string;
  timestamp: Date;
  from: string;
  to: string;
  value: string;
  method: string;
  blockNumber: number;
  status: string;
}

// Create an election
export const createElection = async (
  name: string,
  startTime: Date,
  endTime: Date,
  candidateNames: string[],
  candidateParties: string[],
): Promise<TransactionResult> => {
  console.log("Starting election creation process...");

  if (!window.ethereum) {
    console.error("MetaMask not found");
    return { success: false, error: "MetaMask is not installed!" };
  }

  try {
    console.log("Requesting MetaMask account access...");
    await window.ethereum.request({ method: "eth_requestAccounts" });
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const signerAddress = await signer.getAddress();
    console.log("Connected with address:", signerAddress);

    // Check admin status
    console.log("Checking admin status for:", signerAddress);
    const isAdminUser = await isAdmin(signerAddress);
    console.log("Is admin?", isAdminUser);

    if (!isAdminUser) {
      console.error("Address is not admin:", signerAddress);
      return {
        success: false,
        error: "Only the admin can create elections. Please connect with the admin wallet.",
      };
    }

    const contract = new ethers.Contract(
      CONTRACT_ADDRESS,
      VotingSystemABI.abi,
      signer,
    );

    // Input validation
    if (!name || name.trim() === "") {
      return { success: false, error: "Election name is required" };
    }

    if (candidateNames.length === 0 || candidateParties.length === 0) {
      return { success: false, error: "At least one candidate is required" };
    }

    if (candidateNames.length !== candidateParties.length) {
      return { success: false, error: "Candidate names and parties count mismatch" };
    }

    // Convert dates to Unix timestamps
    const startTimeUnix = Math.floor(startTime.getTime() / 1000);
    const endTimeUnix = Math.floor(endTime.getTime() / 1000);
    const now = Math.floor(Date.now() / 1000);

    console.log("Timestamps:", {
      now,
      startTimeUnix,
      endTimeUnix,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
    });

    if (startTimeUnix <= now) {
      return { success: false, error: "Start time must be in the future" };
    }

    if (endTimeUnix <= startTimeUnix) {
      return { success: false, error: "End time must be after start time" };
    }

    console.log("Creating election with params:", {
      name,
      startTimeUnix,
      endTimeUnix,
      candidateNames,
      candidateParties,
    });

    const tx = await contract.createElection(
      name,
      startTimeUnix,
      endTimeUnix,
      candidateNames,
      candidateParties,
    );

    console.log("Transaction sent:", tx.hash);
    console.log("Waiting for transaction confirmation...");

    const receipt = await tx.wait();
    console.log("Transaction receipt:", receipt);

    if (!receipt) {
      throw new Error("Transaction failed - no receipt received");
    }

    const block = await provider.getBlock(receipt.blockNumber);
    if (!block) {
      throw new Error("Failed to get block details");
    }

    console.log("Block details:", block);

    const txData: Transaction = {
      hash: receipt.hash,
      timestamp: new Date(block.timestamp * 1000),
      from: receipt.from || "",
      to: receipt.to || "",
      method: "createElection",
      value: "0",
      blockNumber: receipt.blockNumber,
      status: receipt.status === 1 ? "Confirmed" : "Failed",
    };

    localStorage.setItem("lastElectionCreationTx", JSON.stringify(txData));

    // Get the election ID
    const electionId = await contract.currentElectionId();
    const electionIdNumber = Number(electionId);
    console.log("New election created with ID:", electionIdNumber);

    // Store candidate information
    const candidateObjects = candidateNames.map((name, index) => ({
      name,
      party: candidateParties[index],
      votes: 0,
      index,
    }));

    localStorage.setItem(
      `election_${electionIdNumber}_candidates`,
      JSON.stringify(candidateObjects),
    );

    // Immediately fetch and cache the election info
    const electionInfo = await getElectionInfo(electionIdNumber);
    if (electionInfo) {
      localStorage.setItem(
        `election_${electionIdNumber}_info`,
        JSON.stringify(electionInfo),
      );
    }

    return {
      success: true,
      transactionHash: receipt.hash,
      electionId: electionIdNumber,
      from: receipt.from || "",
      to: receipt.to || "",
      blockNumber: receipt.blockNumber,
    };
  } catch (error: any) {
    console.error("Error creating election:", error);

    if (error.code === "ACTION_REJECTED") {
      return { success: false, error: "Transaction was rejected in MetaMask" };
    }

    if (error.message.includes("execution reverted")) {
      return {
        success: false,
        error: "Contract execution failed - make sure you have admin rights and check the parameters",
      };
    }

    return {
      success: false,
      error: `Error creating election: ${error.message || "Unknown error"}`,
    };
  }
};

// Cast a vote
export const castVote = async (
  electionId: number,
  candidateIndex: number,
  voterNINHash: string,
): Promise<TransactionResult> => {
  if (!window.ethereum) {
    return { success: false, error: "MetaMask is not installed!" };
  }

  try {
    await window.ethereum.request({ method: "eth_requestAccounts" });
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(
      CONTRACT_ADDRESS,
      VotingSystemABI.abi,
      signer,
    );

    const tx = await contract.castVote(electionId, candidateIndex, voterNINHash);
    const receipt = await tx.wait();
    if (!receipt) {
      throw new Error("Transaction failed");
    }

    const block = await provider.getBlock(receipt.blockNumber);
    if (!block) {
      throw new Error("Failed to get block details");
    }

    const txData: Transaction = {
      hash: receipt.hash,
      timestamp: new Date(block.timestamp * 1000),
      from: receipt.from || "",
      to: receipt.to || "",
      method: "castVote",
      value: "0",
      blockNumber: receipt.blockNumber,
      status: receipt.status === 1 ? "Confirmed" : "Failed",
    };

    localStorage.setItem("lastVoteCastTx", JSON.stringify(txData));

    // Update cached vote count
    try {
      const candidates = await getAllCandidates(electionId);
      localStorage.setItem(
        `election_${electionId}_candidates`,
        JSON.stringify(candidates),
      );
    } catch (e) {
      console.error("Error updating cached candidates after vote:", e);
    }

    return { success: true, transactionHash: receipt.hash };
  } catch (error: any) {
    console.error("Error casting vote:", error);
    return { success: false, error: error.message };
  }
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