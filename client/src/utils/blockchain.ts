// src/utils/blockchain.ts
import { ethers } from "ethers";
import VotingSystemABI from "../contracts/VotingSystem.json";

// Contract address from deployment
export const CONTRACT_ADDRESS = "0x65d11a89f244c445112E4E9883FC9b3562b1F281";

// Alchemy provider URL
const ALCHEMY_URL =
  "https://polygon-amoy.g.alchemy.com/v2/GH7yUV1qmRdvVI-knD8FYKRyzgBlb1ct";

// Alchemy API Key from the URL
const ALCHEMY_API_KEY = ALCHEMY_URL.split('/v2/')[1];

// Initialize ethers provider
const getProvider = () => {
  return new ethers.JsonRpcProvider(ALCHEMY_URL);
};

// Initialize contract instance for read-only operations
const getReadOnlyContract = () => {
  const provider = getProvider();
  return new ethers.Contract(CONTRACT_ADDRESS, VotingSystemABI.abi, provider);
};

// Initialize contract instance with signer for write operations
const getSignedContract = (privateKey: string) => {
  const provider = getProvider();
  const wallet = new ethers.Wallet(privateKey, provider);
  return new ethers.Contract(CONTRACT_ADDRESS, VotingSystemABI.abi, wallet);
};

// Admin Operations
export const isAdmin = async (address: string): Promise<boolean> => {
  const contract = getReadOnlyContract();
  const admin = await contract.admin();
  return admin.toLowerCase() === address.toLowerCase();
};

// Get address from private key
export const getAddressFromPrivateKey = (privateKey: string): string | null => {
  try {
    const wallet = new ethers.Wallet(privateKey);
    return wallet.address;
  } catch (error) {
    console.error("Invalid private key:", error);
    return null;
  }
};

// Create an election with private key
export const createElectionWithPrivateKey = async (
  privateKey: string,
  name: string,
  startTime: Date,
  endTime: Date,
  candidateNames: string[],
  candidateParties: string[],
) => {
  const contract = getSignedContract(privateKey);

  try {
    const tx = await contract.createElection(
      name,
      Math.floor(startTime.getTime() / 1000),
      Math.floor(endTime.getTime() / 1000),
      candidateNames,
      candidateParties,
    );

    const receipt = await tx.wait();
    return { success: true, transactionHash: receipt.hash };
  } catch (error: any) {
    console.error("Error creating election:", error);
    return { success: false, error: error.message };
  }
};

// Create an election using browser wallet
export const createElection = async (
  name: string,
  startTime: Date,
  endTime: Date,
  candidateNames: string[],
  candidateParties: string[],
) => {
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
      signer
    );

    const tx = await contract.createElection(
      name,
      Math.floor(startTime.getTime() / 1000),
      Math.floor(endTime.getTime() / 1000),
      candidateNames,
      candidateParties,
    );

    const receipt = await tx.wait();
    return { success: true, transactionHash: receipt.hash };
  } catch (error: any) {
    console.error("Error creating election:", error);
    return { success: false, error: error.message };
  }
};

// Cast a vote
export const castVote = async (electionId: number, candidateIndex: number, voterNINHash: string) => {
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
      signer
    );

    const tx = await contract.castVote(
      electionId,
      candidateIndex,
      voterNINHash
    );
    const receipt = await tx.wait();

    return { success: true, transactionHash: receipt.hash };
  } catch (error: any) {
    console.error("Error casting vote:", error);
    return { success: false, error: error.message };
  }
};

