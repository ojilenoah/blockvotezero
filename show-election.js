const { ethers } = require('ethers');
const { getActiveElectionId, getElectionInfo, getAllCandidates } = require('./utils/blockchain.js');

async function showActiveElection() {
  try {
    console.log('Fetching active election information...\n');
    
    // Get active election ID
    const activeElectionId = await getActiveElectionId();
    if (!activeElectionId) {
      console.log('No active election found.');
      return;
    }
    
    // Get election info
    const electionInfo = await getElectionInfo(activeElectionId);
    if (!electionInfo) {
      console.log('Could not fetch election information.');
      return;
    }
    
    // Print election details
    console.log('=== Active Election ===');
    console.log(`Election ID: ${activeElectionId}`);
    console.log(`Name: ${electionInfo.name}`);
    console.log(`Start Time: ${electionInfo.startTime.toLocaleString()}`);
    console.log(`End Time: ${electionInfo.endTime.toLocaleString()}`);
    console.log(`Status: ${electionInfo.active ? 'Active' : 'Inactive'}\n`);
    
    // Get and print candidate information
    const candidates = await getAllCandidates(activeElectionId);
    console.log('=== Candidates ===');
    candidates.forEach((candidate, index) => {
      console.log(`\nCandidate #${index + 1}:`);
      console.log(`Name: ${candidate.name}`);
      console.log(`Party: ${candidate.party}`);
      console.log(`Current Votes: ${candidate.votes}`);
    });
    
  } catch (error) {
    console.error('Error fetching election information:', error);
  }
}

// Run the function
showActiveElection();
