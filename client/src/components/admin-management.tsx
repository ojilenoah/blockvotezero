
import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Loader2 } from "lucide-react";
import { changeAdmin } from "../../utils/blockchain";
import { useAdmin } from "../hooks/use-admin";
import { useMetaMask } from "../hooks/use-metamask";

const formSchema = z.object({
  newAdminAddress: z
    .string()
    .min(42, { message: "Admin address must be a valid Ethereum address." })
    .max(42, { message: "Admin address must be a valid Ethereum address." })
    .regex(/^0x[a-fA-F0-9]{40}$/, { 
      message: "Must be a valid Ethereum address starting with 0x." 
    }),
});

export function AdminManagement() {
  const { toast } = useToast();
  const { isAdmin, adminAddress } = useAdmin();
  const { isConnected } = useMetaMask();
  const [isChanging, setIsChanging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      newAdminAddress: "",
    },
  });

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    setError(null);
    setSuccess(false);

    if (!isConnected) {
      setError("Wallet not connected. Please connect your admin wallet.");
      return;
    }

    if (!isAdmin) {
      setError("You don't have admin permissions to perform this action.");
      return;
    }

    setIsChanging(true);

    try {
      // Call blockchain function
      const result = await changeAdmin(data.newAdminAddress);

      if (result.success) {
        setSuccess(true);
        toast({
          title: "Admin changed successfully",
          description: `Transaction hash: ${result.transactionHash.slice(0, 10)}...`,
          variant: "default",
        });
        // Reset the form
        form.reset();
      } else {
        setError(result.error || "Failed to change admin");
      }
    } catch (err: any) {
      console.error("Error changing admin:", err);
      setError(err.message || "An unexpected error occurred");
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="text-2xl font-bold mb-6">Admin Management</h2>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-6 bg-green-50 border-green-500 text-green-700">
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>
              Admin privileges transferred successfully! The new admin will need to connect their wallet to access admin features.
            </AlertDescription>
          </Alert>
        )}

        <div className="mb-6">
          <h3 className="text-md font-semibold mb-2">Current Admin</h3>
          <div className="bg-gray-100 p-3 rounded-md font-mono text-sm break-all">
            {adminAddress || "Not connected"}
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="newAdminAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Admin Address</FormLabel>
                  <FormControl>
                    <Input placeholder="0x..." {...field} />
                  </FormControl>
                  <FormDescription>
                    Enter the Ethereum address of the new admin. This will transfer all admin privileges.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="pt-4">
              <Button type="submit" disabled={isChanging} className="w-full">
                {isChanging ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Transferring Admin Rights...
                  </>
                ) : (
                  "Transfer Admin Rights"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
