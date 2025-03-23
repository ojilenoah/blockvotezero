import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getElectionInfo, getAllCandidates, getTotalVotes, getActiveElectionId } from "@/utils/blockchain";
import { candidateColors } from "@/data/mock-data";
import { Trophy } from "lucide-react";

export function LastElectionWinner() {
  const [loading, setLoading] = useState(true);
  const [lastElection, setLastElection] = useState<{
    id: number;
    name: string;
    winner: {
      name: string;
      party: string;
      votes: number;
      percentage: number;
    } | null;
    totalVotes: number;
    endDate: Date;
  } | null>(null);

  useEffect(() => {
    const fetchLastCompletedElection = async () => {
      try {
        setLoading(true);
        // Get the next election ID (current ID + 1)
        const nextId = await getActiveElectionId();
        console.log(`[LastElectionWinner] Next election ID: ${nextId}, starting search from previous ID: ${nextId > 0 ? nextId - 1 : 0}`);
        
        // Start from the most recent election ID and search backwards
        let electionId = nextId > 0 ? nextId - 1 : 0; // Start from the most recent election
        let foundCompletedElection = false;

        // Check backwards from recent elections until we find a completed one
        while (electionId > 0 && !foundCompletedElection) {
          try {
            console.log(`[LastElectionWinner] Checking election ${electionId}`);
            const electionInfo = await getElectionInfo(electionId);
            
            if (electionInfo) {
              console.log(`[LastElectionWinner] Found election: ${electionInfo.name}`);
              const now = new Date();
              const endTime = new Date(electionInfo.endTime);
              
              // Check if this election has ended
              if (now > endTime) {
                console.log(`[LastElectionWinner] Election ${electionId} has ended, checking results`);
                const candidates = await getAllCandidates(electionId);
                const totalVotes = await getTotalVotes(electionId);
                
                if (candidates.length > 0) {
                  // Find the winner (candidate with most votes)
                  let winner = candidates[0];
                  for (let i = 1; i < candidates.length; i++) {
                    if (candidates[i].votes > winner.votes) {
                      winner = candidates[i];
                    }
                  }
                  
                  const winnerPercentage = totalVotes > 0 
                    ? Math.round((winner.votes / totalVotes) * 100) 
                    : 0;
                  
                  console.log(`[LastElectionWinner] Winner: ${winner.name} with ${winner.votes} votes (${winnerPercentage}%)`);
                  
                  setLastElection({
                    id: electionId,
                    name: electionInfo.name,
                    winner: {
                      name: winner.name,
                      party: winner.party,
                      votes: winner.votes,
                      percentage: winnerPercentage
                    },
                    totalVotes,
                    endDate: endTime
                  });
                  
                  foundCompletedElection = true;
                }
              }
            }
          } catch (error) {
            console.log(`[LastElectionWinner] Error or no data for election ${electionId}`);
          }
          
          electionId--; // Check previous election
        }
        
        if (!foundCompletedElection) {
          console.log("[LastElectionWinner] No completed elections found");
        }
      } catch (error) {
        console.error("Error fetching last election winner:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLastCompletedElection();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-md flex items-center">
            <Trophy className="w-5 h-5 mr-2 text-yellow-500" />
            Last Election Result
          </CardTitle>
          <CardDescription>Loading last election results...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-4 w-[80%]" />
            <Skeleton className="h-10 w-[90%]" />
            <Skeleton className="h-4 w-[60%]" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!lastElection) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-md flex items-center">
            <Trophy className="w-5 h-5 mr-2 text-yellow-500" />
            No Previous Elections
          </CardTitle>
          <CardDescription>
            No completed elections found. The results will be displayed here after an election ends.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }
  
  // Show a card for elections with no votes
  if (!lastElection.winner || lastElection.totalVotes === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-md flex items-center">
            <Trophy className="w-5 h-5 mr-2 text-yellow-500" />
            No Winner
          </CardTitle>
          <CardDescription>
            {lastElection.name} ended on {lastElection.endDate.toLocaleDateString()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 text-center">
            <p className="text-muted-foreground">No votes were cast in this election.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Get a consistent color for this candidate
  const colorIndex = (lastElection.winner.name.length % candidateColors.length);
  const winnerColor = candidateColors[colorIndex];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-md flex items-center">
          <Trophy className="w-5 h-5 mr-2 text-yellow-500" />
          Last Election Winner
        </CardTitle>
        <CardDescription>
          {lastElection.name} ended on {lastElection.endDate.toLocaleDateString()}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-xl font-bold">{lastElection.winner.name}</div>
              <div className="text-sm text-muted-foreground">{lastElection.winner.party}</div>
            </div>
            <div className="text-right">
              <div className="font-bold">{lastElection.winner.percentage}%</div>
              <div className="text-sm text-muted-foreground">{lastElection.winner.votes} votes</div>
            </div>
          </div>
          
          {/* Progress bar showing winner's vote percentage */}
          <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full" 
              style={{ 
                width: `${lastElection.winner.percentage}%`,
                backgroundColor: winnerColor
              }}
            />
          </div>
          
          <div className="text-xs text-muted-foreground text-right">
            Out of {lastElection.totalVotes} total votes
          </div>
        </div>
      </CardContent>
    </Card>
  );
}