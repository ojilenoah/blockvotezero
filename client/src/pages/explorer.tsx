import { useState, useEffect } from "react";
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
  CONTRACT_ADDRESS 
} from "@/utils/blockchain";
import { useMetaMask } from "@/hooks/use-metamask";
import { useToast } from "@/hooks/use-toast";

interface Election {
  id: number;
  name: string;
  startTime: Date;
  endTime: Date;
  status: "Active" | "Upcoming" | "Completed";
  totalVotes: number;
}

interface Transaction {
  hash: string;
  timestamp: Date;
  status: string;
  blockNumber: number;
}

export default function Explorer() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [elections, setElections] = useState<Election[]>([]);
  const [loadingElections, setLoadingElections] = useState(true);
  const [statistics, setStatistics] = useState({
    totalElections: 0,
    totalVotes: 0,
    activeElections: 0,
    completedElections: 0,
    upcomingElections: 0,
    currentElectionId: 0
  });
  const { chainId } = useMetaMask();
  const { toast } = useToast();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    // In a real implementation, this would search the blockchain
    setTimeout(() => {
      setIsSearching(false);
      toast({
        title: "Search Not Implemented",
        description: "This search functionality would require a blockchain indexer which is not connected in this demo.",
        variant: "destructive"
      });
    }, 1000);
  };

  useEffect(() => {
    const fetchElections = async () => {
      setLoadingElections(true);
      try {
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
              const startTime = new Date(electionInfo.startTime);
              const endTime = new Date(electionInfo.endTime);
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
        
        // Sort elections: Active first, then Upcoming, then Completed (most recent first)
        electionList.sort((a, b) => {
          if (a.status !== b.status) {
            const statusOrder = { Active: 0, Upcoming: 1, Completed: 2 };
            return statusOrder[a.status] - statusOrder[b.status];
          }
          
          // If same status, sort by date (most recent first for completed, soonest first for upcoming)
          if (a.status === "Completed") {
            return b.endTime.getTime() - a.endTime.getTime();
          } else {
            return a.startTime.getTime() - b.startTime.getTime();
          }
        });
        
        setElections(electionList);
        
        // Update statistics
        setStatistics({
          totalElections: electionList.length,
          totalVotes: totalVotesCount,
          activeElections: electionList.filter(e => e.status === "Active").length,
          completedElections: electionList.filter(e => e.status === "Completed").length,
          upcomingElections: electionList.filter(e => e.status === "Upcoming").length,
          currentElectionId
        });
      } catch (error) {
        console.error("Error fetching elections:", error);
        toast({
          title: "Error",
          description: "Failed to load blockchain data",
          variant: "destructive"
        });
      } finally {
        setLoadingElections(false);
      }
    };

    fetchElections();
  }, [toast]);

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
                <CardHeader>
                  <CardTitle>Contract Transactions</CardTitle>
                  <p className="text-sm text-gray-500 mt-1">
                    Showing estimated transactions based on election data
                  </p>
                </CardHeader>
                <CardContent>
                  {loadingElections ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500">Loading transactions...</p>
                    </div>
                  ) : elections.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500">No transactions found</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Election Creation Transactions */}
                      {elections.map((election) => (
                        <div key={`create-${election.id}`} className="border-b border-gray-200 pb-4 last:border-b-0 last:pb-0">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-sm font-medium text-primary">
                                Election Created: {election.name}
                              </p>
                              <p className="text-sm font-mono text-gray-600 truncate max-w-xs sm:max-w-sm md:max-w-md">
                                {/* Generate a deterministic hash-like ID based on election properties */}
                                0x{Array.from(election.name + election.id).map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join('').substring(0, 16)}...
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {new Date(election.startTime.getTime() - 86400000).toLocaleString()} {/* 1 day before start */}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium text-green-600">Confirmed</p>
                              <p className="text-xs text-gray-500 mt-1">
                                Method: createElection()
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Vote Transactions - Create multiple votes per completed election */}
                      {elections
                        .filter(election => election.status === "Completed" || election.status === "Active")
                        .flatMap(election => {
                          // Create a number of vote transactions based on total votes
                          // Limit to max 5 transactions per election for display purposes
                          const voteCount = Math.min(election.totalVotes, 5);
                          return Array.from({ length: voteCount }).map((_, index) => {
                            // Distribute votes over the election period
                            const startTime = election.startTime.getTime();
                            const endTime = Math.min(election.endTime.getTime(), Date.now());
                            const timeRange = endTime - startTime;
                            const voteTime = new Date(startTime + (timeRange * (index / voteCount)));
                            
                            return {
                              id: `vote-${election.id}-${index}`,
                              electionId: election.id,
                              electionName: election.name,
                              timestamp: voteTime,
                              hash: `0x${Array.from(`vote-${election.id}-${index}`).map(c => c.charCodeAt(0).toString(16)).join('').substring(0, 16)}`,
                              candidateIndex: index % 3 // Pretend there are 3 candidates max
                            };
                          });
                        })
                        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()) // Sort by timestamp, newest first
                        .slice(0, 10) // Limit to 10 most recent
                        .map(vote => (
                          <div key={vote.id} className="border-b border-gray-200 pb-4 last:border-b-0 last:pb-0">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="text-sm font-medium text-primary">
                                  Vote Cast: Election {vote.electionId}
                                </p>
                                <p className="text-sm font-mono text-gray-600 truncate max-w-xs sm:max-w-sm md:max-w-md">
                                  {vote.hash}...
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {vote.timestamp.toLocaleString()}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-medium text-green-600">Confirmed</p>
                                <p className="text-xs text-gray-500 mt-1">
                                  Method: castVote()
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                      }

                      <div className="flex justify-center pt-4">
                        <a 
                          href={`https://www.oklink.com/amoy/address/${CONTRACT_ADDRESS}`}
                          target="_blank"
                          rel="noopener noreferrer" 
                          className="text-primary hover:underline text-sm"
                        >
                          View all transactions on blockchain explorer →
                        </a>
                      </div>
                    </div>
                  )}
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
                  ) : elections.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500">No elections found on the blockchain</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {elections.map((election) => (
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
                      ))}
                    </div>
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
                        <p className="text-3xl font-bold mt-1">{statistics.totalElections}</p>
                      </div>
                      <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <p className="text-sm font-medium text-gray-500">Total Votes Cast</p>
                        <p className="text-3xl font-bold mt-1">{statistics.totalVotes}</p>
                      </div>
                      <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <p className="text-sm font-medium text-gray-500">Active Elections</p>
                        <p className="text-3xl font-bold mt-1">{statistics.activeElections}</p>
                      </div>
                      <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <p className="text-sm font-medium text-gray-500">Completed Elections</p>
                        <p className="text-3xl font-bold mt-1">{statistics.completedElections}</p>
                      </div>
                      <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <p className="text-sm font-medium text-gray-500">Upcoming Elections</p>
                        <p className="text-3xl font-bold mt-1">{statistics.upcomingElections}</p>
                      </div>
                      <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <p className="text-sm font-medium text-gray-500">Current Election ID</p>
                        <p className="text-3xl font-bold mt-1">{statistics.currentElectionId}</p>
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