// Diagnostic tool to test Alchemy API configuration
import { ethers } from 'ethers';

const ALCHEMY_URL = 'https://polygon-amoy.g.alchemy.com/v2/xLeFDCZG65tLX5wTyfYyU';
const CONTRACT_ADDRESS = '0xc0895D39fBBD1918067d5Fa41beDAF51d36665B5';

async function testAlchemyConfig() {
  console.log('🔍 Testing Alchemy API Configuration...\n');

  try {
    // Test 1: Basic connectivity
    console.log('1. Testing basic connectivity...');
    const provider = new ethers.JsonRpcProvider(ALCHEMY_URL);
    const blockNumber = await provider.getBlockNumber();
    console.log(`✅ Connected! Latest block: ${blockNumber}\n`);

    // Test 2: Chain ID verification
    console.log('2. Verifying network...');
    const network = await provider.getNetwork();
    console.log(`✅ Network: ${network.name} (Chain ID: ${network.chainId})\n`);

    // Test 3: Contract code check
    console.log('3. Checking contract exists...');
    try {
      const code = await provider.getCode(CONTRACT_ADDRESS);
      if (code === '0x') {
        console.log('❌ Contract not found at this address');
      } else {
        console.log(`✅ Contract found! Code length: ${code.length} characters\n`);
      }
    } catch (error) {
      console.log(`❌ Contract check failed: ${error.message}\n`);
    }

    // Test 4: Simple contract call
    console.log('4. Testing contract interaction...');
    try {
      // Try a simple call to check if Enhanced APIs are working
      const result = await provider.call({
        to: CONTRACT_ADDRESS,
        data: '0x98ecf2a0' // currentElectionId() function selector
      });
      console.log('✅ Contract call successful!');
      console.log(`Current Election ID: ${parseInt(result, 16)}\n`);
    } catch (error) {
      console.log(`❌ Contract call failed: ${error.message}`);
      if (error.message.includes('Unable to complete request')) {
        console.log('💡 This suggests Enhanced APIs need to be enabled in your Alchemy project\n');
      }
    }

    // Test 5: API limits check
    console.log('5. Checking API response times...');
    const start = Date.now();
    await provider.getBlockNumber();
    const responseTime = Date.now() - start;
    console.log(`✅ API response time: ${responseTime}ms\n`);

  } catch (error) {
    console.error('❌ Failed to connect to Alchemy:', error.message);
  }
}

// Run the test
testAlchemyConfig();