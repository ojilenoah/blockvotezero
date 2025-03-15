// Testing Supabase table structure and column names
import { createClient } from '@supabase/supabase-js';

// Initialize the Supabase client with the new credentials
const supabaseUrl = 'https://yddootrvtrojcwellery.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkZG9vdHJ2dHJvamN3ZWxsZXJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIwNDI1ODgsImV4cCI6MjA1NzYxODU4OH0.5GdmK2Sz-R1vnrraGfgAPPKA9d307cq6mxqG4VByeXI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testUsersTableStructure() {
  console.log('Testing users table structure...');
  
  // Create a test user with fields that match our expected structure
  const testWalletAddress = '0xTest' + Math.floor(Math.random() * 10000);
  
  // Test different variations of column names to find the right ones
  const testUserOptions = [
    // Option 1: Our expected structure
    {
      wallet_address: testWalletAddress,
      nin: '12345678901',
      verification_status: 'N'
    },
    // Option 2: Alternative column names
    {
      address: testWalletAddress,
      nin_number: '12345678901',
      status: 'N'
    },
    // Option 3: Simple structure
    {
      wallet: testWalletAddress,
      nin: '12345678901'
    }
  ];
  
  let successfulStructure = null;
  
  for (const testUser of testUserOptions) {
    console.log('Trying structure:', testUser);
    
    const { data, error } = await supabase
      .from('users')
      .insert([testUser])
      .select();
      
    if (error) {
      console.log('Insert failed with error:', error.message);
    } else {
      console.log('Successfully inserted with structure:', testUser);
      console.log('Return data:', data);
      successfulStructure = testUser;
      
      // Clean up
      if (testUser.wallet_address) {
        await supabase.from('users').delete().eq('wallet_address', testUser.wallet_address);
      } else if (testUser.address) {
        await supabase.from('users').delete().eq('address', testUser.address);
      } else if (testUser.wallet) {
        await supabase.from('users').delete().eq('wallet', testUser.wallet);
      }
      
      break;
    }
  }
  
  if (successfulStructure) {
    console.log('Users table structure determined:', successfulStructure);
  } else {
    console.log('Could not determine users table structure');
  }
}

async function testAdminConfigTableStructure() {
  console.log('\nTesting admin_config table structure...');
  
  // Try to read admin_config table
  const { data, error } = await supabase
    .from('admin_config')
    .select('*');
    
  if (error) {
    console.log('Error reading admin_config:', error);
  } else {
    console.log('Admin config data:', data);
    
    if (data && data.length > 0) {
      console.log('Admin config columns:', Object.keys(data[0]));
    } else {
      // Try inserting with different structures
      const configOptions = [
        { nin_submission_locked: true },
        { submission_locked: true },
        { locked: true }
      ];
      
      let successfulConfig = null;
      
      for (const config of configOptions) {
        console.log('Trying admin config structure:', config);
        
        const { data: insertData, error: insertError } = await supabase
          .from('admin_config')
          .insert([config])
          .select();
          
        if (insertError) {
          console.log('Insert failed with error:', insertError.message);
        } else {
          console.log('Successfully inserted with structure:', config);
          console.log('Return data:', insertData);
          successfulConfig = config;
          
          // Clean up (delete the row we just inserted)
          if (insertData && insertData.length > 0 && insertData[0].id) {
            await supabase.from('admin_config').delete().eq('id', insertData[0].id);
          }
          
          break;
        }
      }
      
      if (successfulConfig) {
        console.log('Admin config structure determined:', successfulConfig);
      } else {
        console.log('Could not determine admin_config table structure');
      }
    }
  }
}

// Main test function
async function testDatabaseStructure() {
  try {
    await testUsersTableStructure();
    await testAdminConfigTableStructure();
    return 'Database structure testing completed';
  } catch (error) {
    console.error('Error testing database structure:', error);
    return 'Database structure testing failed';
  }
}

// Run the test
testDatabaseStructure()
  .then(result => console.log(result))
  .catch(error => console.error('Test execution error:', error));