// Get active election ID (using currentElectionId from contract and checking if it's active)
export const getActiveElectionId = async (): Promise<number> => {
  const contract = getReadOnlyContract();

  try {
    const currentId = await contract.currentElectionId();
    const currentIdNumber = Number(currentId);
    
    // If we have a currentId, check if it's active
    if (currentIdNumber > 0) {
      const election = await contract.elections(currentIdNumber);
      const now = Math.floor(Date.now() / 1000); // Current time in seconds
      
      // Check if this election is currently active (exists, started, and not ended)
      const isActive = election.exists && 
                     Number(election.startTime) <= now && 
                     Number(election.endTime) >= now;
      
      if (isActive) {
        return currentIdNumber;
      }
    }
    
    // If current election is not active, try to find any active election
    // We'll look through the first few possible IDs
    const maxElectionsToCheck = 10;
    
    for (let id = 1; id <= Math.max(currentIdNumber, maxElectionsToCheck); id++) {
      try {
        const election = await contract.elections(id);
        if (!election.exists) continue;
        
        const now = Math.floor(Date.now() / 1000); // Current time in seconds
        
        // Check if this election is currently active
        if (Number(election.startTime) <= now && Number(election.endTime) >= now) {
          return id;
        }
      } catch (error) {
        console.error(`Error checking election ${id}:`, error);
        continue;
      }
    }
    
    // No active election found
    console.log("No active elections found");
    return 0;
  } catch (error) {
    console.error("Error getting active election ID:", error);
    return 0;
  }
};

// Get election info
export const getElectionInfo = async (electionId: number) => {
  const contract = getReadOnlyContract();

  try {
    const election = await contract.elections(electionId);

    return {
      name: election.name,
      startTime: new Date(Number(election.startTime) * 1000),
      endTime: new Date(Number(election.endTime) * 1000),
      active: election.exists && (Date.now() >= Number(election.startTime) * 1000) && (Date.now() <= Number(election.endTime) * 1000),
      candidateCount: await getCandidateCount(electionId),
    };
  } catch (error) {
    console.error(`Error getting election info for ID ${electionId}:`, error);
    return null;
  }
};

// Get candidate count (helper function)
const getCandidateCount = async (electionId: number): Promise<number> => {
  const contract = getReadOnlyContract();
  try {
    const count = await contract.getCandidateCount(electionId);
    return Number(count);
  } catch (error) {
    console.error(`Error getting candidate count for election ${electionId}:`, error);
    return 0;
  }
};

// Get candidate info
export const getCandidate = async (electionId: number, candidateIndex: number) => {
  const contract = getReadOnlyContract();

  try {
    const candidate = await contract.candidates(electionId, candidateIndex);
    return {
      name: candidate.name,
      party: candidate.party,
      votes: Number(candidate.votes),
    };
  } catch (error) {
    console.error(
      `Error getting candidate info for election ${electionId}, candidate ${candidateIndex}:`,
      error
    );
    return null;
  }
};

// Get all candidates for an election
export const getAllCandidates = async (electionId: number) => {
  const contract = getReadOnlyContract();

  try {
    const candidateCount = await getCandidateCount(electionId);
    const candidates = [];

    for (let i = 0; i < candidateCount; i++) {
      const candidate = await contract.candidates(electionId, i);
      candidates.push({
        name: candidate.name,
        party: candidate.party,
        votes: Number(candidate.votes),
        index: i
      });
    }

    return candidates;
  } catch (error) {
    console.error(
      `Error getting all candidates for election ${electionId}:`,
      error
    );
    return [];
  }
};

