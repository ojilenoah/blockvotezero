import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useMetaMask } from "../../hooks/use-metamask";
import { Loader2 } from "lucide-react";
import { Navbar } from "@/components/navbar";

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);

  // Use the MetaMask hook
  const { 
    isMetaMaskInstalled,
    isConnecting,
    isConnected,
    account,
    connect
  } = useMetaMask();

  // List of authorized admin addresses
  const ADMIN_ADDRESSES = [
    "0x2B3d7c0A2A05f760272165A836D1aDFE8ea38490", // Authorized admin address
  ];

  // Check if the connected account is an admin
  useEffect(() => {
    if (isConnected && account) {
      // Convert addresses to lowercase for case-insensitive comparison
      const normalizedAccount = account.toLowerCase();
      const normalizedAdminAddresses = ADMIN_ADDRESSES.map(addr => addr.toLowerCase());

      const isAdmin = normalizedAdminAddresses.includes(normalizedAccount);

      if (isAdmin) {
        toast({
          title: "Authentication successful",
          description: "Welcome, admin!",
          variant: "default",
        });

        // Store admin status in session storage
        sessionStorage.setItem("isAdmin", "true");
        sessionStorage.setItem("adminAddress", account);

        // Redirect to admin dashboard
        setLocation("/admin/dashboard");
      } else {
        setError("This wallet is not authorized as an admin. Please connect with the admin wallet.");
      }
    }
  }, [isConnected, account, toast, setLocation]);

  const handleConnectWallet = async () => {
    setError(null);
    try {
      await connect();
    } catch (err: any) {
      setError(err.message || "Failed to connect to MetaMask. Please try again.");
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Admin Login</CardTitle>
            <CardDescription className="text-center">
              Connect your admin wallet to manage elections
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col space-y-4">
              <Button 
                className="w-full" 
                size="lg"
                onClick={handleConnectWallet}
                disabled={isConnecting}
              >
                {isConnecting ? (
                  <span className="flex items-center">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </span>
                ) : (
                  <span className="flex items-center">
                    <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 35 33" xmlns="http://www.w3.org/2000/svg">
                      <path d="M32.9582 1L17.9582 10.0000L16.9582 4.8369L32.9582 1Z" fill="#E17726" stroke="#E17726" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M2.83203 1L17.6514 10.0000L18.8329 4.8369L2.83203 1Z" fill="#E27625" stroke="#E27625" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M28.2783 23.5088L24.7334 28.7866L32.0894 30.7866L34.1761 23.6369L28.2783 23.5088Z" fill="#E27625" stroke="#E27625" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M1.62695 23.6292L3.70728 30.7789L11.0567 28.7789L7.51837 23.5011L1.62695 23.6292Z" fill="#E27625" stroke="#E27625" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Connect with MetaMask
                  </span>
                )}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t"></span>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Secure Authentication
                  </span>
                </div>
              </div>

              <p className="text-sm text-center text-gray-500">
                Only authorized wallets can access the admin panel.
                <br />
                Make sure you have MetaMask installed.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}