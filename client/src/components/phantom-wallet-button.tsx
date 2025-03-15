import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface PhantomWalletButtonProps {
  onConnect: (address: string) => void;
  className?: string;
}

export function PhantomWalletButton({ onConnect, className = "" }: PhantomWalletButtonProps) {
  const [isPhantomInstalled, setIsPhantomInstalled] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Check if Phantom is installed
  useEffect(() => {
    const checkPhantomInstalled = async () => {
      // @ts-ignore - Phantom is not typed
      const isPhantomAvailable = window.phantom?.solana?.isPhantom;
      setIsPhantomInstalled(!!isPhantomAvailable);
    };

    checkPhantomInstalled();
  }, []);

  // Connect to Phantom Wallet
  const connectWallet = async () => {
    setIsConnecting(true);
    setError(null);

    try {
      // @ts-ignore - Phantom is not in the window types
      const provider = window.phantom?.solana;

      if (!provider?.isPhantom) {
        throw new Error("Phantom wallet is not installed");
      }

      // Connect to Phantom
      const response = await provider.connect();
      const publicKey = response.publicKey.toString();
      
      // Get Polygon address from Phantom (note: this is a fictional approach as Phantom
      // primarily supports Solana, but we're simulating integration with Polygon)
      try {
        // @ts-ignore - getPolygonAddresses is fictional
        const polygonAddresses = await provider.getPolygonAddresses?.();
        
        if (polygonAddresses && polygonAddresses.length > 0) {
          onConnect(polygonAddresses[0]);
        } else {
          // Use Solana address as fallback
          onConnect(publicKey);
        }
      } catch (err) {
        // Fallback to using the Solana address if Polygon isn't supported
        console.log("Phantom Polygon support not available, using Solana address");
        onConnect(publicKey);
      }
    } catch (err: any) {
      console.error("Error connecting to Phantom wallet:", err);
      setError(err.message || "Failed to connect to Phantom wallet");
    } finally {
      setIsConnecting(false);
    }
  };

  if (!isPhantomInstalled) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Phantom Not Installed</AlertTitle>
        <AlertDescription>
          Please install the Phantom wallet extension to continue.
          <div className="mt-2">
            <a 
              href="https://phantom.app/" 
              target="_blank" 
              rel="noreferrer"
              className="text-primary underline"
            >
              Get Phantom Wallet
            </a>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={className}>
      {error && (
        <Alert variant="destructive" className="mb-3">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Connection Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Button
        onClick={connectWallet}
        disabled={isConnecting}
        className="w-full bg-[#4E44CE] hover:bg-[#3D35AA] text-white"
      >
        {isConnecting ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <svg
            className="h-5 w-5 mr-2"
            viewBox="0 0 128 128"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect width="128" height="128" rx="64" fill="#AB9FF2" fillOpacity="0.2" />
            <path
              d="M110.584 64.9142H99.142C99.142 41.8335 80.2206 23 57.0399 23C34.1367 23 15.4248 41.3524 14.9956 64.0763C14.5504 87.4831 36.3419 107 59.7764 107H63.3958C84.5719 107 110.584 89.7867 110.584 64.9142Z"
              fill="#AB9FF2"
            />
            <path
              d="M73.8466 60.9142C74.4892 55.6798 78.9802 51.571 84.2146 52.2136C89.4491 52.8562 93.5579 57.3472 92.9153 62.5816C92.2726 67.816 87.7817 71.9248 82.5472 71.2822C77.3128 70.6396 73.204 66.1486 73.8466 60.9142Z"
              fill="white"
            />
          </svg>
        )}
        Connect with Phantom
      </Button>
    </div>
  );
}