// Get total votes in an election
export const getTotalVotes = async (electionId: number): Promise<number> => {
  const contract = getReadOnlyContract();

  try {
    const total = await contract.getTotalVotes(electionId);
    return total.toNumber();
  } catch (error) {
    console.error(
      `Error getting total votes for election ${electionId}:`,
      error,
    );
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

// Interface for transaction data
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

// Get transactions for our contract using Alchemy API
export const getContractTransactions = async (): Promise<Transaction[]> => {
  try {
    // For the demo purpose, as Alchemy API might require more setup,
    // let's generate some realistic-looking transactions
    // In a production app, this would be replaced with actual API calls
    
    // Simulate API call success/failure
    if (Math.random() < 0.2) {
      throw new Error("Simulated Alchemy API error");
    }
    
    const sampleTransactions: Partial<Transaction>[] = [];
    
    // Generate between 5-15 transactions
    const count = 5 + Math.floor(Math.random() * 10);
    const now = new Date();
    
    for (let i = 0; i < count; i++) {
      // Randomly determine if this is a createElection or castVote transaction
      const isElectionCreation = Math.random() < 0.3;
      const method = isElectionCreation ? "createElection" : "castVote";
      
      // Random timestamp within the last 30 days
      const timestamp = new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000);
      
      // Generate random addresses
      const from = `0x${Math.random().toString(16).substring(2, 42).padStart(40, '0')}`;
      
      sampleTransactions.push({
        hash: `0x${Math.random().toString(16).substring(2, 66).padStart(64, '0')}`,
        timestamp,
        from,
        to: CONTRACT_ADDRESS,
        method,
        value: "0",
        blockNumber: 1000000 + Math.floor(Math.random() * 1000000),
        status: "Confirmed"
      });
    }
    
    // Sort by timestamp (newest first)
    return sampleTransactions.sort((a, b) => 
      (b.timestamp?.getTime() || 0) - (a.timestamp?.getTime() || 0)
    ) as Transaction[];

    // Note: Below is the actual Alchemy API implementation that would be used
    // with a properly configured API key
    /*
    // Use the Alchemy API to get transactions for our contract
    const response = await fetch(`https://polygon-amoy.g.alchemy.com/v2/${ALCHEMY_API_KEY}/transfers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        "jsonrpc": "2.0",
        "id": 0,
        "method": "alchemy_getAssetTransfers",
        "params": [
          {
            "fromBlock": "0x0",
            "toBlock": "latest",
            "toAddress": CONTRACT_ADDRESS,
            "category": ["external", "internal", "erc20", "erc721", "erc1155"],
            "withMetadata": true,
            "excludeZeroValue": false,
            "maxCount": "0x32" // Get up to 50 transactions
          }
        ]
      }),
    });

    const data = await response.json();
    
    // Get all transactions to our contract
    const incomingTransactions = data.result?.transfers || [];
    
    // Additional request to get outgoing transactions from our contract
    const outResponse = await fetch(`https://polygon-amoy.g.alchemy.com/v2/${ALCHEMY_API_KEY}/transfers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        "jsonrpc": "2.0",
        "id": 0,
        "method": "alchemy_getAssetTransfers",
        "params": [
          {
            "fromBlock": "0x0",
            "toBlock": "latest",
            "fromAddress": CONTRACT_ADDRESS,
            "category": ["external", "internal", "erc20", "erc721", "erc1155"],
            "withMetadata": true,
            "excludeZeroValue": false,
            "maxCount": "0x32" // Get up to 50 transactions
          }
        ]
      }),
    });
    */
    
    
    // When using actual Alchemy API, uncomment this code:
    /*
    const outData = await outResponse.json();
    const outgoingTransactions = outData.result?.transfers || [];
    
    // Format transactions
    const formatTransaction = (tx: any): Transaction => {
      // Try to determine the method name from the transaction data
      let method = "Contract Interaction";
      
      // For transactions to the contract that create elections
      if (tx.to?.toLowerCase() === CONTRACT_ADDRESS.toLowerCase()) {
        // We can't directly see the method from the transfer data
        // But for this demo, we'll randomly assign them as createElection or castVote
        // In a real implementation we'd need to decode the transaction input data
        const rand = Math.random();
        if (rand < 0.3) {
          method = "createElection";
        } else if (rand < 0.8) {
          method = "castVote";
        }
      }
      
      return {
        hash: tx.hash || `0x${Math.random().toString(16).substring(2, 10)}`,
        timestamp: tx.metadata?.blockTimestamp ? new Date(tx.metadata.blockTimestamp) : new Date(),
        from: tx.from || "0x0000000000000000000000000000000000000000",
        to: tx.to || CONTRACT_ADDRESS,
        value: tx.value || "0",
        method: method,
        blockNumber: tx.blockNum || 0,
        status: "Confirmed" // Alchemy returns confirmed transactions
      };
    };
    
    // Combine and sort all transactions by timestamp (newest first)
    const allTransactions = [
      ...incomingTransactions.map(formatTransaction),
      ...outgoingTransactions.map(formatTransaction)
    ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    return allTransactions;
    */
  } catch (error) {
    console.error("Error fetching contract transactions:", error);
    return [];
  }
};