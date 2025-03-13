import { Button } from "@/components/ui/button";
import { Loader2, Wallet } from "lucide-react";
import { useMetaMask } from "../hooks/use-metamask";

export function WalletButton() {
  const { 
    isMetaMaskInstalled, 
    isConnecting, 
    isConnected, 
    account, 
    connect, 
    disconnect 
  } = useMetaMask();

  if (!isMetaMaskInstalled) {
    return (
      <Button 
        variant="outline" 
        onClick={() => window.open("https://metamask.io/download/", "_blank")}
        className="bg-white text-black hover:bg-gray-100 border-gray-300"
      >
        <Wallet className="mr-2 h-4 w-4" /> Install MetaMask
      </Button>
    );
  }

  if (isConnecting) {
    return (
      <Button disabled variant="outline" className="bg-white text-black border-gray-300">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Connecting...
      </Button>
    );
  }

  if (isConnected && account) {
    return (
      <div className="flex items-center space-x-2">
        <div className="hidden md:block text-sm px-2 py-1 bg-green-100 text-green-800 rounded-md font-mono">
          {account.substring(0, 6)}...{account.substring(38)}
        </div>
        <Button 
          variant="outline" 
          onClick={disconnect}
          className="bg-white text-black hover:bg-gray-100 border-gray-300"
        >
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <Button 
      variant="outline" 
      onClick={connect}
      className="bg-white text-black hover:bg-gray-100 border-gray-300"
    >
      <Wallet className="mr-2 h-4 w-4" /> Connect Wallet
    </Button>
  );
}