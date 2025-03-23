import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useMetaMask } from "../hooks/use-metamask";
import { Wallet, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface AdminNavbarProps {
  address: string;
  onLogout: () => void;
}

export function AdminNavbar({ address, onLogout }: AdminNavbarProps) {
  const { isConnected, chainId } = useMetaMask();

  // Determine network name based on chainId
  const getNetworkName = (id: string | null) => {
    if (!id) return "Unknown";

    // Convert decimal to hex if needed
    const hexChainId = id.startsWith("0x") ? id : `0x${parseInt(id).toString(16)}`;

    switch (hexChainId.toLowerCase()) {
      case "0x1":
        return "Ethereum Mainnet";
      case "0x5":
        return "Goerli Testnet";
      case "0xaa36a7":
        return "Sepolia Testnet";
      case "0x89":
        return "Polygon";
      case "0xe9":
        return "Amoy Testnet";
      case "0x539":
        return "Localhost 8545";
      default:
        return `Chain ID: ${id}`;
    }
  };

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Link href="/">
                <div className="flex items-center cursor-pointer">
                  <svg className="h-8 w-8 text-primary" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  <span className="ml-2 text-xl font-semibold text-gray-900">BlockVote</span>
                </div>
              </Link>
            </div>
            <div className="ml-6 flex items-center">
              <Link href="/admin/dashboard">
                <Button variant="ghost" className="text-sm font-medium">
                  Dashboard
                </Button>
              </Link>
            </div>
          </div>
          <div className="flex items-center">
            {isConnected && (
              <Badge variant="outline" className="mr-3 bg-green-50 text-green-700 border-green-200 flex items-center">
                <Check size={14} className="mr-1" /> 
                <span className="hidden md:inline">{getNetworkName(chainId)}</span>
              </Badge>
            )}
            <div className="text-sm text-gray-500 mr-4">
              <span className="hidden md:inline">Admin:</span>{" "}
              <span className="font-mono truncate max-w-[120px] inline-block align-bottom">{address}</span>
            </div>
            <Button variant="outline" size="sm" onClick={onLogout} className="flex items-center">
              <Wallet className="mr-2 h-4 w-4" /> Logout
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}