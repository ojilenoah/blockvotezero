import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getStatusBadge } from "@/utils/ui-helpers";
import { CONTRACT_ADDRESS } from "@/utils/blockchain";
import type { Election } from "@/utils/blockchain";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface AdminElectionLogProps {
  elections: Array<{
    id: number;
    name: string;
    startTime: string;
    endTime: string;
    status: "Active" | "Upcoming" | "Completed";
    totalVotes: number;
  }>;
  isLoading: boolean;
  itemsPerPage?: number;
}

export function AdminElectionLog({ 
  elections, 
  isLoading, 
  itemsPerPage = 4 
}: AdminElectionLogProps) {
  const [currentPage, setCurrentPage] = useState<number>(1);
  
  // Calculate pagination values
  const totalElections = elections?.length || 0;
  const totalPages = Math.ceil(totalElections / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalElections);
  const currentElections = elections?.slice(startIndex, endIndex) || [];
  
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
  
  // Format address for display
  const formatAddress = (address: string) => {
    if (!address) return "";
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Election History</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-gray-500">Loading elections from blockchain...</p>
          </div>
        ) : !elections?.length ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No elections found on the blockchain</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-200">
              {currentElections.map((election) => (
                <div className="py-4" key={election.id}>
                  <h3 className="text-lg font-medium">{election.name}</h3>
                  <p className="text-sm text-gray-500">
                    {new Date(election.startTime).toLocaleDateString()} - {new Date(election.endTime).toLocaleDateString()}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {getStatusBadge(election.status)}
                    <div className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                      {election.totalVotes} votes
                    </div>
                    <div className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                      Election ID: {election.id}
                    </div>
                    <div className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                      Contract: {formatAddress(CONTRACT_ADDRESS)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-200">
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
          </>
        )}
      </CardContent>
    </Card>
  );
}