import { ethers } from "ethers";
import VotingSystemABI from "../contracts/VotingSystem.json";
import { Candidate } from "../types/candidate";
import { cache } from "../lib/cache";

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
  const cacheKey = 'activeElectionId';
  const cached = cache.get<number>(cacheKey);
  if (cached !== null) return cached;

  const contract = getReadOnlyContract();
  try {
    const currentId = await contract.currentElectionId();
    const result = Number(currentId);
    cache.set(cacheKey, result, 30000); // Cache for 30 seconds
    return result;
  } catch (error) {
    console.error("Error getting active election ID:", error);
    return 0;
  }
};

// Get election info with caching
export const getElectionInfo = async (electionId: number): Promise<ElectionInfo | null> => {
  const cacheKey = `electionInfo_${electionId}`;
  const cached = cache.get<ElectionInfo | null>(cacheKey);
  if (cached !== null) return cached;

  const contract = getReadOnlyContract();
  try {
    const info = await contract.getElectionInfo(electionId);

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

// Get all candidates for an election with caching
export const getAllCandidates = async (electionId: number): Promise<Candidate[]> => {
  const cacheKey = `candidates_${electionId}`;
  const cached = cache.get<Candidate[]>(cacheKey);
  if (cached !== null) return cached;

  const contract = getReadOnlyContract();
  try {
    const result = await contract.getAllCandidates(electionId);

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
  const cacheKey = `totalVotes_${electionId}`;
  const cached = cache.get<number>(cacheKey);
  if (cached !== null) return cached;

  const contract = getReadOnlyContract();
  try {
    const total = await contract.getTotalVotes(electionId);
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

// Get transactions for our contract with caching and optimization
export const getContractTransactions = async (
  startBlock?: number,
  pageSize: number = 10
): Promise<PaginatedTransactions> => {
  const cacheKey = `transactions_${startBlock || 'latest'}_${pageSize}`;
  const cached = cache.get<PaginatedTransactions>(cacheKey);
  if (cached !== null) return cached;

  try {
    console.log("Starting getContractTransactions with startBlock:", startBlock);
    const provider = getProvider();
    // Use type assertion to specify the contract ABI is a valid interface
    const contract = new ethers.Contract(
      CONTRACT_ADDRESS, 
      VotingSystemABI.abi as ethers.InterfaceAbi, 
      provider
    );
    
    // Get latest block
    const latestBlock = await provider.getBlockNumber();
    console.log("Latest block from provider:", latestBlock);
    
    // Use a more conservative block range to avoid data availability issues
    const blockWindow = 5000; // Reduced from 1000 to be more conservative
    const fromBlock = startBlock !== undefined 
      ? startBlock 
      : Math.max(0, latestBlock - blockWindow);
    
    // For current block range, don't go backwards too far
    const endBlock = startBlock !== undefined 
      ? Math.max(0, startBlock - blockWindow)
      : Math.max(0, latestBlock - blockWindow);
    
    console.log(`Scanning from block ${endBlock} to ${fromBlock}`);
    
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

    const result = {
      transactions,
      hasMore,
      nextBlock
    };
    
    // Cache the result for 2 minutes
    cache.set(cacheKey, result, 120000);
    return result;
  } catch (error) {
    console.error("Error fetching contract transactions:", error);
    const errorResult = { transactions: [], hasMore: false };
    cache.set(cacheKey, errorResult, 30000); // Cache error for 30 seconds
    return errorResult;
  }
};