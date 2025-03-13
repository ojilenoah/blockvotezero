import { useState } from "react";
import { Button } from "@/components/ui/button";

export function WalletButton() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");

  const handleConnect = () => {
    setIsConnecting(true);
    
    // Placeholder for MetaMask connection
    // In a real implementation, this would check for window.ethereum
    // and request accounts
    setTimeout(() => {
      setIsConnecting(false);
      if (!isConnected) {
        setIsConnected(true);
        setWalletAddress("0x1234...5678");
      }
    }, 1000);
  };

  if (isConnected) {
    return (
      <Button 
        variant="outline" 
        size="sm"
        className="flex items-center space-x-2"
        onClick={() => setIsConnected(false)}
      >
        <div className="h-2 w-2 rounded-full bg-green-500"></div>
        <span className="text-sm">{walletAddress}</span>
      </Button>
    );
  }

  return (
    <Button 
      variant="default" 
      size="sm"
      className="inline-flex items-center"
      onClick={handleConnect}
      disabled={isConnecting}
    >
      <svg className="mr-2 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M17.778 8.222c-4.296-4.296-11.26-4.296-15.556 0A1 1 0 01.808 6.808c5.076-5.077 13.308-5.077 18.384 0a1 1 0 01-1.414 1.414zM14.95 11.05a7 7 0 00-9.9 0 1 1 0 01-1.414-1.414 9 9 0 0112.728 0 1 1 0 01-1.414 1.414zM12.12 13.88a3 3 0 00-4.242 0 1 1 0 01-1.415-1.415 5 5 0 017.072 0 1 1 0 01-1.415 1.415zM9 16a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
      </svg>
      {isConnecting ? "Connecting..." : "Connect Wallet"}
    </Button>
  );
}
