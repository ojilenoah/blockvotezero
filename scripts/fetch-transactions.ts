import { ethers } from "ethers";
import VotingSystemABI from "../client/src/contracts/VotingSystem.json";
import { ALCHEMY_URL, CONTRACT_ADDRESS } from "../client/src/utils/blockchain";

async function fetchAllTransactions() {
  console.log("Starting transaction fetch...\n");
  console.log("Contract Address:", CONTRACT_ADDRESS);

  try {
    // Initialize provider
    const provider = new ethers.JsonRpcProvider(ALCHEMY_URL);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, VotingSystemABI.abi, provider);

    // Create Alchemy API URL
    const alchemyBaseUrl = ALCHEMY_URL.split('/v2/')[0];
    const alchemyApiKey = ALCHEMY_URL.split('/v2/')[1];

    console.log("\nFetching recent contract transactions...");

    // Fetch transactions using Alchemy API
    const response = await fetch(`${alchemyBaseUrl}/v2/${alchemyApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 1,
        jsonrpc: "2.0",
        method: "alchemy_getAssetTransfers",
        params: [
          {
            fromBlock: "0x0",
            toBlock: "latest",
            toAddress: CONTRACT_ADDRESS,
            category: ["external"],
            withMetadata: true,
            excludeZeroValue: false,
            maxCount: "0x14" // Fetch last 20 transactions
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    const transfers = result.result.transfers;

    console.log(`\nFound ${transfers.length} transactions\n`);

    let successCount = 0;
    let failureCount = 0;

    console.log("Transaction Summary:");
    console.log("----------------------------------------");

    // Process each transaction
    for (const transfer of transfers) {
      try {
        const txHash = transfer.hash;
        const tx = await provider.getTransaction(txHash);
        const receipt = await provider.getTransactionReceipt(txHash);

        if (tx && receipt) {
          // Decode function call if possible
          let functionName = "Unknown Function";
          try {
            if (tx.data && tx.data !== "0x") {
              const iface = new ethers.Interface(VotingSystemABI.abi);
              const decodedInput = iface.parseTransaction({ data: tx.data, value: tx.value });
              if (decodedInput) {
                functionName = decodedInput.name;
              }
            }
          } catch (decodeError) {
            // Silently continue if we can't decode the function
          }

          const status = receipt.status === 1 ? "Success" : "Failed";
          if (status === "Success") successCount++;
          else failureCount++;

          console.log(`Hash: ${txHash}`);
          console.log(`Time: ${new Date(transfer.metadata.blockTimestamp).toLocaleString()}`);
          console.log(`From: ${transfer.from}`);
          console.log(`Function: ${functionName}`);
          console.log(`Value: ${transfer.value} ${transfer.asset}`);
          console.log(`Status: ${status}`);
          console.log("----------------------------------------\n");
        }

        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (txError) {
        console.error("Error processing transaction:", txError.message);
        continue;
      }
    }

    console.log("\nTransaction Statistics:");
    console.log("----------------------------------------");
    console.log(`Total Transactions: ${transfers.length}`);
    console.log(`Successful: ${successCount}`);
    console.log(`Failed: ${failureCount}`);
    console.log("----------------------------------------");

    console.log("\nTransaction fetch completed.");

  } catch (error) {
    console.error("Error fetching transactions:", error);
    if (error instanceof Error) {
      console.error("Error details:", error.message);
    }
  }
}

// Execute the function
fetchAllTransactions().catch(console.error);