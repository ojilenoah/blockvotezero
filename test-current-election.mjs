import { ethers } from 'ethers';
import VotingSystemABI from './client/src/contracts/VotingSystem.json' assert { type: "json" };

// Contract configuration
const CONTRACT_ADDRESS = '0xc0895D39fBBD1918067d5Fa41beDAF51d36665B5';
const ALCHEMY_URL = 'https://polygon-amoy.g.alchemy.com/v2/E822ZzOp7UFQy6Zt82uF4hzcdklL-qoe';

async function testCurrentElection() {
  try {
    console.log('Testing current election retrieval...\n');

    // Initialize provider and contract
    const provider = new ethers.JsonRpcProvider(ALCHEMY_URL);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, VotingSystemABI.abi, provider);

    // Get current election ID
    const currentId = await contract.currentElectionId();
    console.log('Current Election ID from contract:', currentId.toString());

    // Try to get info for this election
    try {
      const info = await contract.getElectionInfo(currentId);
      console.log('\nElection Info for current ID:');
      console.log('Name:', info.name);
      console.log('Start Time:', new Date(Number(info.startTime) * 1000).toLocaleString());
      console.log('End Time:', new Date(Number(info.endTime) * 1000).toLocaleString());
      console.log('Active Status:', info.active);
      console.log('Candidate Count:', Number(info.candidateCount));
    } catch (error) {
      console.log('\nError getting current election info:', error.message);
    }

    // Let's also check the latest few election IDs to make sure we're not missing anything
    console.log('\nChecking last few election IDs...');
    const checkLastN = 5;
    const startId = Number(currentId);
    
    for (let id = Math.max(1, startId - checkLastN); id <= startId; id++) {
      try {
        const info = await contract.getElectionInfo(id);
        console.log(`\nElection #${id}:`);
        console.log('Name:', info.name);
        console.log('Start Time:', new Date(Number(info.startTime) * 1000).toLocaleString());
        console.log('End Time:', new Date(Number(info.endTime) * 1000).toLocaleString());
        console.log('Active Status:', info.active);
      } catch (error) {
        console.log(`\nElection #${id}: ${error.message}`);
      }
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the test
testCurrentElection();
