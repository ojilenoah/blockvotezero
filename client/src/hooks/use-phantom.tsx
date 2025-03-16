import { useState, useEffect } from 'react';
import { useToast } from './use-toast';

export type PhantomState = {
  isPhantomInstalled: boolean;
  isConnecting: boolean;
  isConnected: boolean;
  polygonAddress: string | null;
  error: string | null;
};

export const usePhantom = function() {
  const { toast } = useToast();
  const [state, setState] = useState<PhantomState>({
    isPhantomInstalled: false,
    isConnecting: false,
    isConnected: false,
    polygonAddress: null,
    error: null,
  });

  // Check if Phantom is installed
  useEffect(() => {
    const checkPhantomInstalled = () => {
      // @ts-ignore - Phantom is not typed
      const isPhantomAvailable = window.phantom?.solana?.isPhantom;
      setState(prevState => ({
        ...prevState,
        isPhantomInstalled: !!isPhantomAvailable
      }));
    };

    checkPhantomInstalled();
  }, []);

  // Connect to Phantom and get a derived Polygon address
  const connect = async () => {
    setState(prevState => ({
      ...prevState,
      isConnecting: true,
      error: null
    }));

    try {
      // @ts-ignore - Phantom is not in the window types
      const provider = window.phantom?.solana;

      if (!provider?.isPhantom) {
        throw new Error("Phantom wallet is not installed");
      }

      // Connect to Phantom
      const response = await provider.connect();
      const solanaPublicKey = response.publicKey.toString();
      
      // Generate a consistent Polygon-style address from the Solana public key
      // This creates a deterministic 0x address that will be the same each time for this user
      const polygonStyleAddress = "0x" + solanaPublicKey.slice(0, 40);
      
      setState(prevState => ({
        ...prevState,
        isConnecting: false,
        isConnected: true,
        polygonAddress: polygonStyleAddress,
        error: null
      }));
      
      toast({
        title: "Connected to Phantom",
        description: `Connected with Polygon address ${polygonStyleAddress.substring(0, 6)}...${polygonStyleAddress.substring(38)}`,
      });
      
      return polygonStyleAddress;
    } catch (error: any) {
      console.error('Error connecting to Phantom wallet:', error);
      
      setState(prevState => ({
        ...prevState,
        isConnecting: false,
        error: error.message || 'Failed to connect to Phantom wallet'
      }));
      
      toast({
        title: "Connection Failed",
        description: error.message || 'Failed to connect to Phantom wallet',
        variant: "destructive"
      });
      
      return null;
    }
  };

  // Disconnect from Phantom
  const disconnect = () => {
    setState({
      isPhantomInstalled: state.isPhantomInstalled,
      isConnecting: false,
      isConnected: false,
      polygonAddress: null,
      error: null
    });
    
    toast({
      title: "Disconnected",
      description: "Disconnected from Phantom wallet"
    });
  };

  return {
    ...state,
    connect,
    disconnect
  };
};

// Needed for TypeScript support with window.phantom
declare global {
  interface Window {
    phantom?: {
      solana?: {
        isPhantom?: boolean;
        connect: () => Promise<{ publicKey: { toString: () => string } }>;
        disconnect: () => Promise<void>;
      };
    };
  }
}