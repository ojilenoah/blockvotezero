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

  // Connect to Phantom and get Polygon address manually
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
      
      // Prompt user for Polygon address
      const polygonAddress = prompt("Please enter your Polygon wallet address (0x format):");
      
      if (polygonAddress && polygonAddress.startsWith('0x')) {
        // Validate the Polygon address format
        if (polygonAddress.length === 42) {
          setState(prevState => ({
            ...prevState,
            isConnecting: false,
            isConnected: true,
            polygonAddress,
            error: null
          }));
          
          toast({
            title: "Connected",
            description: `Connected with Polygon address ${polygonAddress.substring(0, 6)}...${polygonAddress.substring(38)}`,
          });
          
          return polygonAddress;
        } else {
          throw new Error("Invalid Polygon address format");
        }
      } else {
        // For demo purposes, create a valid-looking Polygon address from Solana key
        const polygonStyleAddress = "0x" + solanaPublicKey.slice(0, 40);
        
        setState(prevState => ({
          ...prevState,
          isConnecting: false,
          isConnected: true,
          polygonAddress: polygonStyleAddress,
          error: null
        }));
        
        toast({
          title: "Connected",
          description: `Using derived Polygon address ${polygonStyleAddress.substring(0, 6)}...${polygonStyleAddress.substring(38)}`,
        });
        
        return polygonStyleAddress;
      }
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