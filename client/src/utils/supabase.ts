import { createClient } from '@supabase/supabase-js';
import { getActiveElectionId, getElectionInfo } from './blockchain'; 

// Initialize the Supabase client
const supabaseUrl = 'https://yddootrvtrojcwellery.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkZG9vdHJ2dHJvamN3ZWxsZXJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIwNDI1ODgsImV4cCI6MjA1NzYxODU4OH0.5GdmK2Sz-R1vnrraGfgAPPKA9d307cq6mxqG4VByeXI';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Type definitions for Supabase tables based on actual database structure
export interface User {
  created_at: string;
  wallet_address: string;
  nin: string;
  status: 'Y' | 'N'; // 'Y' for verified, 'N' for not verified
}

export interface AdminConfig {
  id: number;
  admin_address: string;
  locked: boolean; // For NIN submission locking
}

// Helper functions for working with Supabase
export const getNINByWalletAddress = async (walletAddress: string) => {
  // Make wallet address lowercase for case-insensitive comparison
  const normalizedWalletAddress = walletAddress.toLowerCase();
  console.log("[supabase] Looking up NIN for wallet address:", normalizedWalletAddress);
  
  // First try direct lookup
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .ilike('wallet_address', normalizedWalletAddress)
    .single();

  if (data) {
    console.log("[supabase] Found NIN by wallet address:", data.nin);
    return data as User;
  }
  
  // If direct lookup fails, fetch all users and compare addresses case-insensitively
  if (error) {
    console.log("[supabase] Direct lookup failed, trying case-insensitive comparison");
    const { data: allUsers, error: allUsersError } = await supabase
      .from('users')
      .select('*');
    
    if (allUsersError) {
      console.error('[supabase] Error fetching all users:', allUsersError);
      return null;
    }
    
    // Find user with matching wallet address (case-insensitive)
    const matchedUser = allUsers.find(
      (user) => user.wallet_address.toLowerCase() === normalizedWalletAddress
    );
    
    if (matchedUser) {
      console.log("[supabase] Found NIN by case-insensitive comparison:", matchedUser.nin);
      return matchedUser as User;
    }
    
    console.error('[supabase] No user found with wallet address:', normalizedWalletAddress);
    return null;
  }

  return data as User;
};

export const checkNINSubmissionLocked = async () => {
  console.log('Checking NIN submission locked status');
  try {
    const { data, error } = await supabase
      .from('admin_config')
      .select('locked')
      .single();

    if (error) {
      console.error('Error checking NIN submission status:', error);
      
      // Check if the error is because no records exist
      if (error.code === 'PGRST116') {
        console.log('No admin_config record exists, creating default record');
        // Create a default admin config record
        await initializeAdminConfig();
        return false; // Default to unlocked
      }
      
      return false; // Default to unlocked if there's another error
    }

    console.log('NIN submission locked status:', data?.locked);
    return data?.locked === true; // Explicitly check for true
  } catch (err) {
    console.error('Unexpected error checking submission lock status:', err);
    return false; // Default to unlocked on unexpected error
  }
};

// Function to initialize admin_config with default values
async function initializeAdminConfig() {
  try {
    // First check if admin_config has any records
    const { count, error: countError } = await supabase
      .from('admin_config')
      .select('*', { count: 'exact', head: true });
    
    // Only insert if there are no records
    if (!countError && count === 0) {
      const { error } = await supabase
        .from('admin_config')
        .insert([
          {
            admin_address: "0x2B3d7c0A2A05f760272165A836D1aDFE8ea38490", // Default admin address
            locked: false // Default to unlocked
          }
        ]);
      
      if (error) {
        console.error('Error initializing admin_config:', error);
      } else {
        console.log('Successfully initialized admin_config');
      }
    } else {
      console.log('Admin config already has records, skipping initialization');
    }
  } catch (err) {
    console.error('Unexpected error initializing admin_config:', err);
  }
}

