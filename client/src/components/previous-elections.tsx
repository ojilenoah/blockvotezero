import { useState, useEffect } from "react";
import { getActiveElectionId, getElectionInfo, getTotalVotes } from "@/utils/blockchain";
import { NoActiveElection } from "@/components/no-active-election";

interface Election {
  id: number;
  name: string;
  dateRange: string;
  startTime: Date;
  endTime: Date;
  status: string;
  totalVotes?: number;
}

export function PreviousElections() {
  const [previousElections, setPreviousElections] = useState<Election[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  useEffect(() => {
    const fetchPreviousElections = async () => {
      setIsLoading(true);
      try {
        const currentElectionId = await getActiveElectionId();
        const elections: Election[] = [];
        
        // Iterate through election IDs (starting from 1)
        // We'll look for the first 10 elections to avoid too many requests
        const maxElectionsToFetch = 10;
        
        for (let id = 1; id <= Math.max(currentElectionId, maxElectionsToFetch); id++) {
          // Skip the current active election
          if (id === currentElectionId) continue;
          
          const electionInfo = await getElectionInfo(id);
          
          if (electionInfo && electionInfo.name) {
            const totalVotes = await getTotalVotes(id);
            const now = new Date();
            const endTime = new Date(electionInfo.endTime);
            
            // Only include elections that have ended
            if (endTime < now) {
              elections.push({
                id,
                name: electionInfo.name,
                dateRange: `${new Date(electionInfo.startTime).toLocaleDateString()} - ${endTime.toLocaleDateString()}`,
                startTime: new Date(electionInfo.startTime),
                endTime: endTime,
                status: "Completed",
                totalVotes
              });
            }
          }
        }
        
        // Sort elections by end date, most recent first
        elections.sort((a, b) => b.endTime.getTime() - a.endTime.getTime());
        
        setPreviousElections(elections);
      } catch (error) {
        console.error("Error fetching previous elections:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPreviousElections();
  }, []);
  
  if (isLoading) {
    return (
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Previous Elections</h2>
        <div className="bg-white shadow overflow-hidden sm:rounded-md p-6 text-center text-gray-500">
          Loading previous elections...
        </div>
      </div>
    );
  }
  
  if (previousElections.length === 0) {
    return (
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Previous Elections</h2>
        <div className="bg-white shadow sm:rounded-md">
          <div className="p-6">
            <NoActiveElection
              title="No Previous Elections"
              description="There are no completed elections in the system yet."
            />
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Previous Elections</h2>
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {previousElections.map((election) => (
            <li key={election.id}>
              <a href={`/explorer?id=${election.id}`} className="block hover:bg-gray-50">
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-primary truncate">
                      {election.name}
                    </p>
                    <div className="ml-2 flex-shrink-0 flex">
                      <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        {election.status}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 sm:flex sm:justify-between">
                    <div className="sm:flex">
                      <p className="flex items-center text-sm text-gray-500">
                        <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                        </svg>
                        {election.dateRange}
                      </p>
                    </div>
                    <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                      <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <span>{election.totalVotes || 0} total votes</span>
                    </div>
                  </div>
                </div>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
