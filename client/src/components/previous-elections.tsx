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
        
        // Iterate through election IDs (starting from 1)
        // We'll look for the first 20 elections to avoid too many requests but ensure we have enough for pagination
        const maxElectionsToFetch = 20;
        
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
              description="There are no completed elections in the system yet."
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
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 text-xs sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handlePrevPage} 
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleNextPage} 
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{startIndex + 1}</span> to{" "}
                  <span className="font-medium">{endIndex}</span> of{" "}
                  <span className="font-medium">{totalElections}</span> elections
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <Button
                    variant="outline"
                    size="sm"
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border text-sm font-medium"
                    onClick={handlePrevPage}
                    disabled={currentPage === 1}
                  >
                    <span className="sr-only">Previous</span>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  {Array.from({ length: totalPages }).map((_, index) => (
                    <Button
                      key={index}
                      variant={currentPage === index + 1 ? "default" : "outline"}
                      size="sm"
                      className="relative inline-flex items-center px-4 py-2 text-sm font-medium"
                      onClick={() => setCurrentPage(index + 1)}
                    >
                      {index + 1}
                    </Button>
                  ))}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border text-sm font-medium"
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                  >
                    <span className="sr-only">Next</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
