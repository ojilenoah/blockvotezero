import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { NinLoginForm } from "@/components/nin-login-form";
import { LivenessCheck } from "@/components/liveness-check";
import { UserInfoCard } from "@/components/user-info-card";
import { CandidateGrid } from "@/components/candidate-grid";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { TransactionConfirmation } from "@/components/transaction-confirmation";
import { NoActiveElection } from "@/components/no-active-election";
import { useMetaMask } from "@/hooks/use-metamask";
import { castVote, getActiveElectionId, getElectionInfo, getAllCandidates, hashNIN, getTotalVotes } from "@/utils/blockchain";
import type { Candidate } from "@/types/candidate";

enum VotingStep {
  NIN_ENTRY,
  LIVENESS_CHECK,
  CANDIDATE_SELECTION,
  TRANSACTION_CONFIRMATION
}

export default function Vote() {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(VotingStep.NIN_ENTRY);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transactionHash, setTransactionHash] = useState("");
  const [transactionTimestamp, setTransactionTimestamp] = useState("");
  const [voterNIN, setVoterNIN] = useState<string>("");

  // Use MetaMask hook for wallet integration
  const { isConnected, connect, account } = useMetaMask();

  // Only fetch election data after NIN verification
  const { data: electionData, isLoading: loadingElection } = useQuery({
    queryKey: ['activeElection'],
    queryFn: async () => {
      try {
        // Get next election ID
        const nextId = await getActiveElectionId();
        if (!nextId) return null;

        // Look backwards from current ID to find the most recent valid election
        for (let id = nextId - 1; id >= 1; id--) {
          try {
            const electionInfo = await getElectionInfo(id);
            if (electionInfo?.name) {
              const candidates = await getAllCandidates(id);
              const totalVotes = await getTotalVotes(id);

              // Calculate if election is active based on time
              const now = new Date();
              const startTime = new Date(electionInfo.startTime);
              const endTime = new Date(electionInfo.endTime);
              const isActive = now >= startTime && now <= endTime;

              // Only return if the election is active
              if (isActive && electionInfo.active) {
                return {
                  id,
                  name: electionInfo.name,
                  startTime,
                  endTime,
                  candidates: candidates.map(candidate => ({
                    ...candidate,
                    percentage: totalVotes > 0 ? Math.round((candidate.votes / totalVotes) * 100) : 0
                  })),
                  totalVotes
                };
              }
            }
          } catch (error) {
            console.error(`Error checking election ${id}:`, error);
            continue;
          }
        }
        return null;
      } catch (error) {
        console.error("Error fetching election data:", error);
        return null;
      }
    },
    enabled: currentStep === VotingStep.CANDIDATE_SELECTION, // Only fetch when reaching candidate selection
    staleTime: 30000,
    refetchInterval: 60000
  });

  const handleSelectCandidate = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
  };

  const handleCastVote = async () => {
    if (!selectedCandidate || !electionData?.id) return;

    setIsSubmitting(true);

    try {
      if (!isConnected) {
        await connect();
      }

      if (isConnected && account) {
        const voterNINHash = await hashNIN(voterNIN);

        const result = await castVote(
          electionData.id,
          selectedCandidate.index,
          voterNINHash
        );

        if (result.success && result.transactionHash) {
          setTransactionHash(result.transactionHash);
          setTransactionTimestamp(new Date().toLocaleString());
          setHasVoted(true);
          setCurrentStep(VotingStep.TRANSACTION_CONFIRMATION);

          toast({
            title: "Vote submitted",
            description: "Your vote has been recorded on the blockchain"
          });
        } else {
          throw new Error(result.error);
        }
      }
    } catch (error: any) {
      console.error("Vote casting error:", error);
      toast({
        title: "Error submitting vote",
        description: error.message || "There was an error connecting to your wallet",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render different content based on step
  const renderContent = () => {
    if (hasVoted) {
      return (
        <TransactionConfirmation
          transactionHash={transactionHash}
          candidateName={selectedCandidate?.name || ""}
          timestamp={transactionTimestamp}
        />
      );
    }

    switch (currentStep) {
      case VotingStep.NIN_ENTRY:
        return (
          <NinLoginForm 
            onComplete={(nin: string) => {
              setVoterNIN(nin);
              setCurrentStep(VotingStep.LIVENESS_CHECK);
            }} 
          />
        );

      case VotingStep.LIVENESS_CHECK:
        return (
          <LivenessCheck onComplete={() => setCurrentStep(VotingStep.CANDIDATE_SELECTION)} />
        );

      case VotingStep.CANDIDATE_SELECTION:
        if (loadingElection) {
          return (
            <div className="text-center py-8">
              <p className="text-gray-500">Loading election data...</p>
            </div>
          );
        }

        if (!electionData) {
          return <NoActiveElection />;
        }

        return (
          <div className="space-y-6 max-w-6xl mx-auto">
            <UserInfoCard userInfo={{ nin: voterNIN }} />

            <div className="mb-4">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Select a Candidate</h2>
              <p className="text-gray-600">Choose one candidate from the list below</p>
            </div>

            <CandidateGrid
              candidates={electionData.candidates}
              onSelectCandidate={handleSelectCandidate}
              selectedCandidateId={selectedCandidate?.index || null}
            />

            {selectedCandidate && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
                <div>
                  <h3 className="text-sm font-medium">Ready to cast your vote for:</h3>
                  <p className="font-semibold text-lg">{selectedCandidate.name} ({selectedCandidate.party})</p>
                </div>
                <Button
                  size="lg"
                  onClick={handleCastVote}
                  className="w-full sm:w-auto"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Submitting...
                    </>
                  ) : (
                    <>
                      {isConnected ? "Cast Vote" : "Connect Wallet & Cast Vote"}
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        );

      default:
        return <div>Unknown step</div>;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {renderContent()}
        </div>
      </main>

      <Footer />
    </div>
  );
}