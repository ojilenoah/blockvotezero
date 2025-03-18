import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useMetaMask } from "../hooks/use-metamask";
import { 
  ShieldCheck, 
  LogOut, 
  Home, 
  ChevronDown, 
  ExternalLink,
  LayoutDashboard
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

  const getNetworkColor = (id: string | null) => {
    if (!id) return "gray";

    // Convert decimal to hex if needed
    const hexChainId = id.startsWith("0x") ? id : `0x${parseInt(id).toString(16)}`;

    switch (hexChainId.toLowerCase()) {
      case "0x1":
        return "blue";
      case "0x5":
      case "0xaa36a7":
        return "amber";
      case "0x89":
        return "purple";
      case "0xe9":
        return "green";
      default:
        return "gray";
    }
  };

  const networkColor = getNetworkColor(chainId);
  const networkName = getNetworkName(chainId);

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-sm supports-[backdrop-filter]:bg-white/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Link href="/">
                <div className="flex items-center gap-3 cursor-pointer">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <span className="font-bold text-lg text-slate-900">BlockVote</span>
                    <span className="text-xs text-slate-500 ml-1">Admin</span>
                  </div>
                </div>
              </Link>
            </div>
            <div className="hidden md:flex md:items-center space-x-1 ml-6">
              <Link href="/admin/dashboard">
                <Button variant="ghost" size="sm" className="text-sm font-medium flex items-center">
                  <LayoutDashboard className="h-4 w-4 mr-1.5 opacity-70" />
                  Dashboard
                </Button>
              </Link>
              <Link href="/">
                <Button variant="ghost" size="sm" className="text-sm font-medium flex items-center">
                  <Home className="h-4 w-4 mr-1.5 opacity-70" />
                  Public Site
                </Button>
              </Link>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {isConnected && (
              <Badge 
                variant="outline" 
                className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 ${
                  networkColor === 'blue' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                  networkColor === 'amber' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                  networkColor === 'purple' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                  networkColor === 'green' ? 'bg-green-50 text-green-700 border-green-200' :
                  'bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                  networkColor === 'blue' ? 'bg-blue-500' :
                  networkColor === 'amber' ? 'bg-amber-500' :
                  networkColor === 'purple' ? 'bg-purple-500' :
                  networkColor === 'green' ? 'bg-green-500' :
                  'bg-slate-500'
                }`}></div>
                {networkName}
              </Badge>
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex items-center gap-2 border-slate-200 bg-white/50 backdrop-blur"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="hidden sm:inline font-medium">Admin</span>
                    <span className="font-mono text-xs text-slate-600 truncate max-w-[80px] sm:max-w-[120px]">
                      {address.substring(0, 6)}...{address.substring(address.length - 4)}
                    </span>
                  </div>
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[220px]">
                <DropdownMenuLabel>Admin Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="flex-col items-start">
                  <div className="text-xs text-muted-foreground mb-1">Connected Address</div>
                  <div className="font-mono text-xs truncate w-full">{address}</div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/" className="cursor-pointer flex w-full items-center">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    <span>View Public Site</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={onLogout}
                  className="text-red-600 focus:text-red-600 focus:bg-red-50"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </nav>
  );
}