import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useMetaMask } from "../hooks/use-metamask";

interface AdminManagementProps {
  currentAddress: string;
}

const walletAddressSchema = z.object({
  address: z.string()
    .min(10, { message: "Wallet address is too short" })
    .startsWith("0x", { message: "Address must start with 0x" })
});

type WalletAddressValues = z.infer<typeof walletAddressSchema>;

export function AdminManagement({ currentAddress }: AdminManagementProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [signatureError, setSignatureError] = useState<string | null>(null);
  
  // Use the MetaMask hook for signature verification
  const { account, signMessage } = useMetaMask();
  
  const form = useForm<WalletAddressValues>({
    resolver: zodResolver(walletAddressSchema),
    defaultValues: {
      address: "",
    },
  });
  
  const onSubmit = async (data: WalletAddressValues) => {
    setIsSubmitting(true);
    setSignatureError(null);
    
    if (!account) {
      setSignatureError("No wallet connected. Please connect your wallet first.");
      setIsSubmitting(false);
      return;
    }
    
    // Message to sign includes data to prevent replay attacks
    const messageToSign = `I authorize changing the admin address to ${data.address} from ${currentAddress}. Timestamp: ${Date.now()}`;
    
    toast({
      title: "MetaMask Signature Required",
      description: "Please sign the message to confirm this admin change",
    });
    
    try {
      // Request signature from MetaMask
      const signature = await signMessage(messageToSign);
      
      if (signature) {
        // In a real application, you would send the signature, message, and new address to the backend
        // for verification and storage. Here we just simulate a successful update.
        setIsSubmitting(false);
        setSuccess(true);
        
        toast({
          title: "Admin updated",
          description: `Admin wallet changed to ${data.address}`,
        });
        
        // Update the session storage with the new admin address
        sessionStorage.setItem("adminAddress", data.address);
      } else {
        throw new Error("Failed to get signature");
      }
    } catch (error: any) {
      setIsSubmitting(false);
      setSignatureError(error.message || "Failed to sign the message. Please try again.");
      
      toast({
        title: "Signature Failed",
        description: "Failed to sign admin change request",
        variant: "destructive"
      });
    }
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-2">Current Admin</h3>
        <div className="p-3 bg-gray-50 rounded border border-gray-200">
          <span className="font-mono">{currentAddress}</span>
        </div>
      </div>
      
      {success && (
        <Alert className="bg-green-50 border-green-200">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <AlertTitle className="text-green-800">Admin Updated Successfully</AlertTitle>
          </div>
          <AlertDescription className="mt-3 text-green-700">
            <p>The admin wallet address has been updated successfully.</p>
            <p className="mt-2">The new admin will need to login with the updated wallet.</p>
          </AlertDescription>
          <div className="mt-4">
            <Button onClick={() => {
              setSuccess(false);
              form.reset();
            }}>
              Make Another Change
            </Button>
          </div>
        </Alert>
      )}
      
      {!success && (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Alert className="bg-amber-50 border-amber-200">
              <AlertTitle className="text-amber-800">Security Warning</AlertTitle>
              <AlertDescription className="text-amber-700">
                Changing the admin wallet address will transfer all administrative rights to the new wallet. 
                This operation requires MetaMask signature confirmation.
              </AlertDescription>
            </Alert>
            
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Admin Wallet Address</FormLabel>
                  <FormControl>
                    <Input placeholder="0x..." {...field} />
                  </FormControl>
                  <FormDescription>
                    Enter the Ethereum wallet address that should be granted admin privileges
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Confirming..." : "Update Admin Address"}
              </Button>
            </div>
          </form>
        </Form>
      )}
    </div>
  );
}