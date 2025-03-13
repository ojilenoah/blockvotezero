// src/utils/blockchain.js

import { ethers } from "ethers";
import VotingSystemABI from "../contracts/VotingSystem.json"; // This will be the ABI from the compiled contract

// Contract address from deployment (update after deploying)
const CONTRACT_ADDRESS = "0x65d11a89f244c445112E4E9883FC9b3562b1F281";

// Alchemy provider URL
const ALCHEMY_URL =
  "https://polygon-amoy.g.alchemy.com/v2/GH7yUV1qmRdvVI-knD8FYKRyzgBlb1ct";

// Initialize ethers provider
const getProvider = () => {
  return new ethers.providers.JsonRpcProvider(ALCHEMY_URL);
};

// Initialize contract instance for read-only operations
const getReadOnlyContract = () => {
  const provider = getProvider();
  return new ethers.Contract(CONTRACT_ADDRESS, VotingSystemABI, provider);
};

// Initialize contract instance with signer for write operations
const getConnectedWalletContract = async () => {
  if (!window.ethereum) {
    throw new Error("MetaMask is not installed!");
  }

  await window.ethereum.request({ method: "eth_requestAccounts" });
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();
  return new ethers.Contract(CONTRACT_ADDRESS, VotingSystemABI, signer);
};

// Admin Operations

// Check if address is admin
export const isAdmin = async (address) => {
  const contract = getReadOnlyContract();
  const admin = await contract.admin();
  return admin.toLowerCase() === address.toLowerCase();
};

// Create an election using connected wallet
export const createElection = async (
  name,
  startTime,
  endTime,
  candidateNames,
  candidateParties,
) => {
  try {
    const contract = await getConnectedWalletContract();
    
    const tx = await contract.createElection(
      name,
      Math.floor(startTime.getTime() / 1000), // Convert to Unix timestamp
      Math.floor(endTime.getTime() / 1000), // Convert to Unix timestamp
      candidateNames,
      candidateParties,
    );

    const receipt = await tx.wait();
    return { success: true, transactionHash: receipt.transactionHash };
  } catch (error) {
    console.error("Error creating election:", error);
    return { success: false, error: error.message };
  }
};

// Change admin using connected wallet
export const changeAdmin = async (newAdminAddress) => {
  try {
    const contract = await getConnectedWalletContract();
    
    const tx = await contract.changeAdmin(newAdminAddress);
    const receipt = await tx.wait();
    return { success: true, transactionHash: receipt.transactionHash };
  } catch (error) {
    console.error("Error changing admin:", error);
    return { success: false, error: error.message };
  }
};

// Voter Operations

// Cast a vote
export const castVote = async (electionId, candidateIndex, voterNINHash) => {
  // For voting, we'll use the browser's injected provider (MetaMask)
  // This allows voters to sign transactions with their own wallets
  if (!window.ethereum) {
    return { success: false, error: "MetaMask is not installed!" };
  }

  try {
    await window.ethereum.request({ method: "eth_requestAccounts" });
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const contract = new ethers.Contract(
      CONTRACT_ADDRESS,
      VotingSystemABI,
      signer,
    );

    const tx = await contract.castVote(
      electionId,
      candidateIndex,
      voterNINHash,
    );
    const receipt = await tx.wait();

    return { success: true, transactionHash: receipt.transactionHash };
  } catch (error) {
    console.error("Error casting vote:", error);
    return { success: false, error: error.message };
  }
};

// Check if voter has already voted
export const hasVoted = async (electionId, voterNINHash) => {
  const contract = getReadOnlyContract();

  try {
    return await contract.hasVoted(electionId, voterNINHash);
  } catch (error) {
    console.error("Error checking if voter has voted:", error);
    return false;
  }
};

// General Operations

// Get active election ID
export const getActiveElectionId = async () => {
  const contract = getReadOnlyContract();

  try {
    const activeElectionId = await contract.getActiveElectionId();
    return activeElectionId.toNumber();
  } catch (error) {
    console.error("Error getting active election ID:", error);
    return 0;
  }
};

// Get election info
export const getElectionInfo = async (electionId) => {
  const contract = getReadOnlyContract();

  try {
    const info = await contract.getElectionInfo(electionId);

    return {
      name: info.name,
      startTime: new Date(info.startTime.toNumber() * 1000),
      endTime: new Date(info.endTime.toNumber() * 1000),
      active: info.active,
      candidateCount: info.candidateCount.toNumber(),
    };
  } catch (error) {
    console.error(`Error getting election info for ID ${electionId}:`, error);
    return null;
  }
};

// Get candidate info
export const getCandidate = async (electionId, candidateIndex) => {
  const contract = getReadOnlyContract();

  try {
    const info = await contract.getCandidate(electionId, candidateIndex);

    return {
      name: info.name,
      party: info.party,
      votes: info.votes.toNumber(),
    };
  } catch (error) {
    console.error(
      `Error getting candidate info for election ${electionId}, candidate ${candidateIndex}:`,
      error,
    );
    return null;
  }
};

// Get all candidates for an election
export const getAllCandidates = async (electionId) => {
  const contract = getReadOnlyContract();

  try {
    const info = await contract.getElectionInfo(electionId);
    const candidateCount = info.candidateCount.toNumber();

    const candidates = [];
    for (let i = 0; i < candidateCount; i++) {
      const candidate = await getCandidate(electionId, i);
      if (candidate) {
        candidates.push({ ...candidate, index: i });
      }
    }

    return candidates;
  } catch (error) {
    console.error(
      `Error getting all candidates for election ${electionId}:`,
      error,
    );
    return [];
  }
};

// Get total votes in an election
export const getTotalVotes = async (electionId) => {
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
export const hashNIN = async (nin) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(nin);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex =
    "0x" + hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return hashHex;
};
