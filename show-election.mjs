import { ethers } from 'ethers';
import { getActiveElectionId, getElectionInfo, getAllCandidates } from './client/src/utils/blockchain.ts';

async function showActiveElection() {
  try {
    console.log('Fetching active election information...\n');

    // Get active election ID
    const activeElectionId = await getActiveElectionId();
    if (!activeElectionId) {
      console.log('No active election found at this time.');
      console.log('Please create an election using the admin interface first.');
      return;
    }

    console.log(`Found election with ID: ${activeElectionId}`);

    // Get election info
    const electionInfo = await getElectionInfo(activeElectionId);
    if (!electionInfo) {
      console.log('Could not fetch election information.');
      console.log('The election might have been deactivated or removed.');
      return;
    }

    // Check if election is currently active based on time
    const now = new Date();
    const startTime = new Date(electionInfo.startTime);
    const endTime = new Date(electionInfo.endTime);
    const isTimeValid = now >= startTime && now <= endTime;

    // Print election details
    console.log('\n=== Active Election ===');
    console.log(`Election ID: ${activeElectionId}`);
    console.log(`Name: ${electionInfo.name}`);
    console.log(`Start Time: ${startTime.toLocaleString()}`);
    console.log(`End Time: ${endTime.toLocaleString()}`);
    console.log(`Status: ${isTimeValid ? 'Currently Active' : 'Not Active (Outside Time Window)'}`);
    console.log(`Contract Status: ${electionInfo.active ? 'Active' : 'Inactive'}\n`);

    // Get and print candidate information
    const candidates = await getAllCandidates(activeElectionId);
    if (candidates.length === 0) {
      console.log('No candidates found for this election.');
      return;
    }

    console.log('=== Candidates ===');
    candidates.forEach((candidate, index) => {
      console.log(`\nCandidate #${index + 1}:`);
      console.log(`Name: ${candidate.name}`);
      console.log(`Party: ${candidate.party}`);
      console.log(`Current Votes: ${candidate.votes}`);
    });

  } catch (error) {
    console.error('Error fetching election information:', error);
    if (error.reason) {
      console.log('\nBlockchain Error:', error.reason);
    }
  }
}

// Run the function
showActiveElection();