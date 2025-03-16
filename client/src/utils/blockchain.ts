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

// Get transactions for our contract using Alchemy API
export const getContractTransactions = async (
  startBlock?: number,
  pageSize: number = 10
): Promise<PaginatedTransactions> => {
  try {
    console.log("Starting getContractTransactions with startBlock:", startBlock);
    const provider = getProvider();
    
    // Get latest block
    const latestBlock = await provider.getBlockNumber();
    console.log("Latest block from provider:", latestBlock);
    
    // If no starting block provided, use the latest block
    const fromBlock = startBlock || Math.max(0, latestBlock - 5000); // Look back 5000 blocks by default
    
    // Define a window of blocks to query (for pagination)
    const toBlock = Math.min(latestBlock, fromBlock + 2000);
    
    console.log(`Querying Alchemy API for transactions from block ${fromBlock} to ${toBlock}`);
    
    // Use Alchemy's API directly to get transactions for address
    const alchemyUrl = `${ALCHEMY_URL}&method=alchemy_getAssetTransfers&params=[{"fromBlock":"0x${fromBlock.toString(16)}","toBlock":"0x${toBlock.toString(16)}","toAddress":"${CONTRACT_ADDRESS}","category":["external","internal","erc20","erc721","erc1155","specialnft"]}]`;
    
    const response = await fetch(alchemyUrl);
    const data = await response.json();
    console.log("Alchemy API response received");
    
    // Process the transactions from Alchemy API
    const transactions: Transaction[] = [];
    
    if (data && data.result && data.result.transfers) {
      console.log(`Found ${data.result.transfers.length} transfers from Alchemy`);
      
      // Process each transfer
      for (const transfer of data.result.transfers) {
        try {
          if (!transfer.hash) {
            console.warn("Transfer missing hash, skipping");
            continue;
          }
          
          // Get full transaction details
          const tx = await provider.getTransaction(transfer.hash);
          if (!tx) continue;
          
          // Get receipt for status
          const receipt = await provider.getTransactionReceipt(transfer.hash);
          if (!receipt) continue;
          
          // Try to decode the transaction input data
          let method = "Contract Interaction";
          const methodId = tx.data && tx.data.length >= 10 
            ? tx.data.slice(0, 10).toLowerCase() 
            : "";
          
          // Map common method IDs to human-readable names
          const methodMap: { [key: string]: string } = {
            "0x9112c1eb": "createElection",
            "0x0121b93f": "castVote",
            "0xa3ec138d": "changeAdmin",
            "0x8da5cb5b": "owner",
            "0x8456cb59": "pause",
            "0x3f4ba83a": "unpause",
            "0x5c975abb": "paused"
          };
          
          if (methodId && methodMap[methodId]) {
            method = methodMap[methodId];
          }
          
          // Get block for timestamp
          const block = await provider.getBlock(receipt.blockNumber);
          const blockTimestamp = block && block.timestamp ? Number(block.timestamp) * 1000 : Date.now();
          
          console.log(`Processing transaction: ${transfer.hash} in block ${receipt.blockNumber}`);
          
          const transactionInfo: Transaction = {
            hash: transfer.hash,
            timestamp: new Date(blockTimestamp),
            from: transfer.from || "",
            to: transfer.to || "",
            method,
            value: transfer.value || "0",
            blockNumber: receipt.blockNumber,
            status: receipt.status === 1 ? "Confirmed" : "Failed"
          };
          
          transactions.push(transactionInfo);
          
          // Limit to page size
          if (transactions.length >= pageSize) {
            console.log(`Reached page size limit of ${pageSize} transactions`);
            break;
          }
        } catch (txError) {
          console.error(`Error processing transaction ${transfer.hash}:`, txError);
          continue;
        }
      }
    } else {
      console.log("No transfers found in Alchemy API response or invalid response format");
    }
    
    // Sort transactions by block number (newest first)
    transactions.sort((a, b) => b.blockNumber - a.blockNumber);
    
    // Determine if there are more transactions to load
    // We use the block number of the oldest transaction as the next starting point
    const oldestTx = transactions.length > 0 ? transactions[transactions.length - 1] : null;
    const hasMore = transactions.length >= pageSize;
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