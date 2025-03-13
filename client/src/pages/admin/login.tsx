
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useMetaMask } from "../../hooks/use-metamask";
import { Loader2 } from "lucide-react";
import { isAdmin } from "../../../utils/blockchain";

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState<boolean>(false);

  // Use the MetaMask hook
  const { 
    isMetaMaskInstalled,
    isConnecting,
    isConnected,
    account,
    connect
  } = useMetaMask();

  // Check if the connected account is an admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (isConnected && account) {
        setIsChecking(true);
        try {
          const adminStatus = await isAdmin(account);
          
          if (adminStatus) {
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
        } catch (err: any) {
          setError(`Error verifying admin status: ${err.message}`);
          console.error(err);
        } finally {
          setIsChecking(false);
        }
      }
    };
    
    checkAdminStatus();
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
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

          <div className="space-y-4">
            {!isMetaMaskInstalled ? (
              <Alert variant="destructive">
                <AlertDescription>
                  MetaMask is not installed. Please install MetaMask to use the admin panel.
                </AlertDescription>
              </Alert>
            ) : (
              <Button 
                onClick={handleConnectWallet} 
                className="w-full"
                disabled={isConnecting || isChecking}
              >
                {isConnecting || isChecking ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isConnecting ? "Connecting..." : "Verifying..."}
                  </>
                ) : (
                  "Connect Wallet"
                )}
              </Button>
            )}

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
  );
}
