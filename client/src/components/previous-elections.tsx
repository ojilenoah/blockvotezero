import { useState, useEffect } from "react";
import { getActiveElectionId, getElectionInfo, getTotalVotes } from "@/utils/blockchain";
import { NoActiveElection } from "@/components/no-active-election";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Election {
  id: number;
  name: string;
  dateRange: string;
  startTime: Date;
  endTime: Date;
  status: string;
  totalVotes?: number;
}

interface PreviousElectionsProps {
  title?: string;
  itemsPerPage?: number;
}

export function PreviousElections({ 
  title = "Previous Elections",
  itemsPerPage = 4 
}: PreviousElectionsProps) {
  const [previousElections, setPreviousElections] = useState<Election[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  
  // Calculate pagination values
  const totalElections = previousElections.length;
  const totalPages = Math.ceil(totalElections / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalElections);
  const currentElections = previousElections.slice(startIndex, endIndex);
  
  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };
  
  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };
  
  useEffect(() => {
    const fetchPreviousElections = async () => {
      setIsLoading(true);
      try {
        const currentElectionId = await getActiveElectionId();
        const elections: Election[] = [];
        
        // Optimized batch loading - get latest elections first working backwards
        const maxElectionsToCheck = Math.min(currentElectionId - 1, 15); // Limit to 15 to improve speed
        
        // Use Promise.allSettled for parallel requests to improve speed
        const electionPromises = [];
        for (let id = Math.max(1, currentElectionId - maxElectionsToCheck); id < currentElectionId; id++) {
          electionPromises.push(
            Promise.allSettled([
              getElectionInfo(id),
              getTotalVotes(id)
            ]).then(([electionResult, votesResult]) => {
              if (electionResult.status === 'fulfilled' && electionResult.value?.name) {
                const electionInfo = electionResult.value;
                const totalVotes = votesResult.status === 'fulfilled' ? votesResult.value : 0;
                const now = new Date();
                const endTime = new Date(electionInfo.endTime);
                
                // Only include elections that have ended
                if (endTime < now) {
                  return {
                    id,
                    name: electionInfo.name,
                    dateRange: `${new Date(electionInfo.startTime).toLocaleDateString()} - ${endTime.toLocaleDateString()}`,
                    startTime: new Date(electionInfo.startTime),
                    endTime: endTime,
                    status: "Completed",
                    totalVotes
                  };
                }
              }
              return null;
            })
          );
        }
        
        const results = await Promise.all(electionPromises);
        const validElections = results.filter(election => election !== null) as Election[];
        elections.push(...validElections);
        
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
        <h2 className="text-xl font-semibold text-gray-900 mb-4">{title}</h2>
        <div className="bg-white shadow overflow-hidden sm:rounded-md p-6 text-center text-gray-500">
          Loading previous elections...
        </div>
      </div>
    );
  }
  
  if (previousElections.length === 0) {
    return (
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">{title}</h2>
        <div className="bg-white shadow sm:rounded-md">
          <div className="p-6">
            <NoActiveElection
              title="No Previous Elections"
              description="No elections have been completed yet."
              showSchedule={false}
              showButtons={false}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">{title}</h2>
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {currentElections.map((election) => (
            <li key={election.id} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900">{election.name}</h3>
                  <p className="text-sm text-gray-500">{election.dateRange}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Total Votes: {election.totalVotes || 0}
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {election.status}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
      
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-gray-700">
            Showing {startIndex + 1} to {endIndex} of {totalElections} elections
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevPage}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}