// src/utils/blockchain.ts
import { ethers } from "ethers";
import VotingSystemABI from "../contracts/VotingSystem.json";

// Contract address from deployment
export const CONTRACT_ADDRESS = "0x65d11a89f244c445112E4E9883FC9b3562b1F281";

// Alchemy provider URL
const ALCHEMY_URL =
  "https://polygon-amoy.g.alchemy.com/v2/GH7yUV1qmRdvVI-knD8FYKRyzgBlb1ct";

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

// Create an election
export const createElection = async (
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

// Get active election ID (using currentElectionId from contract)
export const getActiveElectionId = async (): Promise<number> => {
  const contract = getReadOnlyContract();

  try {
    const currentId = await contract.currentElectionId();
    return Number(currentId);
  } catch (error) {
    console.error("Error getting current election ID:", error);
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