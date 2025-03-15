// Final test for Supabase structure determination
import { createClient } from '@supabase/supabase-js';

// Initialize the Supabase client with the new credentials
const supabaseUrl = 'https://yddootrvtrojcwellery.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkZG9vdHJ2dHJvamN3ZWxsZXJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIwNDI1ODgsImV4cCI6MjA1NzYxODU4OH0.5GdmK2Sz-R1vnrraGfgAPPKA9d307cq6mxqG4VByeXI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDirectQuery() {
  console.log('Testing direct query approach for table structure...');
  
  try {
    // 1. Test selecting columns of users table
    console.log('\nTrying to select various possible columns from users table:');
    
    const potentialUserColumns = [
      'wallet_address', 'address', 'wallet', 'nin', 'nin_number', 
      'verification', 'verification_status', 'verified', 'status',
      'created_at', 'id', 'user_id'
    ];
    
    let validUserColumns = [];
    
    for (const column of potentialUserColumns) {
      try {
        const { data, error } = await supabase
          .from('users')
          .select(column)
          .limit(1);
          
        if (!error) {
          console.log(`Column '${column}' exists in users table`);
          validUserColumns.push(column);
        } else {
          console.log(`Column '${column}' does not exist in users table:`, error.message);
        }
      } catch (e) {
        console.log(`Error testing column '${column}':`, e.message);
      }
    }
    
    console.log('Valid columns in users table:', validUserColumns);
    
    // 2. Test selecting columns of admin_config table
    console.log('\nTrying to select various possible columns from admin_config table:');
    
    const potentialAdminColumns = [
      'id', 'admin_id', 'admin_address', 'address', 'wallet_address',
      'nin_submission_locked', 'submission_locked', 'locked',
      'created_at', 'updated_at'
    ];
    
    let validAdminColumns = [];
    
    for (const column of potentialAdminColumns) {
      try {
        const { data, error } = await supabase
          .from('admin_config')
          .select(column)
          .limit(1);
          
        if (!error) {
          console.log(`Column '${column}' exists in admin_config table`);
          validAdminColumns.push(column);
        } else {
          console.log(`Column '${column}' does not exist in admin_config table:`, error.message);
        }
      } catch (e) {
        console.log(`Error testing column '${column}':`, e.message);
      }
    }
    
    console.log('Valid columns in admin_config table:', validAdminColumns);
    
    // 3. Try inserting data with required fields
    if (validAdminColumns.includes('admin_address')) {
      console.log('\nTrying to insert data into admin_config with admin_address:');
      
      const insertOptions = [
        { admin_address: '0xTestAdmin', nin_submission_locked: true },
        { admin_address: '0xTestAdmin', submission_locked: true },
        { admin_address: '0xTestAdmin', locked: true }
      ];
      
      let successfulInsert = null;
      
      for (const option of insertOptions) {
        const { data, error } = await supabase
          .from('admin_config')
          .insert([option])
          .select();
          
        if (error) {
          console.log('Insert option failed:', option, error.message);
        } else {
          console.log('Insert succeeded with:', option);
          console.log('Data returned:', data);
          successfulInsert = option;
          
          // Clean up
          if (data && data.length > 0 && data[0].id) {
            await supabase.from('admin_config').delete().eq('id', data[0].id);
          }
          
          break;
        }
      }
      
      if (successfulInsert) {
        console.log('Successful admin_config structure:', successfulInsert);
      }
    }
    
    // 4. Try inserting data into users table
    console.log('\nTrying to insert data into users table with discovered columns:');
    
    const userInsertOptions = [];
    
    if (validUserColumns.includes('wallet_address')) {
      userInsertOptions.push({ wallet_address: '0xTestUser1234' });
    }
    
    if (validUserColumns.includes('address')) {
      userInsertOptions.push({ address: '0xTestUser1234' });
    }
    
    if (validUserColumns.includes('wallet')) {
      userInsertOptions.push({ wallet: '0xTestUser1234' });
    }
    
    if (validUserColumns.includes('nin')) {
      for (const option of [...userInsertOptions]) {
        userInsertOptions.push({ ...option, nin: '12345678901' });
      }
    }
    
    if (validUserColumns.includes('verification_status')) {
      for (const option of [...userInsertOptions]) {
        userInsertOptions.push({ ...option, verification_status: 'N' });
      }
    }
    
    let successfulUserInsert = null;
    
    for (const option of userInsertOptions) {
      const { data, error } = await supabase
        .from('users')
        .insert([option])
        .select();
        
      if (error) {
        console.log('Users insert option failed:', option, error.message);
      } else {
        console.log('Users insert succeeded with:', option);
        console.log('Data returned:', data);
        successfulUserInsert = option;
        
        // Clean up
        if (data && data.length > 0) {
          const keyField = Object.keys(option)[0];
          if (keyField) {
            await supabase.from('users').delete().eq(keyField, option[keyField]);
          }
        }
        
        break;
      }
    }
    
    if (successfulUserInsert) {
      console.log('Successful users table structure:', successfulUserInsert);
    }
    
    return 'Direct query test completed';
  } catch (error) {
    console.error('Error in direct query test:', error);
    return 'Direct query test failed';
  }
}

// Run the test
testDirectQuery()
  .then(result => console.log(result))
  .catch(error => console.error('Error executing test:', error));