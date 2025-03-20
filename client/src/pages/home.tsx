import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/navbar";
import { ElectionStatus } from "@/components/election-status";
import { ElectionInfoCard } from "@/components/election-info-card";
import { LastElectionWinner } from "@/components/last-election-winner";
import { PreviousElections } from "@/components/previous-elections";
import { BlockchainTransparency } from "@/components/blockchain-transparency";
import { Footer } from "@/components/footer";
import { getActiveElectionId, getElectionInfo } from "@/utils/blockchain";

export default function Home() {
  const [hasActiveElection, setHasActiveElection] = useState(false);

  // Query to check if there's an active election
  const { data: activeElectionData } = useQuery({
    queryKey: ['activeElectionCheck'],
    queryFn: async () => {
      try {
        // Get current election ID
        const nextId = await getActiveElectionId();
        
        if (!nextId) {
          return false;
        }

        // Look backwards from current ID to find active elections
        for (let id = nextId - 1; id >= 1; id--) {
          try {
            const electionInfo = await getElectionInfo(id);
            
            if (electionInfo?.name) {
              const now = new Date();
              const startTime = new Date(electionInfo.startTime);
              const endTime = new Date(electionInfo.endTime);
              const isActive = now >= startTime && now <= endTime;
              
              // If election is active, return true
              if (isActive && electionInfo.active) {
                return true;
              }
            }
          } catch (error) {
            continue;
          }
        }
        
        return false;
      } catch (error) {
        console.error("Error checking for active elections:", error);
        return false;
      }
    },
    staleTime: 60000,  // Re-check every minute
    refetchInterval: 60000
  });

  // Update state when data changes
  useEffect(() => {
    if (activeElectionData !== undefined) {
      setHasActiveElection(activeElectionData);
    }
  }, [activeElectionData]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <ElectionStatus />
          
          {/* Election info card in a grid layout */}
          <div className={`grid ${!hasActiveElection ? 'md:grid-cols-2' : ''} gap-6 mb-8`}>
            <ElectionInfoCard />
            {/* Show LastElectionWinner only when there's no active election */}
            {!hasActiveElection && <LastElectionWinner />}
          </div>
          
          <PreviousElections />
          <BlockchainTransparency />
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
