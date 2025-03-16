import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle, Wallet } from "lucide-react";
import { useMetaMask } from "@/hooks/use-metamask";
import { getNINByWalletAddress, User } from "@/utils/supabase";

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

    if (userDetails.status === 'Y') {
      return (
        <div className="flex items-center p-3 text-green-700 bg-green-50 rounded-md">
          <CheckCircle className="h-5 w-5 mr-2" />
          <span className="font-medium">Voted</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center p-3 text-blue-700 bg-blue-50 rounded-md">
          <CheckCircle className="h-5 w-5 mr-2" />
          <span className="font-medium">Registered</span>
        </div>
      );
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>NIN Status Check</CardTitle>
        <CardDescription>
          Check the status of your National Identification Number.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isConnected ? (
          <div className="space-y-4">
            <Alert className="bg-yellow-50 border-yellow-200">
              <AlertTitle>Wallet Connection Required</AlertTitle>
              <AlertDescription>
                Connect your wallet to check your NIN status.
              </AlertDescription>
            </Alert>
            
            <Button 
              onClick={connect} 
              className="w-full"
              variant="outline"
            >
              <Wallet className="h-5 w-5 mr-2" />
              Connect Wallet
            </Button>
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
              <p className="text-sm text-slate-700">Status:</p>
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