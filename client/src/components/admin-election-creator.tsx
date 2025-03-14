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
import { createElection } from "@/utils/blockchain";

interface AdminElectionCreatorProps {
  isElectionActive: boolean;
  hasUpcomingElection: boolean;
  electionStatus: string;
}

type Candidate = {
  id: number;
  name: string;
  party: string;
};

const electionFormSchema = z.object({
  name: z.string().min(5, { message: "Election name must be at least 5 characters" }),
  startTime: z.string().refine(date => new Date(date) > new Date(), {
    message: "Start time must be in the future",
  }),
  endTime: z.string().refine(date => new Date(date) > new Date(), {
    message: "End time must be in the future",
  }),
}).refine(data => new Date(data.endTime) > new Date(data.startTime), {
  message: "End time must be after start time",
  path: ["endTime"],
});

type ElectionFormValues = z.infer<typeof electionFormSchema>;

export function AdminElectionCreator({ isElectionActive, hasUpcomingElection, electionStatus }: AdminElectionCreatorProps) {
  const { toast } = useToast();
  const [candidates, setCandidates] = useState<Candidate[]>([
    { id: 1, name: "", party: "" },
    { id: 2, name: "", party: "" },
  ]);
  const [creationSuccess, setCreationSuccess] = useState(false);
  const [transactionHash, setTransactionHash] = useState("");

  const isDisabled = isElectionActive || hasUpcomingElection;

  const form = useForm<ElectionFormValues>({
    resolver: zodResolver(electionFormSchema),
    defaultValues: {
      name: "",
      startTime: "",
      endTime: "",
    },
  });

  const handleAddCandidate = () => {
    const newId = candidates.length > 0
      ? Math.max(...candidates.map(c => c.id)) + 1
      : 1;

    setCandidates([...candidates, { id: newId, name: "", party: "" }]);
  };

  const handleRemoveCandidate = (id: number) => {
    if (candidates.length <= 2) {
      toast({
        title: "Error",
        description: "At least two candidates are required",
        variant: "destructive",
      });
      return;
    }

    setCandidates(candidates.filter(c => c.id !== id));
  };

  const handleCandidateChange = (id: number, field: 'name' | 'party', value: string) => {
    setCandidates(
      candidates.map(c =>
        c.id === id ? { ...c, [field]: value } : c
      )
    );
  };

  const onSubmit = async (data: ElectionFormValues) => {
    // Validate candidates
    if (candidates.some(c => !c.name || !c.party)) {
      toast({
        title: "Error",
        description: "All candidate names and parties must be filled",
        variant: "destructive",
      });
      return;
    }

    const candidateNames = candidates.map(c => c.name);
    const candidateParties = candidates.map(c => c.party);

    try {
      toast({
        title: "Creating election",
        description: "Please confirm the transaction in MetaMask",
      });

      const result = await createElection(
        data.name,
        new Date(data.startTime),
        new Date(data.endTime),
        candidateNames,
        candidateParties,
      );

      if (result.success) {
        setTransactionHash(result.transactionHash);
        setCreationSuccess(true);

        // Store candidate data in localStorage for future retrieval
        // This is necessary because the smart contract doesn't provide 
        // a direct way to query candidate information after creation
        if (result.electionId) {
          const electionId = result.electionId;
          console.log(`Storing candidates for election ${electionId} in localStorage`);

          // Format candidates with index and initial vote count
          const candidatesWithMetadata = candidates.map((c, index) => ({
            name: c.name,
            party: c.party,
            votes: 0,
            index
          }));

          localStorage.setItem(
            `election_${electionId}_candidates`, 
            JSON.stringify(candidatesWithMetadata)
          );

          // Also store any transaction data
          if (result.transactionHash) {
            localStorage.setItem('lastElectionCreationTx', JSON.stringify({
              hash: result.transactionHash,
              timestamp: new Date(),
              from: result.from || "",
              to: result.to || "",
              method: "createElection",
              value: "0",
              blockNumber: result.blockNumber || 0,
              status: "Confirmed"
            }));
          }

          console.log(`Successfully stored ${candidatesWithMetadata.length} candidates for election ${electionId}`);
        }

        toast({
          title: "Election created",
          description: "Successfully deployed to blockchain",
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      console.error("Error creating election:", error);
      toast({
        title: "Error creating election",
        description: error.message || "Failed to create election on blockchain",
        variant: "destructive",
      });
    }
  };

  if (creationSuccess) {
    return (
      <div className="space-y-6">
        <Alert className="bg-green-50 border-green-200">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <AlertTitle className="text-green-800">Election Created Successfully</AlertTitle>
          </div>
          <AlertDescription className="mt-3 text-green-700">
            <p>Your election has been successfully created and deployed to the blockchain.</p>
            <div className="mt-3">
              <p className="font-semibold">Transaction Hash:</p>
              <p className="font-mono text-xs break-all bg-white p-2 rounded border border-green-200 mt-1">
                {transactionHash}
              </p>
            </div>
          </AlertDescription>
          <div className="mt-4">
            <Button onClick={() => {
              setCreationSuccess(false);
              form.reset();
              setCandidates([
                { id: 1, name: "", party: "" },
                { id: 2, name: "", party: "" },
              ]);
            }}>
              Create Another Election
            </Button>
          </div>
        </Alert>
      </div>
    );
  }

  return (
    <div>
      {(isElectionActive || hasUpcomingElection) && (
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>Cannot Create New Election</AlertTitle>
          <AlertDescription>
            {isElectionActive
              ? "An election is currently active. Please wait for it to end before creating a new one."
              : "There is an upcoming election scheduled. Only one election can be scheduled at a time."}
          </AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Election Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. 2023 Community Council Election" {...field} disabled={isDisabled} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date & Time</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} disabled={isDisabled} />
                    </FormControl>
                    <FormDescription>
                      When voting begins
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date & Time</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} disabled={isDisabled} />
                    </FormControl>
                    <FormDescription>
                      When voting ends
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <Separator className="my-6" />

          <div>
            <h3 className="text-lg font-medium mb-4">Candidates</h3>
            <div className="space-y-4">
              {candidates.map(candidate => (
                <Card key={candidate.id} className="bg-gray-50">
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-medium">Candidate #{candidate.id}</h4>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveCandidate(candidate.id)}
                        disabled={isDisabled}
                      >
                        Remove
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <Label htmlFor={`candidate-${candidate.id}-name`}>Candidate Name</Label>
                        <Input
                          id={`candidate-${candidate.id}-name`}
                          placeholder="Full name"
                          value={candidate.name}
                          onChange={(e) => handleCandidateChange(candidate.id, 'name', e.target.value)}
                          disabled={isDisabled}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`candidate-${candidate.id}-party`}>Party Affiliation</Label>
                        <Input
                          id={`candidate-${candidate.id}-party`}
                          placeholder="Party name"
                          value={candidate.party}
                          onChange={(e) => handleCandidateChange(candidate.id, 'party', e.target.value)}
                          disabled={isDisabled}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              <Button
                type="button"
                variant="outline"
                onClick={handleAddCandidate}
                disabled={isDisabled}
                className="w-full"
              >
                Add Another Candidate
              </Button>
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" size="lg" disabled={isDisabled}>
              Create Election
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}