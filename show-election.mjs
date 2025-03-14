import { ethers } from 'ethers';
import VotingSystemABI from './client/src/contracts/VotingSystem.json' assert { type: "json" };

// Contract configuration from utils/blockchain.js
const CONTRACT_ADDRESS = '0xc0895D39fBBD1918067d5Fa41beDAF51d36665B5';
const ALCHEMY_URL = 'https://polygon-amoy.g.alchemy.com/v2/E822ZzOp7UFQy6Zt82uF4hzcdklL-qoe';

async function showActiveElection() {
  try {
    console.log('Fetching election information...\n');

    // Initialize provider and contract
    const provider = new ethers.JsonRpcProvider(ALCHEMY_URL);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, VotingSystemABI.abi, provider);

    // Try to find an existing election by iterating through IDs
    let foundElection = false;
    for (let id = 1; id <= 10; id++) { // Check first 10 possible elections
      try {
        console.log(`Checking election ID ${id}...`);
        const info = await contract.getElectionInfo(id);

        if (!info || !info.name) continue;

        // Convert the election information
        const electionInfo = {
          name: info.name,
          startTime: new Date(Number(info.startTime) * 1000),
          endTime: new Date(Number(info.endTime) * 1000),
          active: info.active,
          candidateCount: Number(info.candidateCount)
        };

        // Check if election is currently active based on time
        const now = new Date();
        const isTimeValid = now >= electionInfo.startTime && now <= electionInfo.endTime;

        // Print election details
        console.log('\n=== Election Information ===');
        console.log(`Election ID: ${id}`);
        console.log(`Name: ${electionInfo.name}`);
        console.log(`Start Time: ${electionInfo.startTime.toLocaleString()}`);
        console.log(`End Time: ${electionInfo.endTime.toLocaleString()}`);
        console.log(`Status: ${isTimeValid ? 'Currently Active' : 'Not Active (Outside Time Window)'}`);
        console.log(`Contract Status: ${electionInfo.active ? 'Active' : 'Inactive'}\n`);

        // Get candidate information
        const result = await contract.getAllCandidates(id);
        const candidates = result.names.map((name, i) => ({
          name,
          party: result.parties[i],
          votes: Number(result.votesCounts[i]),
          index: i
        }));

        if (candidates.length > 0) {
          console.log('=== Candidates ===');
          candidates.forEach((candidate, index) => {
            console.log(`\nCandidate #${index + 1}:`);
            console.log(`Name: ${candidate.name}`);
            console.log(`Party: ${candidate.party}`);
            console.log(`Current Votes: ${candidate.votes}`);
          });
        } else {
          console.log('No candidates found for this election.');
        }

        foundElection = true;
        break;
      } catch (error) {
        if (!error.message.includes("Election does not exist")) {
          console.error(`Error checking election ${id}:`, error);
        }
        continue;
      }
    }

    if (!foundElection) {
      console.log('\nNo existing elections found in the system.');
      console.log('Please create an election using the admin interface first.');
    }

  } catch (error) {
    console.error('Error:', error);
    if (error.reason) {
      console.log('\nBlockchain Error:', error.reason);
    }
  }
}

// Run the function
showActiveElection();