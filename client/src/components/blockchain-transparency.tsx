import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useMetaMask } from "@/hooks/use-metamask";
import { CONTRACT_ADDRESS } from "@/utils/blockchain";

export function BlockchainTransparency() {
  const { chainId } = useMetaMask();
  const [explorerBaseUrl, setExplorerBaseUrl] = useState("https://mumbai.polygonscan.com");

  useEffect(() => {
    // Update explorer URL based on chain ID
    if (chainId) {
      const hexChainId = chainId.startsWith("0x") ? chainId : `0x${parseInt(chainId).toString(16)}`;
      switch (hexChainId.toLowerCase()) {
        case "0x89": // Polygon Mainnet
          setExplorerBaseUrl("https://polygonscan.com");
          break;
        case "0x13881": // Mumbai Testnet
          setExplorerBaseUrl("https://mumbai.polygonscan.com");
          break;
        // Add other networks as needed
        default:
          setExplorerBaseUrl("https://mumbai.polygonscan.com");
      }
    }
  }, [chainId]);

  return (
    <div>
      <Card className="bg-white shadow rounded-lg overflow-hidden">
        <CardContent className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Blockchain Transparency</h3>
          <div className="mt-2 max-w-xl text-sm text-gray-500">
            <p>All votes are recorded on the blockchain for complete transparency and verification.</p>
          </div>
          <div className="mt-4">
            <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
              <div className="flex flex-col space-y-3">
                <div className="flex items-center">
                  <div className="w-20 text-xs font-medium text-gray-500">Contract</div>
                  <div className="flex-1 text-xs font-mono text-gray-900 truncate">{CONTRACT_ADDRESS}</div>
                </div>
                <div className="flex items-center">
                  <div className="w-20 text-xs font-medium text-gray-500">Network</div>
                  <div className="flex-1 text-xs text-gray-900">
                    {chainId ? (
                      chainId === "0x13881" ? "Polygon Mumbai Testnet" : "Polygon Network"
                    ) : (
                      "Unknown Network"
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4 text-sm">
              <a 
                href={`${explorerBaseUrl}/address/${CONTRACT_ADDRESS}`}
                target="_blank"
                rel="noopener noreferrer" 
                className="font-medium text-primary hover:text-blue-500"
              >
                View contract on Explorer <span aria-hidden="true">→</span>
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}