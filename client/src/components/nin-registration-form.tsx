import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useMetaMask } from "@/hooks/use-metamask";
import { usePhantom } from "@/hooks/use-phantom";
import { submitNIN, getNINByWalletAddress, User } from "@/utils/supabase";
import { PhantomWalletButton } from "@/components/phantom-wallet-button";

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
  const { polygonAddress, isConnected: isPhantomConnected, connect: connectPhantom } = usePhantom();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [existingNIN, setExistingNIN] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<string>("metamask");
  
  const effectiveWalletAddress = activeTab === "metamask" ? account : polygonAddress;
  const effectiveConnected = activeTab === "metamask" ? isConnected : isPhantomConnected;

  const form = useForm<NinFormValues>({
    resolver: zodResolver(ninSchema),
    defaultValues: {
      nin: "",
    },
  });

  // Check if the wallet already has a registered NIN whenever the wallet address changes
  useEffect(() => {
    const checkExistingNIN = async () => {
      if (!effectiveConnected || !effectiveWalletAddress) return;
      
      setLoading(true);
      try {
        const result = await getNINByWalletAddress(effectiveWalletAddress);
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
  }, [effectiveWalletAddress, effectiveConnected, activeTab]);

  const handleConnectWallet = async () => {
    if (activeTab === "metamask" && !isConnected) {
      await connect();
    } else if (activeTab === "phantom" && !isPhantomConnected) {
      await connectPhantom();
    }
  };

  const onSubmit = async (data: NinFormValues) => {
    if (!effectiveConnected || !effectiveWalletAddress) {
      setError("Please connect your wallet first.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Submit NIN to Supabase
      const result = await submitNIN(effectiveWalletAddress, data.nin);

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
        <Tabs defaultValue="metamask" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="metamask">MetaMask</TabsTrigger>
            <TabsTrigger value="phantom">Phantom</TabsTrigger>
          </TabsList>
          
          <TabsContent value="metamask">
            {!isConnected ? (
              <div className="space-y-4">
                <Alert className="mb-4 bg-yellow-50 border-yellow-200">
                  <AlertTitle>Wallet Connection Required</AlertTitle>
                  <AlertDescription>
                    Connect your MetaMask wallet to register your NIN. This is required for verification purposes.
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
                    <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 35 33" xmlns="http://www.w3.org/2000/svg">
                      <path d="M32.9582 1L17.9582 10.0000L16.9582 4.8369L32.9582 1Z" fill="#E17726" stroke="#E17726" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M2.83203 1L17.6514 10.0000L18.8329 4.8369L2.83203 1Z" fill="#E27625" stroke="#E27625" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M28.2783 23.5088L24.7334 28.7866L32.0894 30.7866L34.1761 23.6369L28.2783 23.5088Z" fill="#E27625" stroke="#E27625" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M1.62695 23.6292L3.70728 30.7789L11.0567 28.7789L7.51837 23.5011L1.62695 23.6292Z" fill="#E27625" stroke="#E27625" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                  Connect with MetaMask
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
                          <CheckCircle className="h-4 w-4 mr-1" /> Verified
                        </span>
                      ) : (
                        <span className="text-amber-600 font-medium">Pending Verification</span>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              </div>
            ) : success ? (
              <Alert className="mb-4 bg-green-50 border-green-200">
                <AlertTitle>Registration Successful</AlertTitle>
                <AlertDescription className="font-medium">
                  Your NIN has been successfully submitted and is pending verification. You can check back later to see your verification status.
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
          </TabsContent>
          
          <TabsContent value="phantom">
            {!isPhantomConnected ? (
              <div className="space-y-4">
                <Alert className="mb-4 bg-yellow-50 border-yellow-200">
                  <AlertTitle>Wallet Connection Required</AlertTitle>
                  <AlertDescription>
                    Connect your Phantom wallet to register your NIN. The wallet will be used for verification purposes.
                  </AlertDescription>
                </Alert>
                
                <PhantomWalletButton 
                  onConnect={(address) => {
                    // Pass - the useEffect will handle loading existing NIN data
                  }}
                />
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
                          <CheckCircle className="h-4 w-4 mr-1" /> Verified
                        </span>
                      ) : (
                        <span className="text-amber-600 font-medium">Pending Verification</span>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              </div>
            ) : success ? (
              <Alert className="mb-4 bg-green-50 border-green-200">
                <AlertTitle>Registration Successful</AlertTitle>
                <AlertDescription className="font-medium">
                  Your NIN has been successfully submitted and is pending verification. You can check back later to see your verification status.
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
                    <p className="font-mono text-sm truncate">{polygonAddress}</p>
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
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex flex-col space-y-2">
        <p className="text-xs text-slate-500 text-center">
          Your NIN will be securely stored and used only for verification purposes.
          {effectiveWalletAddress && (
            <>
              <br />
              Status: Connected with {activeTab === "metamask" ? "MetaMask" : "Phantom"}
            </>
          )}
        </p>
      </CardFooter>
    </Card>
  );
}