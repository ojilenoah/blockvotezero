import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Wallet, AlertCircle } from "lucide-react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { useMetaMask } from "@/hooks/use-metamask";
import { getNINByWalletAddress } from "@/utils/supabase";

const formSchema = z.object({
  nin: z
    .string()
    .min(11, { message: "NIN must be 11 digits" })
    .max(11, { message: "NIN must be 11 digits" })
    .regex(/^\d+$/, { message: "NIN must contain only numbers" }),
});

interface NinLoginFormProps {
  onComplete: (nin: string) => void;
}

export function NinLoginForm({ onComplete }: NinLoginFormProps) {
  const { toast } = useToast();
  const { isConnected, account, connect } = useMetaMask();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nin: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!isConnected || !account) {
      setError("Please connect your wallet first");
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      // Get NIN data for this address
      const userNINData = await getNINByWalletAddress(account);
      
      if (!userNINData) {
        setError("No NIN registration found for this wallet address. Please register your NIN first.");
        return;
      }
      
      // Check if NIN matches what's in the database
      if (userNINData.nin !== values.nin) {
        setError("The NIN entered doesn't match the NIN registered with this wallet address.");
        return;
      }
      
      // Check if user has already voted
      if (userNINData.status === 'Y') {
        setError("You have already voted in this election with this NIN.");
        return;
      }
      
      // All checks passed, move to next step
      toast({
        title: "Verification successful",
        description: "You can now proceed to vote",
      });
      
      // Move to the next step and pass the NIN
      onComplete(values.nin);
    } catch (err: any) {
      console.error("Error verifying NIN:", err);
      setError(err.message || "Failed to verify NIN. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Voter Verification</CardTitle>
        <CardDescription>Connect your wallet and enter your National Identification Number to vote</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isConnected ? (
          <div className="space-y-4">
            <Alert className="bg-yellow-50 border-yellow-200">
              <AlertTitle>Wallet Connection Required</AlertTitle>
              <AlertDescription>
                Connect your wallet to proceed with voter verification.
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
        ) : (
          <>
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="bg-slate-50 p-3 rounded-md mb-4">
              <p className="text-sm text-slate-700 mb-1">Connected Wallet:</p>
              <p className="font-mono text-sm truncate">{account}</p>
            </div>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="nin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>National Identification Number (NIN)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter 11-digit NIN"
                          {...field}
                          maxLength={11}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Continue to Vote"
                  )}
                </Button>
              </form>
            </Form>
          </>
        )}
      </CardContent>
      <CardFooter className="text-xs text-slate-500 text-center">
        Your NIN will be verified against our database to ensure your voter eligibility.
      </CardFooter>
    </Card>
  );
}