export const submitNIN = async (walletAddress: string, nin: string) => {
  try {
    // First check if registrations are locked
    const isLocked = await checkNINSubmissionLocked();
    if (isLocked) {
      return { 
        success: false, 
        error: 'NIN registration is currently locked. This usually happens during active elections.' 
      };
    }

    // Check if this wallet address already has a registered NIN
    const existingUser = await getNINByWalletAddress(walletAddress);
    
    if (existingUser) {
      return { success: false, error: 'This wallet address already has a registered NIN.' };
    }
    
    // Check if NIN is already registered by another wallet
    const { data: existingNIN } = await supabase
      .from('users')
      .select('wallet_address')
      .eq('nin', nin)
      .single();
      
    if (existingNIN) {
      return { success: false, error: 'This NIN is already registered with another wallet address.' };
    }

    // If all checks pass, insert the new record
    const { data, error } = await supabase
      .from('users')
      .insert([
        { 
          wallet_address: walletAddress, 
          nin: nin,
          status: 'N' // Default to Not Verified
        }
      ]);

    if (error) {
      console.error('Error submitting NIN:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err: any) {
    console.error('Error in submitNIN:', err);
    return { success: false, error: err.message || 'An unexpected error occurred' };
  }
};

// Admin functions
export const getAllNINs = async () => {
  try {
    console.log('Fetching all NIN records from database');
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching all NINs:', error);
      return [];
    }

    if (!data || data.length === 0) {
      console.log('No NIN records found in database');
      return [];
    }

    console.log(`Successfully fetched ${data.length} NIN records`);
    return data as User[];
  } catch (err) {
    console.error('Unexpected error fetching NIN records:', err);
    return [];
  }
};

export const updateNINVerificationStatus = async (walletAddress: string, status: 'Y' | 'N') => {
  // Normalize wallet address
  const normalizedWalletAddress = walletAddress.toLowerCase();
  console.log('[supabase] Updating NIN verification status for wallet:', normalizedWalletAddress, 'to status:', status);
  
  // Try updating with case-insensitive comparison
  const { data, error } = await supabase
    .from('users')
    .update({ status: status })
    .ilike('wallet_address', normalizedWalletAddress);

  if (error) {
    console.error('Error updating NIN verification status:', error);
    
    // If direct update fails, try to find the user record first
    console.log('[supabase] Direct update failed, trying to find user first');
    const user = await getNINByWalletAddress(walletAddress);
    
    if (user) {
      console.log('[supabase] Found user with NIN:', user.nin, 'attempting update with exact address');
      const { data: updateData, error: updateError } = await supabase
        .from('users')
        .update({ status: status })
        .eq('wallet_address', user.wallet_address); // Use exact address from database
      
      if (updateError) {
        console.error('Error updating with exact address:', updateError);
        return { success: false, error: updateError.message };
      }
      
      return { success: true, data: updateData };
    }
    
    return { success: false, error: error.message };
  }

  console.log('[supabase] Successfully updated NIN verification status');
  return { success: true, data };
};

export const toggleNINSubmissionLock = async (locked: boolean, adminAddress: string) => {
  try {
    console.log(`Toggling NIN submission lock to: ${locked}`);
    
    // First check if the config exists
    const { data: existingConfig, error: fetchError } = await supabase
      .from('admin_config')
      .select('*')
      .order('id', { ascending: false })
      .limit(1)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching admin config:', fetchError);
      return { success: false, error: fetchError.message };
    }

    let result;
    
    if (existingConfig) {
      console.log('Updating existing admin config with ID:', existingConfig.id);
      // Update existing config
      result = await supabase
        .from('admin_config')
        .update({ locked: locked })
        .eq('id', existingConfig.id);
    } else {
      console.log('Creating new admin config record');
      // Insert new config with required admin_address
      result = await supabase
        .from('admin_config')
        .insert([{ 
          locked: locked,
          admin_address: adminAddress
        }]);
    }

    if (result.error) {
      console.error('Error toggling NIN submission lock:', result.error);
      return { success: false, error: result.error.message };
    }

    console.log('Successfully toggled NIN submission lock');
    return { success: true };
  } catch (err: any) {
    console.error('Unexpected error toggling NIN submission lock:', err);
    return { success: false, error: err.message || 'An unexpected error occurred' };
  }
};

// Check if a wallet address is an admin
export const isAdminWallet = async (walletAddress: string) => {
  // Get admin wallet addresses from blockchain.ts or a config source
  // This is just a placeholder - you'd implement your admin check logic here
  // For now, we'll use the same admin list as in admin/login.tsx
  const ADMIN_ADDRESSES = [
    "0x2B3d7c0A2A05f760272165A836D1aDFE8ea38490", // Authorized admin address
  ];
  
  return ADMIN_ADDRESSES.map(addr => addr.toLowerCase()).includes(walletAddress.toLowerCase());
};

// Check if there's an active election
export const checkForActiveElection = async (): Promise<boolean> => {
  try {
    console.log("[supabase] Checking for active elections");
    // Get current election ID
    const nextId = await getActiveElectionId();
    
    if (!nextId) {
      return false;
    }

    // Look backwards from current ID to find active elections
    for (let id = nextId - 1; id >= 1; id--) {
      try {
        const electionInfo = await getElectionInfo(id);
        
        if (electionInfo?.name) {
          const now = new Date();
          const startTime = new Date(electionInfo.startTime);
          const endTime = new Date(electionInfo.endTime);
          const isActive = now >= startTime && now <= endTime;
          
          // If election is active, return true
          if (isActive && electionInfo.active) {
            console.log(`[supabase] Found active election: ${electionInfo.name}`);
            return true;
          }
        }
      } catch (error) {
        continue; // Continue checking other election IDs
      }
    }
    
    console.log("[supabase] No active elections found");
    return false;
  } catch (error) {
    console.error("[supabase] Error checking for active elections:", error);
    return false;
  }
};

// Automatically lock submissions when there's an active election
export const resetAllVoterStatus = async (): Promise<void> => {
  try {
    console.log("[supabase] Resetting all voter status to 'N' for new election");
    
    const { error } = await supabase
      .from('users')
      .update({ status: 'N' })
      .neq('status', 'N'); // Only update records that aren't already 'N'
    
    if (error) {
      console.error("[supabase] Error resetting voter status:", error);
    } else {
      console.log("[supabase] Successfully reset all voter status to 'N'");
    }
  } catch (error) {
    console.error("[supabase] Error in resetAllVoterStatus:", error);
  }
};

export const autoLockRegistrationsForActiveElection = async (): Promise<void> => {
  try {
    // Check if there's an active election
    const hasActiveElection = await checkForActiveElection();
    
    if (hasActiveElection) {
      console.log("[supabase] Active election detected, locking NIN submissions");
      
      // Check current lock status
      const isCurrentlyLocked = await checkNINSubmissionLocked();
      
      // Only lock if not already locked
      if (!isCurrentlyLocked) {
        // Get first admin address from the list
        const adminAddress = "0x2B3d7c0A2A05f760272165A836D1aDFE8ea38490";
        
        // Set locked to true
        const result = await toggleNINSubmissionLock(true, adminAddress);
        
        if (result.success) {
          console.log("[supabase] Successfully locked NIN submissions for active election");
        } else {
          console.error("[supabase] Failed to lock NIN submissions:", result.error);
        }
      } else {
        console.log("[supabase] NIN submissions already locked");
      }
    }
  } catch (error) {
    console.error("[supabase] Error in autoLockRegistrationsForActiveElection:", error);
  }
};