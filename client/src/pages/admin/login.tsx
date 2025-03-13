import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Simulated admin address
  const ADMIN_ADDRESS = "0x123...789";
  
  const handleConnectWallet = async () => {
    setIsConnecting(true);
    setError(null);
    
    // Simulate MetaMask connection
    setTimeout(() => {
      try {
        // Check if window.ethereum exists (MetaMask)
        if (typeof window !== "undefined" && "ethereum" in window) {
          toast({
            title: "MetaMask detected",
            description: "Requesting account access..."
          });
          
          // Simulate successful connection
          // In a real implementation, this would be:
          // const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
          const simulatedAccount = Math.random() > 0.3 
            ? "0x123...789"  // Admin address (70% chance)
            : "0x456...012"; // Non-admin address (30% chance)
          
          if (simulatedAccount === ADMIN_ADDRESS) {
            toast({
              title: "Authentication successful",
              description: "Welcome, admin!",
              variant: "default",
            });
            
            // Store admin status in session storage
            sessionStorage.setItem("isAdmin", "true");
            sessionStorage.setItem("adminAddress", simulatedAccount);
            
            // Redirect to admin dashboard
            setLocation("/admin/dashboard");
          } else {
            setError("This wallet is not authorized as an admin. Please connect with the admin wallet.");
          }
        } else {
          setError("MetaMask not detected. Please install MetaMask and try again.");
        }
      } catch (err) {
        setError("Failed to connect to MetaMask. Please try again.");
        console.error(err);
      } finally {
        setIsConnecting(false);
      }
    }, 1500);
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
          
          <div className="flex flex-col space-y-4">
            <Button 
              className="w-full" 
              size="lg"
              onClick={handleConnectWallet}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
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
  );
}