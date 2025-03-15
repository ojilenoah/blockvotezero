import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Loader2, Wallet } from "lucide-react";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useMetaMask } from "@/hooks/use-metamask";
import { submitNIN } from "@/utils/supabase";
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const form = useForm<NinFormValues>({
    resolver: zodResolver(ninSchema),
    defaultValues: {
      nin: "",
    },
  });

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
        {!isConnected ? (
          <div className="space-y-4">
            <Alert className="mb-4 bg-yellow-50 border-yellow-200">
              <AlertTitle>Wallet Connection Required</AlertTitle>
              <AlertDescription>
                Connect your wallet to register your NIN. This is required for verification purposes.
              </AlertDescription>
            </Alert>
            
            <Tabs defaultValue="metamask" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="metamask">MetaMask</TabsTrigger>
                <TabsTrigger value="phantom">Phantom</TabsTrigger>
              </TabsList>
              
              <TabsContent value="metamask" className="mt-4">
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
              </TabsContent>
              
              <TabsContent value="phantom" className="mt-4">
                <PhantomWalletButton 
                  onConnect={(address) => {
                    // This simulates the MetaMask connection by setting the account
                    // We don't have a real connection function so we're directly manipulating the state
                    (window as any).ethereum = { 
                      selectedAddress: address,
                      isConnected: true
                    };
                    
                    // Force the useMetaMask hook to update by calling its connect method
                    // This is a bit of a hack, but it works for our purposes
                    handleConnectWallet();
                  }}
                />
              </TabsContent>
            </Tabs>
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
      </CardContent>
      <CardFooter className="flex flex-col space-y-2">
        <p className="text-xs text-slate-500 text-center">
          Your NIN will be securely stored and used only for verification purposes.
          <br />
          Status: {isConnected ? "Connected" : "Not Connected"}
        </p>
      </CardFooter>
    </Card>
  );
}