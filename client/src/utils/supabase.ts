import { createClient } from '@supabase/supabase-js';

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
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('wallet_address', walletAddress)
    .single();

  if (error) {
    console.error('Error fetching NIN by wallet address:', error);
    return null;
  }

  return data as User;
};

export const checkNINSubmissionLocked = async () => {
  const { data, error } = await supabase
    .from('admin_config')
    .select('locked')
    .single();

  if (error) {
    console.error('Error checking NIN submission status:', error);
    return false; // Default to unlocked if there's an error
  }

  return data?.locked || false;
};

export const submitNIN = async (walletAddress: string, nin: string) => {
  // First check if this wallet address already has a registered NIN
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

  // Check if submissions are locked
  const isLocked = await checkNINSubmissionLocked();
  if (isLocked) {
    return { success: false, error: 'NIN submissions are currently locked by the administrator.' };
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
};

// Admin functions
export const getAllNINs = async () => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching all NINs:', error);
    return [];
  }

  return data as User[];
};

export const updateNINVerificationStatus = async (walletAddress: string, status: 'Y' | 'N') => {
  const { data, error } = await supabase
    .from('users')
    .update({ status: status })
    .eq('wallet_address', walletAddress);

  if (error) {
    console.error('Error updating NIN verification status:', error);
    return { success: false, error: error.message };
  }

  return { success: true, data };
};

export const toggleNINSubmissionLock = async (locked: boolean, adminAddress: string) => {
  // First check if the config exists
  const { data: existingConfig } = await supabase
    .from('admin_config')
    .select('id')
    .single();

  let result;
  
  if (existingConfig) {
    // Update existing config
    result = await supabase
      .from('admin_config')
      .update({ locked: locked })
      .eq('id', existingConfig.id);
  } else {
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

  return { success: true };
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