import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, XCircle, Clock } from "lucide-react";
import { useMetaMask } from "@/hooks/use-metamask";
import { getNINByWalletAddress, User } from "@/utils/supabase";
import { PhantomWalletButton } from "@/components/phantom-wallet-button";

export function NinStatusCheck() {
  const { isConnected, account, connect } = useMetaMask();
  const [loading, setLoading] = useState(false);
  const [userDetails, setUserDetails] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadUserDetails = async () => {
    if (!isConnected || !account) return;

    setLoading(true);
    setError(null);

    try {
      const data = await getNINByWalletAddress(account);
      setUserDetails(data);
    } catch (err: any) {
      setError(err.message || "Failed to load user details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected && account) {
      loadUserDetails();
    }
  }, [isConnected, account]);

  const handleRefresh = () => {
    loadUserDetails();
  };

  const renderStatusBadge = () => {
    if (!userDetails) return null;

    if (userDetails.verification_status === 'Y') {
      return (
        <div className="flex items-center p-3 text-green-700 bg-green-50 rounded-md">
          <CheckCircle className="h-5 w-5 mr-2" />
          <span className="font-medium">Verified</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center p-3 text-amber-700 bg-amber-50 rounded-md">
          <Clock className="h-5 w-5 mr-2" />
          <span className="font-medium">Pending Verification</span>
        </div>
      );
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>NIN Verification Status</CardTitle>
        <CardDescription>
          Check the verification status of your National Identification Number.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isConnected ? (
          <div className="space-y-4">
            <Alert className="bg-yellow-50 border-yellow-200">
              <AlertTitle>Wallet Connection Required</AlertTitle>
              <AlertDescription>
                Connect your wallet to check your NIN verification status.
              </AlertDescription>
            </Alert>
            
            <Tabs defaultValue="metamask" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="metamask">MetaMask</TabsTrigger>
                <TabsTrigger value="phantom">Phantom</TabsTrigger>
              </TabsList>
              
              <TabsContent value="metamask" className="mt-4">
                <Button 
                  onClick={connect} 
                  className="w-full"
                  variant="outline"
                >
                  <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 35 33" xmlns="http://www.w3.org/2000/svg">
                    <path d="M32.9582 1L17.9582 10.0000L16.9582 4.8369L32.9582 1Z" fill="#E17726" stroke="#E17726" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M2.83203 1L17.6514 10.0000L18.8329 4.8369L2.83203 1Z" fill="#E27625" stroke="#E27625" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M28.2783 23.5088L24.7334 28.7866L32.0894 30.7866L34.1761 23.6369L28.2783 23.5088Z" fill="#E27625" stroke="#E27625" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M1.62695 23.6292L3.70728 30.7789L11.0567 28.7789L7.51837 23.5011L1.62695 23.6292Z" fill="#E27625" stroke="#E27625" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Connect with MetaMask
                </Button>
              </TabsContent>
              
              <TabsContent value="phantom" className="mt-4">
                <PhantomWalletButton 
                  onConnect={(address) => {
                    // This simulates the MetaMask connection by setting the account
                    (window as any).ethereum = { 
                      selectedAddress: address,
                      isConnected: true
                    };
                    
                    // Force the useMetaMask hook to update
                    connect();
                  }}
                />
              </TabsContent>
            </Tabs>
          </div>
        ) : loading ? (
          <div className="flex justify-center p-6">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
            <Button 
              onClick={handleRefresh} 
              className="mt-2"
              variant="outline"
            >
              Try Again
            </Button>
          </Alert>
        ) : !userDetails ? (
          <Alert className="bg-blue-50 border-blue-200">
            <AlertTitle>No NIN Found</AlertTitle>
            <AlertDescription>
              We couldn't find a registered NIN associated with this wallet address.
              Please register your NIN first.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            <div className="bg-slate-50 p-3 rounded-md">
              <p className="text-sm text-slate-700 mb-1">Wallet Address:</p>
              <p className="font-mono text-sm truncate">{userDetails.wallet_address}</p>
            </div>
            
            <div className="bg-slate-50 p-3 rounded-md">
              <p className="text-sm text-slate-700 mb-1">National Identification Number:</p>
              <p className="font-mono text-base">{userDetails.nin}</p>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm text-slate-700">Verification Status:</p>
              {renderStatusBadge()}
            </div>
            
            <div className="space-y-2">
              <p className="text-sm text-slate-700">Registration Date:</p>
              <p className="text-sm">{new Date(userDetails.created_at).toLocaleDateString()}</p>
            </div>
            
            <Button 
              onClick={handleRefresh} 
              className="w-full"
              variant="outline"
            >
              Refresh Status
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}