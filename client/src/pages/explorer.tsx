import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getActiveElectionId,
  getElectionInfo,
  getAllCandidates,
  getTotalVotes,
  CONTRACT_ADDRESS,
  ALCHEMY_URL,
  type Transaction
} from "@/utils/blockchain";
import { useMetaMask } from "@/hooks/use-metamask";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ethers } from "ethers";
import VotingSystemABI from "../contracts/VotingSystem.json";

interface Election {
  id: number;
  name: string;
  startTime: Date;
  endTime: Date;
  status: "Active" | "Upcoming" | "Completed";
  totalVotes: number;
}

export default function Explorer() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(4); // Show 4 elections per page
  const { chainId } = useMetaMask();
  const { toast } = useToast();

  // Query for getting elections data
  const { data: electionData, isLoading: loadingElections } = useQuery({
    queryKey: ['elections'],
    queryFn: async () => {
      const currentElectionId = await getActiveElectionId();
      const electionList: Election[] = [];
      let totalVotesCount = 0;

      // Lookup up to the first 10 possible election IDs
      const maxElectionsToFetch = 10;

      for (let id = 1; id <= Math.max(currentElectionId, maxElectionsToFetch); id++) {
        try {
          const electionInfo = await getElectionInfo(id);

          if (electionInfo && electionInfo.name) {
            const now = new Date();
            const startTime = electionInfo.startTime;
            const endTime = electionInfo.endTime;
            let status: "Active" | "Upcoming" | "Completed" = "Completed";

            if (now < startTime) {
              status = "Upcoming";
            } else if (now >= startTime && now <= endTime) {
              status = "Active";
            }

            const votes = await getTotalVotes(id);
            totalVotesCount += votes;

            electionList.push({
              id,
              name: electionInfo.name,
              startTime,
              endTime,
              status,
              totalVotes: votes
            });
          }
        } catch (err) {
          console.error(`Error fetching election ${id}:`, err);
        }
      }

      return {
        elections: electionList.sort((a, b) => {
          if (a.status !== b.status) {
            const statusOrder = { Active: 0, Upcoming: 1, Completed: 2 };
            return statusOrder[a.status] - statusOrder[b.status];
          }
          return a.status === "Completed"
            ? b.endTime.getTime() - a.endTime.getTime()
            : a.startTime.getTime() - b.startTime.getTime();
        }),
        statistics: {
          totalElections: electionList.length,
          totalVotes: totalVotesCount,
          activeElections: electionList.filter(e => e.status === "Active").length,
          completedElections: electionList.filter(e => e.status === "Completed").length,
          upcomingElections: electionList.filter(e => e.status === "Upcoming").length,
          currentElectionId: currentElectionId
        }
      };
    },
    staleTime: 30000, // Consider data fresh for 30 seconds
    refetchInterval: 60000, // Only refetch every minute
  });

  // State for transaction pagination
  const [currentTxPage, setCurrentTxPage] = useState<number>(1);
  const [txPerPage] = useState<number>(10);
  
  // Query for getting transaction data - using the same approach as elections
  const { data: transactions, isLoading: loadingTransactions, isFetching } = useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      console.log("Fetching transactions directly using election data approach");
      
      // Get the current active election ID to know how many elections to check
      const currentElectionId = await getActiveElectionId();
      console.log("Current election ID:", currentElectionId);
      
      const allTransactions: Transaction[] = [];
      
      // For each election, get its creation transaction and votes
      for (let id = 1; id <= Math.max(currentElectionId, 10); id++) {
        try {
          // 1. Get the election info first to check if it exists
          const electionInfo = await getElectionInfo(id);
          
          if (electionInfo && electionInfo.name) {
            console.log(`Found election ${id}: ${electionInfo.name}`);
            
            // Get the provider
            const provider = new ethers.JsonRpcProvider(ALCHEMY_URL);
            const contract = new ethers.Contract(CONTRACT_ADDRESS, VotingSystemABI.abi, provider);
            
            try {
              // 2. Find the creation transaction for this election
              const createFilter = contract.filters.ElectionCreated(id);
              const createEvents = await contract.queryFilter(createFilter);
              
              if (createEvents.length > 0) {
                const event = createEvents[0]; // Get the first matching event
                const tx = await provider.getTransaction(event.transactionHash);
                const receipt = await provider.getTransactionReceipt(event.transactionHash);
                const block = await provider.getBlock(event.blockNumber);
                
                if (tx && receipt && block) {
                  const blockTimestamp = block.timestamp ? Number(block.timestamp) * 1000 : Date.now();
                  
                  allTransactions.push({
                    hash: event.transactionHash,
                    timestamp: new Date(blockTimestamp),
                    from: tx.from || "",
                    to: CONTRACT_ADDRESS,
                    method: "createElection",
                    value: tx.value.toString(),
                    blockNumber: event.blockNumber,
                    status: receipt.status === 1 ? "Confirmed" : "Failed"
                  });
                }
              }
              
              // 3. Find all vote transactions for this election
              const voteFilter = contract.filters.VoteCast(id);
              const voteEvents = await contract.queryFilter(voteFilter);
              
              for (const event of voteEvents) {
                const tx = await provider.getTransaction(event.transactionHash);
                const receipt = await provider.getTransactionReceipt(event.transactionHash);
                const block = await provider.getBlock(event.blockNumber);
                
                if (tx && receipt && block) {
                  const blockTimestamp = block.timestamp ? Number(block.timestamp) * 1000 : Date.now();
                  
                  allTransactions.push({
                    hash: event.transactionHash,
                    timestamp: new Date(blockTimestamp),
                    from: tx.from || "",
                    to: CONTRACT_ADDRESS,
                    method: "castVote",
                    value: "0",
                    blockNumber: event.blockNumber,
                    status: receipt.status === 1 ? "Confirmed" : "Failed"
                  });
                }
              }
            } catch (error) {
              console.error(`Error getting transactions for election ${id}:`, error);
            }
          }
        } catch (err) {
          console.error(`Error processing election ${id}:`, err);
        }
      }
      
      // Sort transactions by block number (newest first)
      allTransactions.sort((a, b) => b.blockNumber - a.blockNumber);
      
      console.log(`Found a total of ${allTransactions.length} transactions`);
      
      return {
        transactions: allTransactions,
        hasMore: false, // No need for pagination since we load all at once
        totalTransactions: allTransactions.length
      };
    },
    staleTime: 30000, // Consider data fresh for 30 seconds
    refetchInterval: 60000, // Only refetch every minute
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setTimeout(() => {
      setIsSearching(false);
      toast({
        title: "Search Not Implemented",
        description: "This search functionality would require a blockchain indexer which is not connected in this demo.",
        variant: "destructive"
      });
    }, 1000);
  };

  // Helper to get status badge based on election status
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Active":
        return <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Active</div>;
      case "Completed":
        return <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Completed</div>;
      case "Upcoming":
        return <div className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Upcoming</div>;
      default:
        return <div className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">{status}</div>;
    }
  };

  // Format address for display
  const formatAddress = (address: string) => {
    if (!address) return "";
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Blockchain Explorer</h1>
            <p className="text-gray-600 mt-2">
              Verify and explore all voting transactions on the blockchain
            </p>
          </div>

          <Card className="mb-8">
            <CardHeader className="pb-3">
              <CardTitle>Search Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearch} className="flex space-x-2">
                <Input
                  type="text"
                  placeholder="Search by transaction hash, voter ID, or election ID"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit" disabled={isSearching}>
                  {isSearching ? "Searching..." : "Search"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Tabs defaultValue="latest">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="latest">Latest Transactions</TabsTrigger>
              <TabsTrigger value="elections">Elections</TabsTrigger>
              <TabsTrigger value="statistics">Statistics</TabsTrigger>
            </TabsList>

            <TabsContent value="latest">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Contract Transactions</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    POLYGON AMOY NETWORK
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="rounded-md border overflow-hidden">
                      {/* Using iframe to embed the external blockchain explorer directly */}
                      <iframe 
                        src={`https://www.oklink.com/amoy/address/${CONTRACT_ADDRESS}`}
                        className="w-full"
                        style={{ height: "600px", border: "none" }}
                        title="Contract Transactions on OKLink"
                      ></iframe>
                    </div>
                    
                    <div className="text-center py-4">
                      <p className="text-sm text-gray-600 mb-4">
                        Showing all transactions from the official blockchain explorer
                      </p>
                      <a
                        href={`https://www.oklink.com/amoy/address/${CONTRACT_ADDRESS}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline text-sm inline-flex items-center"
                      >
                        <Button variant="outline">
                          Open in new tab for better viewing
                        </Button>
                      </a>
                    </div>
                    
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                      <h3 className="text-lg font-medium text-blue-800 mb-2">About this Contract</h3>
                      <p className="text-sm text-blue-700 mb-2">
                        Contract Address: <span className="font-mono">{CONTRACT_ADDRESS}</span>
                      </p>
                      <p className="text-sm text-blue-700">
                        This contract manages all voting operations on the Polygon Amoy testnet, including
                        election creation, vote casting, and election result storage.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="elections">
              <Card>
                <CardHeader>
                  <CardTitle>Elections on Blockchain</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingElections ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500">Loading elections from blockchain...</p>
                    </div>
                  ) : !electionData?.elections.length ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500">No elections found on the blockchain</p>
                    </div>
                  ) : (
                    <>
                      <div className="divide-y divide-gray-200">
                        {/* Calculate pagination for elections */}
                        {(() => {
                          const totalElections = electionData.elections.length;
                          const totalPages = Math.ceil(totalElections / itemsPerPage);
                          const startIndex = (currentPage - 1) * itemsPerPage;
                          const endIndex = Math.min(startIndex + itemsPerPage, totalElections);
                          const currentElections = electionData.elections.slice(startIndex, endIndex);
                          
                          return currentElections.map((election) => (
                            <div className="py-4" key={election.id}>
                              <h3 className="text-lg font-medium">{election.name}</h3>
                              <p className="text-sm text-gray-500">
                                {election.startTime.toLocaleDateString()} - {election.endTime.toLocaleDateString()}
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
                          ));
                        })()}
                      </div>
                      
                      {/* Pagination Controls */}
                      {(() => {
                        const totalElections = electionData.elections.length;
                        const totalPages = Math.ceil(totalElections / itemsPerPage);
                        
                        if (totalPages <= 1) return null;
                        
                        const startIndex = (currentPage - 1) * itemsPerPage;
                        const endIndex = Math.min(startIndex + itemsPerPage, totalElections);
                        
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
                        
                        return (
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
                        );
                      })()}
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="statistics">
              <Card>
                <CardHeader>
                  <CardTitle>Platform Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingElections ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500">Loading statistics from blockchain...</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                      <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <p className="text-sm font-medium text-gray-500">Total Elections</p>
                        <p className="text-3xl font-bold mt-1">{electionData?.statistics.totalElections}</p>
                      </div>
                      <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <p className="text-sm font-medium text-gray-500">Total Votes Cast</p>
                        <p className="text-3xl font-bold mt-1">{electionData?.statistics.totalVotes}</p>
                      </div>
                      <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <p className="text-sm font-medium text-gray-500">Active Elections</p>
                        <p className="text-3xl font-bold mt-1">{electionData?.statistics.activeElections}</p>
                      </div>
                      <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <p className="text-sm font-medium text-gray-500">Completed Elections</p>
                        <p className="text-3xl font-bold mt-1">{electionData?.statistics.completedElections}</p>
                      </div>
                      <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <p className="text-sm font-medium text-gray-500">Upcoming Elections</p>
                        <p className="text-3xl font-bold mt-1">{electionData?.statistics.upcomingElections}</p>
                      </div>
                      <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <p className="text-sm font-medium text-gray-500">Current Election ID</p>
                        <p className="text-3xl font-bold mt-1">{electionData?.statistics.currentElectionId}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  );
}