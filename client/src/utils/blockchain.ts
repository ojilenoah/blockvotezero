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

// Get transactions for our contract - Direct block scanning implementation
export const getContractTransactions = async (
  startBlock?: number,
  pageSize: number = 10
): Promise<PaginatedTransactions> => {
  try {
    console.log("Starting getContractTransactions with startBlock:", startBlock);
    const provider = getProvider();
    const contract = new ethers.Contract(CONTRACT_ADDRESS, VotingSystemABI, provider);
    
    // Get latest block
    const latestBlock = await provider.getBlockNumber();
    console.log("Latest block from provider:", latestBlock);
    
    // If no starting block provided, use the latest block minus a window to scan
    const blockWindow = 1000; // Scan 1000 blocks at most
    const fromBlock = startBlock !== undefined 
      ? startBlock 
      : Math.max(0, latestBlock - blockWindow);
    
    // Calculate end block - ensuring we don't go beyond the latest block
    const endBlock = Math.max(0, fromBlock - blockWindow); // Go backward in blocks
    
    console.log(`Scanning from block ${fromBlock} down to ${endBlock}`);
    
    // Prepare to collect transactions
    const transactions: Transaction[] = [];
    
    // Method signature to method name mapping
    const methodMap: { [key: string]: string } = {
      "0x9112c1eb": "createElection",
      "0x0121b93f": "castVote",
      "0xa3ec138d": "changeAdmin",
      "0x8da5cb5b": "owner",
      "0x8456cb59": "pause",
      "0x3f4ba83a": "unpause",
      "0x5c975abb": "paused"
    };
    
    // Fetch events from the contract (much more reliable than scanning all blocks)
    console.log("Querying contract events...");
    
    // Get CreateElection events
    try {
      const createFilter = contract.filters.ElectionCreated();
      const createEvents = await contract.queryFilter(createFilter, endBlock, fromBlock);
      console.log(`Found ${createEvents.length} ElectionCreated events`);
      
      // Process each event
      for (const event of createEvents) {
        if (transactions.length >= pageSize) break;
        
        const tx = await provider.getTransaction(event.transactionHash);
        const receipt = await provider.getTransactionReceipt(event.transactionHash);
        const block = await provider.getBlock(event.blockNumber);
        
        if (tx && receipt && block) {
          const blockTimestamp = block.timestamp ? Number(block.timestamp) * 1000 : Date.now();
          
          transactions.push({
            hash: event.transactionHash,
            timestamp: new Date(blockTimestamp),
            from: tx.from || "",
            to: CONTRACT_ADDRESS,
            method: "createElection",
            value: tx.value.toString(),
            blockNumber: event.blockNumber,
            status: receipt.status === 1 ? "Confirmed" : "Failed"
          });
        }
      }
    } catch (error) {
      console.error("Error getting ElectionCreated events:", error);
    }
    
    // Get Vote events if we still have space
    if (transactions.length < pageSize) {
      try {
        const voteFilter = contract.filters.VoteCast();
        const voteEvents = await contract.queryFilter(voteFilter, endBlock, fromBlock);
        console.log(`Found ${voteEvents.length} VoteCast events`);
        
        // Process each event
        for (const event of voteEvents) {
          if (transactions.length >= pageSize) break;
          
          const tx = await provider.getTransaction(event.transactionHash);
          const receipt = await provider.getTransactionReceipt(event.transactionHash);
          const block = await provider.getBlock(event.blockNumber);
          
          if (tx && receipt && block) {
            const blockTimestamp = block.timestamp ? Number(block.timestamp) * 1000 : Date.now();
            
            transactions.push({
              hash: event.transactionHash,
              timestamp: new Date(blockTimestamp),
              from: tx.from || "",
              to: CONTRACT_ADDRESS,
              method: "castVote",
              value: "0",
              blockNumber: event.blockNumber,
              status: receipt.status === 1 ? "Confirmed" : "Failed"
            });
          }
        }
      } catch (error) {
        console.error("Error getting VoteCast events:", error);
      }
    }
    
    // Sort transactions by block number (newest first)
    transactions.sort((a, b) => b.blockNumber - a.blockNumber);
    
    // Determine if there are more transactions to load
    const oldestTx = transactions.length > 0 ? transactions[transactions.length - 1] : null;
    const hasMore = transactions.length > 0 && endBlock > 0;
    const nextBlock = hasMore && oldestTx ? oldestTx.blockNumber - 1 : undefined;

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