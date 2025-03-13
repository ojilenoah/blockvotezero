
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Loader2, Plus, Trash } from "lucide-react";
import { createElection } from "../../utils/blockchain";
import { useMetaMask } from "../hooks/use-metamask";

// Define the form schema with zod
const formSchema = z.object({
  name: z.string().min(3, { message: "Election name must be at least 3 characters." }),
  startDate: z.string().min(1, { message: "Start date is required." }),
  startTime: z.string().min(1, { message: "Start time is required." }),
  endDate: z.string().min(1, { message: "End date is required." }),
  endTime: z.string().min(1, { message: "End time is required." }),
});

export function AdminElectionCreator() {
  const { toast } = useToast();
  const { isConnected } = useMetaMask();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [candidates, setCandidates] = useState<Array<{ name: string; party: string }>>([
    { name: "", party: "" },
    { name: "", party: "" },
  ]);

  // Initialize the form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      startDate: "",
      startTime: "",
      endDate: "",
      endTime: "",
    },
  });

  const addCandidate = () => {
    setCandidates([...candidates, { name: "", party: "" }]);
  };

  const removeCandidate = (index: number) => {
    if (candidates.length <= 2) {
      toast({
        title: "Cannot remove candidate",
        description: "At least two candidates are required for an election.",
        variant: "destructive",
      });
      return;
    }
    const newCandidates = [...candidates];
    newCandidates.splice(index, 1);
    setCandidates(newCandidates);
  };

  const updateCandidate = (index: number, field: "name" | "party", value: string) => {
    const newCandidates = [...candidates];
    newCandidates[index][field] = value;
    setCandidates(newCandidates);
  };

  const validateCandidates = () => {
    // Check if all candidates have names
    return candidates.every((candidate) => candidate.name.trim() !== "");
  };

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    setError(null);
    setSuccess(false);

    if (!isConnected) {
      setError("Wallet not connected. Please connect your admin wallet.");
      return;
    }

    // Validate candidates
    if (!validateCandidates()) {
      setError("All candidates must have names.");
      return;
    }

    setIsCreating(true);

    try {
      const startDateTime = new Date(`${data.startDate}T${data.startTime}`);
      const endDateTime = new Date(`${data.endDate}T${data.endTime}`);

      // Basic validation
      if (startDateTime >= endDateTime) {
        setError("End time must be after start time.");
        setIsCreating(false);
        return;
      }

      // Split candidates into names and parties arrays
      const candidateNames = candidates.map((c) => c.name);
      const candidateParties = candidates.map((c) => c.party || "Independent");

      // Call blockchain function
      const result = await createElection(
        data.name,
        startDateTime,
        endDateTime,
        candidateNames,
        candidateParties
      );

      if (result.success) {
        setSuccess(true);
        toast({
          title: "Election created successfully",
          description: `Transaction hash: ${result.transactionHash.slice(0, 10)}...`,
          variant: "default",
        });
        // Reset the form
        form.reset();
        setCandidates([
          { name: "", party: "" },
          { name: "", party: "" },
        ]);
      } else {
        setError(result.error || "Failed to create election");
      }
    } catch (err: any) {
      console.error("Error creating election:", err);
      setError(err.message || "An unexpected error occurred");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="text-2xl font-bold mb-6">Create New Election</h2>

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
              Election created successfully! It will appear in the active elections once the start time is reached.
            </AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Election Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Presidential Election 2024" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator className="my-6" />

            <div>
              <h3 className="text-lg font-semibold mb-4">Candidates</h3>
              <div className="space-y-4">
                {candidates.map((candidate, index) => (
                  <div key={index} className="grid grid-cols-5 gap-4 items-center">
                    <div className="col-span-2">
                      <Label htmlFor={`candidate-name-${index}`}>Name</Label>
                      <Input
                        id={`candidate-name-${index}`}
                        value={candidate.name}
                        onChange={(e) => updateCandidate(index, "name", e.target.value)}
                        placeholder="Candidate Name"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor={`candidate-party-${index}`}>Party (Optional)</Label>
                      <Input
                        id={`candidate-party-${index}`}
                        value={candidate.party}
                        onChange={(e) => updateCandidate(index, "party", e.target.value)}
                        placeholder="Political Party"
                      />
                    </div>
                    <div className="pt-7">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => removeCandidate(index)}
                        disabled={candidates.length <= 2}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={addCandidate}
                className="mt-4"
              >
                <Plus className="h-4 w-4 mr-2" /> Add Candidate
              </Button>
            </div>

            <div className="pt-4">
              <Button type="submit" disabled={isCreating} className="w-full">
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating Election...
                  </>
                ) : (
                  "Create Election"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
