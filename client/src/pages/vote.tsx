import { useState } from "react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { NinLoginForm } from "@/components/nin-login-form";
import { LivenessCheck } from "@/components/liveness-check";
import { UserInfoCard } from "@/components/user-info-card";
import { CandidateGrid, Candidate } from "@/components/candidate-grid";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { TransactionConfirmation } from "@/components/transaction-confirmation";
import { NoActiveElection } from "@/components/no-active-election";
import { mockElectionData } from "@/data/mock-data";

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
  const [transactionHash, setTransactionHash] = useState("");
  const [transactionTimestamp, setTransactionTimestamp] = useState("");
  const { candidates, voterInfo } = mockElectionData;
  const isElectionActive = mockElectionData.currentElection.isActive;

  const handleSelectCandidate = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
  };

  const handleCastVote = () => {
    if (!selectedCandidate) return;

    toast({
      title: "Connecting to MetaMask",
      description: "Please confirm the transaction in your wallet"
    });

    // Simulate MetaMask transaction delay
    setTimeout(() => {
      // Generate a simulated transaction hash
      const hash = "0x" + Array.from({ length: 64 }, () => 
        Math.floor(Math.random() * 16).toString(16)
      ).join("");
      
      const now = new Date();
      const timestamp = now.toLocaleString();
      
      setTransactionHash(hash);
      setTransactionTimestamp(timestamp);
      setHasVoted(true);
      setCurrentStep(VotingStep.TRANSACTION_CONFIRMATION);
      
      toast({
        title: "Vote submitted",
        description: "Your vote has been recorded on the blockchain"
      });
    }, 2000);
  };

  // Render different content based on step
  const renderContent = () => {
    if (!isElectionActive) {
      return <NoActiveElection />;
    }

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
          <NinLoginForm onComplete={() => setCurrentStep(VotingStep.LIVENESS_CHECK)} />
        );
      
      case VotingStep.LIVENESS_CHECK:
        return (
          <LivenessCheck onComplete={() => setCurrentStep(VotingStep.CANDIDATE_SELECTION)} />
        );
      
      case VotingStep.CANDIDATE_SELECTION:
        return (
          <div className="space-y-6 max-w-6xl mx-auto">
            <UserInfoCard userInfo={voterInfo} />
            
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Select a Candidate</h2>
              <p className="text-gray-600">Choose one candidate from the list below</p>
            </div>
            
            <CandidateGrid 
              candidates={candidates} 
              onSelectCandidate={handleSelectCandidate}
              selectedCandidateId={selectedCandidate?.id || null}
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
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 mr-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                  Connect Wallet & Cast Vote
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