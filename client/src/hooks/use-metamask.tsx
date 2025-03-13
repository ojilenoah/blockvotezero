import { useState, useEffect, useCallback } from 'react';
import detectEthereumProvider from '@metamask/detect-provider';
import * as ethers from 'ethers';
import { useToast } from './use-toast';

export type MetaMaskState = {
  isMetaMaskInstalled: boolean;
  isConnecting: boolean;
  isConnected: boolean;
  account: string | null;
  chainId: string | null;
  provider: any | null;
  signer: ethers.Signer | null;
  error: string | null;
};

// Use a function to create the hook instead of a hook directly
// This prevents the Fast Refresh error
export const useMetaMask = function() {
  const { toast } = useToast();
  const [state, setState] = useState<MetaMaskState>({
    isMetaMaskInstalled: false,
    isConnecting: false,
    isConnected: false,
    account: null,
    chainId: null,
    provider: null,
    signer: null,
    error: null,
  });

  // Detect if MetaMask is installed without auto-connecting
  useEffect(() => {
    const checkProvider = async () => {
      try {
        const provider = await detectEthereumProvider({ silent: true });
        
        setState(prevState => ({
          ...prevState,
          isMetaMaskInstalled: !!provider
        }));
      } catch (error) {
        console.error('Error detecting provider:', error);
      }
    };

    checkProvider();
  }, []);

  // Handle account changes
  const handleAccountsChanged = useCallback((accounts: string[]) => {
    if (accounts.length === 0) {
      // MetaMask is locked or the user has not connected any accounts
      setState(prevState => ({
        ...prevState,
        isConnected: false,
        account: null,
        error: 'Please connect to MetaMask.'
      }));
    } else {
      setState(prevState => ({
        ...prevState,
        isConnected: true,
        account: accounts[0],
        error: null
      }));
    }
  }, []);

  // Handle chain changes
  const handleChainChanged = useCallback((chainId: string) => {
    setState(prevState => ({
      ...prevState,
      chainId
    }));
    
    // Reload the page when the chain changes
    window.location.reload();
  }, []);

  // Subscribe to ethereum events without auto-connecting or checking accounts
  useEffect(() => {
    if (window.ethereum) {
      // Just add listeners, don't check accounts
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
      
      // Cleanup
      return () => {
        if (window.ethereum.removeListener) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
          window.ethereum.removeListener('chainChanged', handleChainChanged);
        }
      };
    }
  }, [handleAccountsChanged, handleChainChanged]);

  // Connect to MetaMask
  const connect = useCallback(async () => {
    if (!window.ethereum) {
      toast({
        title: "MetaMask not found",
        description: "Please install MetaMask browser extension to continue",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setState(prevState => ({
        ...prevState,
        isConnecting: true,
        error: null
      }));
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const signer = await provider.getSigner();
      const account = accounts[0];
      const network = await provider.getNetwork();
      
      setState(prevState => ({
        ...prevState,
        isConnecting: false,
        isConnected: true,
        account,
        chainId: network.chainId.toString(),
        provider,
        signer,
        error: null
      }));
      
      toast({
        title: "Connected",
        description: `Connected to account ${account.substring(0, 6)}...${account.substring(38)}`,
      });
      
      return { account, signer };
    } catch (error: any) {
      console.error('Error connecting to MetaMask:', error);
      
      setState(prevState => ({
        ...prevState,
        isConnecting: false,
        error: error.message || 'Failed to connect to MetaMask'
      }));
      
      toast({
        title: "Connection Failed",
        description: error.message || 'Failed to connect to MetaMask',
        variant: "destructive"
      });
      
      return null;
    }
  }, [toast]);

  // Disconnect from MetaMask
  const disconnect = useCallback(() => {
    setState(prevState => ({
      ...prevState,
      isConnected: false,
      account: null,
      signer: null
    }));
    
    toast({
      title: "Disconnected",
      description: "Disconnected from MetaMask"
    });
  }, [toast]);

  // Sign a message with MetaMask
  const signMessage = useCallback(async (message: string) => {
    if (!state.signer) {
      toast({
        title: "Not connected",
        description: "Please connect to MetaMask first",
        variant: "destructive"
      });
      return null;
    }
    
    try {
      const signature = await state.signer.signMessage(message);
      return signature;
    } catch (error: any) {
      console.error('Error signing message:', error);
      
      toast({
        title: "Signing Failed",
        description: error.message || 'Failed to sign message with MetaMask',
        variant: "destructive"
      });
      
      return null;
    }
  }, [state.signer, toast]);

  return {
    ...state,
    connect,
    disconnect,
    signMessage
  };
}

// Needed for TypeScript support with window.ethereum
declare global {
  interface Window {
    ethereum: any;
  }
}