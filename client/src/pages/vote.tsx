import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { NinLoginForm } from "@/components/nin-login-form";
import { UserInfoCard } from "@/components/user-info-card";
import { CandidateGrid } from "@/components/candidate-grid";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { TransactionConfirmation } from "@/components/transaction-confirmation";
import { NoActiveElection } from "@/components/no-active-election";
import { useMetaMask } from "@/hooks/use-metamask";
import { castVote, getActiveElectionId, getElectionInfo, getAllCandidates, hashNIN, getTotalVotes } from "@/utils/blockchain";
import { checkNINSubmissionLocked, autoLockRegistrationsForActiveElection, updateNINVerificationStatus, getNINByWalletAddress } from "@/utils/supabase";
import { Lock, AlertTriangle } from "lucide-react";
import type { Candidate } from "@/types/candidate";

enum VotingStep {
  NIN_ENTRY,
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
  const [registrationLocked, setRegistrationLocked] = useState<boolean | null>(null);
  const [checkingLockStatus, setCheckingLockStatus] = useState(true);

  // Use MetaMask hook for wallet integration
  const { isConnected, connect, account } = useMetaMask();
  
  // Check if registrations are locked (for voting validation)
  useEffect(() => {
    const checkRegistrationStatus = async () => {
      try {
        setCheckingLockStatus(true);
        // Automatically lock registrations if there's an active election
        await autoLockRegistrationsForActiveElection();
        
        // Then get the current lock status
        const isLocked = await checkNINSubmissionLocked();
        setRegistrationLocked(isLocked);
      } catch (error) {
        console.error("Error checking registration lock status:", error);
        // Default to unlocked if there's an error
        setRegistrationLocked(false);
      } finally {
        setCheckingLockStatus(false);
      }
    };
    
    checkRegistrationStatus();
  }, []);

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

          // Update the voter status in Supabase database
          try {
            console.log("Updating NIN vote status in database for wallet:", account);
            // 1. Get the user record associated with this wallet
            const userDetails = await getNINByWalletAddress(account);
            
            if (userDetails) {
              // 2. Update the user's status to 'Y' (voted)
              const updateResult = await updateNINVerificationStatus(account, 'Y');
              
              if (updateResult.success) {
                console.log("Successfully updated voter status in database");
              } else {
                console.error("Failed to update voter status:", updateResult.error);
              }
            } else {
              console.error("Could not find user record for wallet:", account);
            }
          } catch (updateError) {
            console.error("Error updating voter status:", updateError);
            // Don't throw error here, as the vote was successful on the blockchain
          }

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
    // If we're still checking lock status, show a loading indicator
    if (checkingLockStatus) {
      return (
        <div className="text-center py-8">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-500">Checking registration and election status...</p>
        </div>
      );
    }
    
    // If registrations are not locked, show a warning message
    if (registrationLocked === false) {
      return (
        <Card className="max-w-3xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-amber-500" />
              Voting Unavailable
            </CardTitle>
            <CardDescription>
              The registration system is currently open. Voting is only available when registrations are locked.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="bg-amber-50 border-amber-200">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <AlertTitle>Registration system is unlocked</AlertTitle>
              <AlertDescription>
                For security reasons, voting is only allowed when the administrator has locked the registration system. 
                This ensures the integrity of the voting process.
                <br /><br />
                Please contact the election administrator or try again later when an active election is in progress.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      );
    }
    
    // Continue with normal flow when registrations are locked
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
              setCurrentStep(VotingStep.CANDIDATE_SELECTION);
            }} 
          />
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
              onSelectCandidate={(candidate) => setSelectedCandidate(candidate as Candidate)}
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