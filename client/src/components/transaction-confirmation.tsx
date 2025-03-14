import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useMetaMask } from "../hooks/use-metamask";
import { ExternalLink, Copy, Check } from "lucide-react";

interface TransactionConfirmationProps {
  transactionHash: string;
  candidateName: string;
  timestamp: string;
}

export function TransactionConfirmation({
  transactionHash,
  candidateName,
  timestamp,
}: TransactionConfirmationProps) {
  const { toast } = useToast();
  const { chainId } = useMetaMask();
  const [copied, setCopied] = useState(false);

  // Get the appropriate explorer URL based on the current network
  const getExplorerUrl = (hash: string) => {
    if (!chainId) return `https://etherscan.io/tx/${hash}`;

    // Convert decimal to hex if needed
    const hexChainId = chainId.startsWith("0x") ? chainId : `0x${parseInt(chainId).toString(16)}`;

    switch (hexChainId.toLowerCase()) {
      case "0x1": // Ethereum Mainnet
        return `https://etherscan.io/tx/${hash}`;
      case "0x5": // Goerli Testnet
        return `https://goerli.etherscan.io/tx/${hash}`;
      case "0xaa36a7": // Sepolia Testnet
        return `https://sepolia.etherscan.io/tx/${hash}`;
      case "0x89": // Polygon
        return `https://polygonscan.com/tx/${hash}`;
      case "0xe9": // Amoy Testnet
        return `https://www.oklink.com/amoy/tx/${hash}`;
      default:
        return `https://www.oklink.com/amoy/tx/${hash}`; // Default to Amoy testnet
    }
  };

  const handleCopyHash = () => {
    navigator.clipboard.writeText(transactionHash);
    setCopied(true);
    
    toast({
      title: "Copied to clipboard",
      description: "Transaction hash copied to clipboard",
    });
    
    setTimeout(() => setCopied(false), 2000);
  };

  const handleViewOnExplorer = () => {
    const url = getExplorerUrl(transactionHash);
    window.open(url, '_blank');
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader className="pb-4">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <Check className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <CardTitle className="text-center text-2xl">Vote Confirmed</CardTitle>
        <CardDescription className="text-center">
          Your vote has been submitted to the blockchain
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Transaction Hash</p>
            <div className="flex items-center space-x-2">
              <code className="flex-1 bg-slate-100 p-2 rounded text-sm font-mono overflow-x-auto">
                {transactionHash}
              </code>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={handleCopyHash}
                className="flex items-center"
              >
                {copied ? (
                  <Check className="h-4 w-4 mr-1" />
                ) : (
                  <Copy className="h-4 w-4 mr-1" />
                )}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Voted For</p>
              <p className="font-medium">{candidateName}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Timestamp</p>
              <p className="font-medium">{timestamp}</p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-md p-4 text-sm text-blue-800">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg 
                  className="h-5 w-5 text-blue-400" 
                  xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 20 20" 
                  fill="currentColor" 
                  aria-hidden="true"
                >
                  <path 
                    fillRule="evenodd" 
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" 
                    clipRule="evenodd" 
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p>
                  Your vote has been recorded on the blockchain and cannot be altered. 
                  You can use the transaction hash above to verify your vote on any blockchain explorer.
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex justify-center">
          <Button 
            variant="outline" 
            className="w-full sm:w-auto" 
            onClick={handleViewOnExplorer}
          >
            <ExternalLink className="h-5 w-5 mr-2" />
            View on Explorer
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}