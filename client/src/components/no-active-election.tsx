import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { getActiveElectionId, getElectionInfo } from "@/utils/blockchain";

interface NoActiveElectionProps {
  title?: string;
  description?: string;
  showSchedule?: boolean;
  showButtons?: boolean;
}

interface ScheduledElection {
  id: number;
  name: string;
  startTime: Date;
  endTime: Date;
}

export function NoActiveElection({ 
  title = "No Active Elections",
  description = "There are no elections currently open for voting",
  showSchedule = true,
  showButtons = true
}: NoActiveElectionProps) {
  const [scheduledElections, setScheduledElections] = useState<ScheduledElection[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Fetch upcoming elections that are scheduled but not yet started
  useEffect(() => {
    if (!showSchedule) return;

    const fetchScheduledElections = async () => {
      setIsLoading(true);
      try {
        const currentElectionId = await getActiveElectionId();
        const elections: ScheduledElection[] = [];
        
        // Iterate through election IDs to find scheduled elections
        // We'll look through the first 10 possible IDs
        const maxElectionsToFetch = 10;
        
        for (let id = 1; id <= Math.max(currentElectionId, maxElectionsToFetch); id++) {
          const electionInfo = await getElectionInfo(id);
          
          if (electionInfo && electionInfo.name) {
            const now = new Date();
            const startTime = new Date(electionInfo.startTime);
            
            // Only include elections that haven't started yet
            if (startTime > now) {
              elections.push({
                id,
                name: electionInfo.name,
                startTime,
                endTime: new Date(electionInfo.endTime)
              });
            }
          }
        }
        
        // Sort elections by start date (ascending)
        elections.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
        
        setScheduledElections(elections);
      } catch (error) {
        console.error("Error fetching scheduled elections:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchScheduledElections();
  }, [showSchedule]);

  return (
    <Card className="text-center max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        </div>
        <CardTitle className="text-xl">{title}</CardTitle>
        <CardDescription>
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-sm text-muted-foreground max-w-md mx-auto">
          <p>
            There are no active elections at this time. Elections are typically
            announced several weeks in advance through official channels.
          </p>
        </div>

        {showSchedule && (
          <div className="bg-primary/5 border border-primary/10 rounded-md p-4 text-sm">
            <h3 className="font-medium mb-2">Next scheduled elections:</h3>
            
            {isLoading ? (
              <p className="text-center text-gray-500 py-2">Loading scheduled elections...</p>
            ) : scheduledElections.length > 0 ? (
              <ul className="space-y-2">
                {scheduledElections.map((election) => (
                  <li key={election.id} className="flex items-start">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 mr-2 text-primary/70 flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <div>
                      <strong>{election.name}</strong>
                      <div className="text-muted-foreground">
                        {election.startTime.toLocaleDateString()} - {election.endTime.toLocaleDateString()}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-center text-gray-500 py-2">No scheduled elections at this time.</p>
            )}
          </div>
        )}

        {showButtons && (
          <div className="flex justify-center space-x-4">
            <Link href="/explorer">
              <Button variant="outline">
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
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                View Past Elections
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}