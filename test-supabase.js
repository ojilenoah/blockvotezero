// Testing Supabase connection and database access
import { createClient } from '@supabase/supabase-js';

// Initialize the Supabase client with the new credentials
const supabaseUrl = 'https://yddootrvtrojcwellery.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkZG9vdHJ2dHJvamN3ZWxsZXJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIwNDI1ODgsImV4cCI6MjA1NzYxODU4OH0.5GdmK2Sz-R1vnrraGfgAPPKA9d307cq6mxqG4VByeXI';

const supabase = createClient(supabaseUrl, supabaseKey);

// Test function to validate Supabase connection and access
async function testSupabaseConnection() {
  console.log('Testing Supabase connection with URL:', supabaseUrl);

  try {
    // Check which tables exist
    console.log('Checking available tables in the database...');
    
    // Try to access various potential tables
    const tableNames = ['voters', 'users', 'nin_data', 'admin_config', 'voter_records'];
    
    for (const tableName of tableNames) {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);
        
      if (error) {
        if (error.code === 'PGRST116') {
          console.log(`Table '${tableName}' does not exist`);
        } else {
          console.error(`Error accessing '${tableName}' table:`, error);
        }
      } else {
        console.log(`Table '${tableName}' exists`);
        console.log(`Sample data from '${tableName}':`, data);
        
        // If we found a table, explore its columns
        console.log(`Examining columns in '${tableName}' table...`);
        
        // Perform a raw SQL query to get column names (if allowed)
        const { data: columnData, error: columnError } = await supabase.rpc(
          'table_columns_info', 
          { table_name: tableName }
        );
        
        if (columnError) {
          console.log(`Cannot get column info for '${tableName}' using RPC:`, columnError);
          
          // Instead, try to infer columns from the sample data
          if (data && data.length > 0) {
            console.log(`Columns in '${tableName}' (inferred from data):`, Object.keys(data[0]));
          }
        } else {
          console.log(`Columns in '${tableName}':`, columnData);
        }
      }
    }
    
    // Try to create a test table to verify write permissions
    console.log('\nTesting table creation permissions...');
    const { error: createError } = await supabase
      .from('test_table')
      .insert([{ test_column: 'test_value' }]);
      
    if (createError) {
      console.log('Table creation test result:', createError);
    } else {
      console.log('Successfully created test data in test_table');
      // Clean up test table
      await supabase.from('test_table').delete().eq('test_column', 'test_value');
    }

    return 'Supabase connection test and table exploration completed';
  } catch (error) {
    console.error('Unexpected error during Supabase testing:', error);
    return 'Supabase connection test failed with exception';
  }
}

// Run the test
testSupabaseConnection()
  .then(result => console.log(result))
  .catch(error => console.error('Error in test execution:', error));