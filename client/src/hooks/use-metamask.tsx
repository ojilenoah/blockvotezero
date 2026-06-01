import { useState, useEffect, useCallback } from 'react';
import detectEthereumProvider from '@metamask/detect-provider';
import * as ethers from 'ethers';
import { useToast } from './use-toast';
import { IS_DEMO_MODE } from '@/utils/blockchain';

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

// ---------- Demo wallet ----------
// Persisted across reloads so the same "voter" sticks until cleared.
const DEMO_WALLET_KEY = 'demo_wallet';
const DEMO_CONNECTED_KEY = 'demo_wallet_connected';
const DEMO_CHAIN_ID = '0x13882'; // Polygon Amoy hex

function generateDemoAddress(): string {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  return (
    '0x' +
    Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  );
}

function getOrCreateDemoWallet(): string {
  let addr = localStorage.getItem(DEMO_WALLET_KEY);
  if (!addr) {
    addr = generateDemoAddress();
    localStorage.setItem(DEMO_WALLET_KEY, addr);
  }
  return addr;
}

export const useMetaMask = function () {
  const { toast } = useToast();
  const [state, setState] = useState<MetaMaskState>(() => {
    if (IS_DEMO_MODE) {
      const wasConnected =
        localStorage.getItem(DEMO_CONNECTED_KEY) === 'true';
      const account = wasConnected ? getOrCreateDemoWallet() : null;
      return {
        isMetaMaskInstalled: true, // pretend so UI surfaces the connect button
        isConnecting: false,
        isConnected: wasConnected,
        account,
        chainId: DEMO_CHAIN_ID,
        provider: null,
        signer: null,
        error: null,
      };
    }
    return {
      isMetaMaskInstalled: false,
      isConnecting: false,
      isConnected: false,
      account: null,
      chainId: null,
      provider: null,
      signer: null,
      error: null,
    };
  });

  // Real MetaMask detection — skipped in demo mode
  useEffect(() => {
    if (IS_DEMO_MODE) return;
    const checkProvider = async () => {
      try {
        const provider = await detectEthereumProvider({ silent: true });
        setState((prev) => ({
          ...prev,
          isMetaMaskInstalled: !!provider,
        }));
      } catch (error) {
        console.error('Error detecting provider:', error);
      }
    };
    checkProvider();
  }, []);

  const handleAccountsChanged = useCallback((accounts: string[]) => {
    if (accounts.length === 0) {
      setState((prev) => ({
        ...prev,
        isConnected: false,
        account: null,
        error: 'Please connect to MetaMask.',
      }));
    } else {
      setState((prev) => ({
        ...prev,
        isConnected: true,
        account: accounts[0],
        error: null,
      }));
    }
  }, []);

  const handleChainChanged = useCallback((chainId: string) => {
    setState((prev) => ({ ...prev, chainId }));
    window.location.reload();
  }, []);

  // Subscribe to ethereum events — skipped in demo mode
  useEffect(() => {
    if (IS_DEMO_MODE) return;
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
      return () => {
        if (window.ethereum.removeListener) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
          window.ethereum.removeListener('chainChanged', handleChainChanged);
        }
      };
    }
  }, [handleAccountsChanged, handleChainChanged]);

  // Connect
  const connect = useCallback(async () => {
    if (IS_DEMO_MODE) {
      const account = getOrCreateDemoWallet();
      localStorage.setItem(DEMO_CONNECTED_KEY, 'true');
      setState((prev) => ({
        ...prev,
        isConnecting: false,
        isConnected: true,
        account,
        chainId: DEMO_CHAIN_ID,
        error: null,
      }));
      toast({
        title: 'Demo wallet connected',
        description: `Using ${account.substring(0, 6)}…${account.substring(38)}`,
      });
      return { account, signer: null };
    }

    if (!window.ethereum) {
      toast({
        title: 'MetaMask not found',
        description: 'Please install MetaMask browser extension to continue',
        variant: 'destructive',
      });
      return null;
    }

    try {
      setState((prev) => ({ ...prev, isConnecting: true, error: null }));
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const signer = await provider.getSigner();
      const account = accounts[0];
      const network = await provider.getNetwork();

      setState((prev) => ({
        ...prev,
        isConnecting: false,
        isConnected: true,
        account,
        chainId: network.chainId.toString(),
        provider,
        signer,
        error: null,
      }));

      toast({
        title: 'Connected',
        description: `Connected to account ${account.substring(0, 6)}...${account.substring(38)}`,
      });

      return { account, signer };
    } catch (error: any) {
      console.error('Error connecting to MetaMask:', error);
      setState((prev) => ({
        ...prev,
        isConnecting: false,
        error: error.message || 'Failed to connect to MetaMask',
      }));
      toast({
        title: 'Connection Failed',
        description: error.message || 'Failed to connect to MetaMask',
        variant: 'destructive',
      });
      return null;
    }
  }, [toast]);

  const disconnect = useCallback(() => {
    if (IS_DEMO_MODE) {
      localStorage.removeItem(DEMO_CONNECTED_KEY);
    }
    setState((prev) => ({
      ...prev,
      isConnected: false,
      account: null,
      signer: null,
    }));
    toast({
      title: 'Disconnected',
      description: IS_DEMO_MODE ? 'Demo wallet disconnected' : 'Disconnected from MetaMask',
    });
  }, [toast]);

  // Sign a message — in demo mode just echo back the message (no real sig)
  const signMessage = useCallback(
    async (message: string) => {
      if (IS_DEMO_MODE) {
        return 'demo:' + message;
      }
      if (!state.signer) {
        toast({
          title: 'Not connected',
          description: 'Please connect to MetaMask first',
          variant: 'destructive',
        });
        return null;
      }
      try {
        return await state.signer.signMessage(message);
      } catch (error: any) {
        console.error('Error signing message:', error);
        toast({
          title: 'Signing Failed',
          description: error.message || 'Failed to sign message with MetaMask',
          variant: 'destructive',
        });
        return null;
      }
    },
    [state.signer, toast]
  );

  return {
    ...state,
    connect,
    disconnect,
    signMessage,
  };
};

// TypeScript support for window.ethereum
declare global {
  interface Window {
    ethereum: any;
  }
}
