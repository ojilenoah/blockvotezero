import { ethers } from "ethers";
import VotingSystemABI from "../client/src/contracts/VotingSystem.json";
import { ALCHEMY_URL, CONTRACT_ADDRESS } from "../client/src/utils/blockchain";

async function fetchAllTransactions() {
  console.log("Starting transaction fetch...");
  console.log("Contract Address:", CONTRACT_ADDRESS);

  try {
    // Initialize provider
    const provider = new ethers.JsonRpcProvider(ALCHEMY_URL);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, VotingSystemABI.abi, provider);

    // Get network information
    const network = await provider.getNetwork();
    console.log("\nNetwork Information:");
    console.log("Chain ID:", network.chainId);
    console.log("Network Name:", network.name);

    // Get contract code to verify it exists
    const code = await provider.getCode(CONTRACT_ADDRESS);
    console.log("\nContract deployed:", code !== "0x");

    // Get the latest block number
    const latestBlock = await provider.getBlockNumber();
    console.log("Latest block:", latestBlock);

    // Create Alchemy API URL for getAssetTransfers
    const alchemyBaseUrl = ALCHEMY_URL.split('/v2/')[0];
    const alchemyApiKey = ALCHEMY_URL.split('/v2/')[1];

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
            category: ["external", "internal", "erc20", "erc721", "erc1155"],
            withMetadata: true,
            excludeZeroValue: false,
            maxCount: "0x3e8" // Max 1000 results
          }
        ]
      })
    });

    const data = await response.json();
    const transfers = data.result.transfers;

    console.log(`\nFound ${transfers.length} transactions`);

    // Process each transaction
    for (const transfer of transfers) {
      try {
        const txHash = transfer.hash;
        const tx = await provider.getTransaction(txHash);
        const receipt = await provider.getTransactionReceipt(txHash);
        const block = await provider.getBlock(transfer.blockNum);

        if (tx && receipt && block) {
          console.log("\n----------------------------------------");
          console.log("Transaction Details:");
          console.log("Hash:", txHash);
          console.log("Block:", transfer.blockNum);
          console.log("Timestamp:", new Date(Number(block.timestamp) * 1000).toLocaleString());
          console.log("From:", transfer.from);
          console.log("To:", transfer.to);
          console.log("Value:", transfer.value, transfer.asset);
          console.log("Gas Used:", receipt.gasUsed.toString());
          console.log("Status:", receipt.status === 1 ? "Success" : "Failed");

          // Try to decode transaction input data
          try {
            const iface = new ethers.Interface(VotingSystemABI.abi);
            const decodedInput = iface.parseTransaction({ data: tx.data, value: tx.value });

            if (decodedInput) {
              console.log("\nFunction Called:", decodedInput.name);
              console.log("Arguments:");
              Object.entries(decodedInput.args).forEach(([key, value]) => {
                if (isNaN(Number(key))) { // Skip numeric indices
                  console.log(`${key}:`, value.toString());
                }
              });
            }
          } catch (decodeError) {
            console.log("Could not decode transaction input:", decodeError.message);
          }

          // Get and decode events from the transaction
          if (receipt.logs.length > 0) {
            console.log("\nEvents Emitted:");
            for (const log of receipt.logs) {
              try {
                const iface = new ethers.Interface(VotingSystemABI.abi);
                const parsedLog = iface.parseLog({
                  topics: log.topics,
                  data: log.data
                });

                if (parsedLog) {
                  console.log(`- ${parsedLog.name}`);
                  Object.entries(parsedLog.args).forEach(([key, value]) => {
                    if (isNaN(Number(key))) {
                      console.log(`  ${key}: ${value.toString()}`);
                    }
                  });
                }
              } catch (logError) {
                // Skip logs that don't match our contract events
                continue;
              }
            }
          }
        }
      } catch (txError) {
        console.error("Error processing transaction:", txError.message);
        continue;
      }
    }

    console.log("\nTransaction fetch completed.");

  } catch (error) {
    console.error("Error fetching transactions:", error);
  }
}

// Execute the function
fetchAllTransactions().catch(console.error);