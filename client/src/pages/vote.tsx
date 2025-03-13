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
import { useMetaMask } from "../hooks/use-metamask";
import { ethers } from "ethers";

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
  const { candidates, voterInfo } = mockElectionData;
  const isElectionActive = mockElectionData.currentElection.isActive;
  
  // Use MetaMask hook for wallet integration
  const { isConnected, connect, account, signer } = useMetaMask();

  const handleSelectCandidate = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
  };

  // Generate a random hex string of specific length
  const generateRandomHex = (length: number) => {
    return Array.from({ length }, () => 
      Math.floor(Math.random() * 16).toString(16)
    ).join("");
  };

  const handleCastVote = async () => {
    if (!selectedCandidate) return;
    
    setIsSubmitting(true);

    try {
      // If not connected to MetaMask, connect first
      if (!isConnected || !account) {
        toast({
          title: "Connecting to MetaMask",
          description: "Please approve the connection request"
        });
        
        await connect();
      }
      
      // Check if successfully connected
      if (!signer) {
        throw new Error("Unable to get signer. Please make sure your wallet is connected.");
      }
      
      toast({
        title: "Preparing transaction",
        description: "Please confirm the transaction in your wallet"
      });

      // In a real application, we would create an actual transaction to a voting smart contract
      // For this demo, we'll simulate a transaction
      
      // Generate a simulated transaction hash
      const hash = "0x" + generateRandomHex(64);
      
      const now = new Date();
      const timestamp = now.toLocaleString();
      
      // Allow some time to simulate the transaction being mined
      setTimeout(() => {
        setTransactionHash(hash);
        setTransactionTimestamp(timestamp);
        setHasVoted(true);
        setCurrentStep(VotingStep.TRANSACTION_CONFIRMATION);
        setIsSubmitting(false);
        
        toast({
          title: "Vote submitted",
          description: "Your vote has been recorded on the blockchain"
        });
      }, 1500);

    } catch (error: any) {
      console.error("Vote casting error:", error);
      setIsSubmitting(false);
      
      toast({
        title: "Error submitting vote",
        description: error.message || "There was an error connecting to your wallet",
        variant: "destructive"
      });
    }
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
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {isConnected ? "Confirming Vote..." : "Connecting..."}
                    </>
                  ) : (
                    <>
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