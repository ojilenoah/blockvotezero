import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Loader2, Wallet, CheckCircle, AlertTriangle, Lock } from "lucide-react";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useMetaMask } from "@/hooks/use-metamask";
import { submitNIN, getNINByWalletAddress, User, checkNINSubmissionLocked } from "@/utils/supabase";

// Validation schema for NIN
const ninSchema = z.object({
  nin: z
    .string()
    .min(11, { message: "NIN must be 11 digits." })
    .max(11, { message: "NIN must be 11 digits." })
    .regex(/^[0-9]+$/, { message: "NIN must contain only numbers." })
});

type NinFormValues = z.infer<typeof ninSchema>;

interface NinRegistrationFormProps {
  onSuccess?: () => void;
}

export function NinRegistrationForm({ onSuccess }: NinRegistrationFormProps) {
  const { toast } = useToast();
  const { account, isConnected, connect } = useMetaMask();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [existingNIN, setExistingNIN] = useState<User | null>(null);
  const [isRegistrationLocked, setIsRegistrationLocked] = useState(false);
  const [checkingLockStatus, setCheckingLockStatus] = useState(true);

  const form = useForm<NinFormValues>({
    resolver: zodResolver(ninSchema),
    defaultValues: {
      nin: "",
    },
  });

  // Check registration lock status on component mount
  useEffect(() => {
    const checkLockStatus = async () => {
      setCheckingLockStatus(true);
      try {
        const isLocked = await checkNINSubmissionLocked();
        setIsRegistrationLocked(isLocked);
        console.log("Registration lock status:", isLocked);
      } catch (err) {
        console.error("Error checking lock status:", err);
      } finally {
        setCheckingLockStatus(false);
      }
    };
    
    checkLockStatus();
  }, []);

  // Check if the wallet already has a registered NIN whenever the wallet address changes
  useEffect(() => {
    const checkExistingNIN = async () => {
      if (!isConnected || !account) return;
      
      setLoading(true);
      try {
        const result = await getNINByWalletAddress(account);
        if (result) {
          setExistingNIN(result);
        } else {
          setExistingNIN(null);
        }
      } catch (err) {
        console.error("Error checking existing NIN:", err);
      } finally {
        setLoading(false);
      }
    };
    
    checkExistingNIN();
  }, [account, isConnected]);

  const handleConnectWallet = async () => {
    if (!isConnected) {
      await connect();
    }
  };

  const onSubmit = async (data: NinFormValues) => {
    if (!isConnected || !account) {
      setError("Please connect your wallet first.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Submit NIN to Supabase
      const result = await submitNIN(account, data.nin);

      if (result.success) {
        setSuccess(true);
        toast({
          title: "NIN Submitted",
          description: "Your NIN has been submitted successfully and is pending verification.",
        });
        
        if (onSuccess) {
          onSuccess();
        }
      } else {
        setError(result.error || "Failed to submit NIN. Please try again.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>NIN Registration</CardTitle>
        <CardDescription>
          Register your National Identification Number (NIN) to participate in voting.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {checkingLockStatus ? (
          <div className="flex justify-center p-6">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          </div>
        ) : isRegistrationLocked ? (
          <div className="space-y-4">
            <Alert className="bg-red-50 border-red-200">
              <AlertTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-red-500" />
                Registration Closed
              </AlertTitle>
              <AlertDescription>
                <p className="mb-2">NIN registration is currently locked.</p>
                <p className="text-sm text-red-700">
                  During active elections, the registration system is locked to ensure voting integrity. 
                  Please check back later when the election has concluded.
                </p>
                {existingNIN && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-md border border-blue-100">
                    <p className="text-sm font-medium text-blue-800">Your existing registration remains valid:</p>
                    <div className="mt-1 font-mono text-sm">{existingNIN.nin}</div>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          </div>
        ) : !isConnected ? (
          <div className="space-y-4">
            <Alert className="mb-4 bg-yellow-50 border-yellow-200">
              <AlertTitle>Wallet Connection Required</AlertTitle>
              <AlertDescription>
                Connect your wallet to register your NIN. This is required for verification purposes.
              </AlertDescription>
            </Alert>
            
            <Button 
              onClick={handleConnectWallet} 
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Wallet className="h-5 w-5 mr-2" />
              )}
              Connect Wallet
            </Button>
          </div>
        ) : loading ? (
          <div className="flex justify-center p-6">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          </div>
        ) : existingNIN ? (
          <div className="space-y-4">
            <Alert className="bg-blue-50 border-blue-200">
              <AlertTitle>NIN Already Registered</AlertTitle>
              <AlertDescription>
                <p>Your wallet address already has a registered NIN:</p>
                <div className="mt-2 font-mono font-medium">{existingNIN.nin}</div>
                <div className="mt-2">
                  <span className="font-medium">Status: </span>
                  {existingNIN.status === 'Y' ? (
                    <span className="text-green-600 font-medium flex items-center">
                      <CheckCircle className="h-4 w-4 mr-1" /> Voted
                    </span>
                  ) : (
                    <span className="text-blue-600 font-medium">Registered</span>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          </div>
        ) : success ? (
          <Alert className="mb-4 bg-green-50 border-green-200">
            <AlertTitle>Registration Successful</AlertTitle>
            <AlertDescription className="font-medium">
              Your NIN has been successfully submitted and registered. You can now vote in the elections.
            </AlertDescription>
          </Alert>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="bg-slate-50 p-3 rounded-md mb-4">
                <p className="text-sm text-slate-700 mb-1">Connected Wallet:</p>
                <p className="font-mono text-sm">{account}</p>
              </div>
              
              <FormField
                control={form.control}
                name="nin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>National Identification Number (NIN)</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your 11-digit NIN" {...field} maxLength={11} />
                    </FormControl>
                    <FormDescription>
                      Your 11-digit National Identification Number.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button 
                type="submit" 
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit NIN
              </Button>
            </form>
          </Form>
        )}
      </CardContent>
      <CardFooter className="flex flex-col space-y-2">
        <p className="text-xs text-slate-500 text-center">
          Your NIN will be securely stored and used only for verification purposes.
          {account && (
            <>
              <br />
              Status: Connected with Wallet
            </>
          )}
        </p>
      </CardFooter>
    </Card>
  );
}