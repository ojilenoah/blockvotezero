import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ALCHEMY_URL, CONTRACT_ADDRESS } from "@/utils/blockchain";
import { getActiveElectionId, getElectionInfo, getAllCandidates, getTotalVotes } from "@/utils/blockchain";
import { useMetaMask } from "@/hooks/use-metamask";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, Loader2, ExternalLink, Copy, Check } from "lucide-react";
import { ethers } from "ethers";
import VotingSystemABI from "../contracts/VotingSystem.json";
import { LastElectionWinner } from "@/components/last-election-winner";

interface Transaction {
  hash: string;
  timestamp: Date;
  from: string;
  to: string;
  value: string;
  asset: string;
  status: string;
  functionName: string;
}

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
  const [electionPage, setElectionPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(10);
  const [electionsPerPage] = useState<number>(5); // Show 5 elections per page
  const { chainId } = useMetaMask();
  const { toast } = useToast();
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  // Elections data query
  const { data: electionData, isLoading: loadingElections } = useQuery({
    queryKey: ['elections'],
    queryFn: async () => {
      const currentElectionId = await getActiveElectionId();
      const electionList: Election[] = [];
      let totalVotesCount = 0;

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
    staleTime: 30000,
    refetchInterval: 60000,
  });

  // Transactions data query using contract events
  const { data: transactionData, isLoading: loadingTransactions, isFetching, refetch } = useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      try {
        console.log("Fetching transactions for contract:", CONTRACT_ADDRESS);
        const provider = new ethers.JsonRpcProvider(ALCHEMY_URL);
        const contract = new ethers.Contract(CONTRACT_ADDRESS, VotingSystemABI.abi, provider);
        
        const latestBlock = await provider.getBlockNumber();
        console.log("Latest block:", latestBlock);
        
        // Use a very recent block range to avoid data availability issues
        const blockRange = 2000; // Much smaller range to stay within available data
        const fromBlock = Math.max(0, latestBlock - blockRange);
        
        console.log(`Scanning from block ${fromBlock} to ${latestBlock}`);
        
        const processedTransactions: Transaction[] = [];
        
        // Try multiple block ranges to find available data
        const blockRanges = [2000, 5000, 10000, 20000];
        let foundEvents = false;
        
        for (const range of blockRanges) {
          if (foundEvents) break;
          
          const startBlock = Math.max(0, latestBlock - range);
          console.log(`Trying range: ${startBlock} to ${latestBlock}`);
          
          try {
            // Get ElectionCreated events
            const electionCreatedFilter = contract.filters.ElectionCreated();
            const electionEvents = await contract.queryFilter(electionCreatedFilter, startBlock, latestBlock);
            console.log(`Found ${electionEvents.length} ElectionCreated events in range ${range}`);
            
            for (const event of electionEvents) {
              try {
                // Use a more robust approach - try to get basic transaction info first
                const basicTx = await provider.getTransaction(event.transactionHash);
                if (basicTx) {
                  processedTransactions.push({
                    hash: event.transactionHash,
                    timestamp: new Date(),
                    from: basicTx.from,
                    to: CONTRACT_ADDRESS,
                    value: "0",
                    asset: "MATIC",
                    status: "Success",
                    functionName: "createElection"
                  });
                  foundEvents = true;
                }
              } catch (txError) {
                // Skip problematic transactions
                continue;
              }
            }
          } catch (error) {
            console.log(`Error fetching ElectionCreated events for range ${range}:`, error);
          }
          
          try {
            // Get VoteCast events
            const voteCastFilter = contract.filters.VoteCast();
            const voteEvents = await contract.queryFilter(voteCastFilter, startBlock, latestBlock);
            console.log(`Found ${voteEvents.length} VoteCast events in range ${range}`);
            
            for (const event of voteEvents) {
              try {
                const basicTx = await provider.getTransaction(event.transactionHash);
                if (basicTx) {
                  processedTransactions.push({
                    hash: event.transactionHash,
                    timestamp: new Date(),
                    from: basicTx.from,
                    to: CONTRACT_ADDRESS,
                    value: "0",
                    asset: "MATIC",
                    status: "Success",
                    functionName: "castVote"
                  });
                  foundEvents = true;
                }
              } catch (txError) {
                continue;
              }
            }
          } catch (error) {
            console.log(`Error fetching VoteCast events for range ${range}:`, error);
          }
        }
        
        // If still no transactions found, show a message explaining the data availability issue
        if (processedTransactions.length === 0) {
          console.log("No transactions found in available block range due to data pruning on testnet");
        }
        
        // Sort by timestamp descending (newest first)
        processedTransactions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        
        console.log(`Processed ${processedTransactions.length} total transactions`);
        
        return {
          transactions: processedTransactions,
          totalTransactions: processedTransactions.length
        };
      } catch (error) {
        console.error('Error fetching transactions:', error);
        throw error;
      }
    },
    staleTime: 30000,
    refetchInterval: 60000,
  });

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    toast({
      title: "Copied!",
      description: "Transaction hash copied to clipboard",
    });
    setTimeout(() => setCopiedHash(null), 2000);
  };

  // Filter transactions based on search query and sort by timestamp
  const filteredTransactions = transactionData?.transactions
    .filter(tx => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        tx.hash.toLowerCase().includes(query) ||
        tx.from.toLowerCase().includes(query) ||
        tx.functionName.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()) || [];


  // Calculate transaction pagination
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentTransactions = filteredTransactions.slice(startIndex, endIndex);
  
  // Calculate election pagination
  const totalElectionPages = electionData?.elections ? Math.ceil(electionData.elections.length / electionsPerPage) : 0;
  const electionStartIndex = (electionPage - 1) * electionsPerPage;
  const electionEndIndex = electionStartIndex + electionsPerPage;
  const currentElections = electionData?.elections ? electionData.elections.slice(electionStartIndex, electionEndIndex) : [];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1); // Reset to first page when searching
  };

  const getTransactionStatusBadge = (status: string) => {
    return (
      <Badge variant={status === "Success" ? "default" : "destructive"}>
        {status}
      </Badge>
    );
  };

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
                  placeholder="Search by transaction hash, voter address, or function name"
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
                    {loadingTransactions ? (
                      <div className="flex justify-center p-8">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading transactions...
                      </div>
                    ) : currentTransactions.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground space-y-4">
                        <div className="text-lg font-medium">No Recent Transactions Available</div>
                        <div className="text-sm max-w-md mx-auto">
                          <p className="mb-2">
                            The Polygon Amoy testnet has pruned older block data. Contract transactions 
                            from earlier blocks are not currently accessible through the RPC provider.
                          </p>
                          <p>
                            New transactions will appear here when they occur on the contract at:
                          </p>
                          <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-xs break-all">
                            {CONTRACT_ADDRESS}
                          </code>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Hash</TableHead>
                              <TableHead>Function</TableHead>
                              <TableHead>From</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Time</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {currentTransactions.map((tx) => (
                              <TableRow key={tx.hash}>
                                <TableCell className="font-mono flex items-center space-x-2">
                                  <span>{tx.hash.substring(0, 10)}...</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0"
                                    onClick={() => handleCopyHash(tx.hash)}
                                  >
                                    {copiedHash === tx.hash ? (
                                      <Check className="h-4 w-4" />
                                    ) : (
                                      <Copy className="h-4 w-4" />
                                    )}
                                  </Button>
                                </TableCell>
                                <TableCell>{tx.functionName}</TableCell>
                                <TableCell className="font-mono">
                                  {tx.from.substring(0, 10)}...
                                </TableCell>
                                <TableCell>
                                  {getTransactionStatusBadge(tx.status)}
                                </TableCell>
                                <TableCell>
                                  {tx.timestamp.toLocaleString()}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}

                    {/* Pagination controls */}
                    {!loadingTransactions && filteredTransactions.length > 0 && (
                      <div className="flex items-center justify-between pt-4">
                        <div>
                          <p className="text-sm text-gray-700">
                            Showing{" "}
                            <span className="font-medium">{startIndex + 1}</span> to{" "}
                            <span className="font-medium">
                              {Math.min(endIndex, filteredTransactions.length)}
                            </span>{" "}
                            of{" "}
                            <span className="font-medium">{filteredTransactions.length}</span>{" "}
                            transactions
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(currentPage - 1)}
                            disabled={currentPage === 1}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          {Array.from({ length: totalPages }).map((_, index) => (
                            <Button
                              key={index}
                              variant={currentPage === index + 1 ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCurrentPage(index + 1)}
                            >
                              {index + 1}
                            </Button>
                          ))}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(currentPage + 1)}
                            disabled={currentPage === totalPages}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}

                    <div className="text-center py-4">
                      <div className="flex justify-center gap-2">
                        <Button
                          variant="outline"
                          onClick={() => refetch()}
                          disabled={isFetching}
                        >
                          {isFetching ? "Refreshing..." : "Refresh Transactions"}
                        </Button>
                        <a
                          href={`https://www.oklink.com/amoy/address/${CONTRACT_ADDRESS}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block"
                        >
                          <Button variant="outline">
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View in Explorer
                          </Button>
                        </a>
                      </div>
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
                    <div className="divide-y divide-gray-200">
                      {currentElections.map((election) => (
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
                          </div>
                        </div>
                      ))}
                      
                      {/* Elections pagination controls */}
                      {electionData?.elections.length > electionsPerPage && (
                        <div className="flex items-center justify-between pt-4 mt-4">
                          <div>
                            <p className="text-sm text-gray-700">
                              Showing{" "}
                              <span className="font-medium">{electionStartIndex + 1}</span> to{" "}
                              <span className="font-medium">
                                {Math.min(electionEndIndex, electionData.elections.length)}
                              </span>{" "}
                              of{" "}
                              <span className="font-medium">{electionData.elections.length}</span>{" "}
                              elections
                            </p>
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setElectionPage(electionPage - 1)}
                              disabled={electionPage === 1}
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </Button>
                            {Array.from({ length: totalElectionPages }).map((_, index) => (
                              <Button
                                key={index}
                                variant={electionPage === index + 1 ? "default" : "outline"}
                                size="sm"
                                onClick={() => setElectionPage(index + 1)}
                              >
                                {index + 1}
                              </Button>
                            ))}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setElectionPage(electionPage + 1)}
                              disabled={electionPage === totalElectionPages}
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
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
                    <>
                      {/* Show LastElectionWinner only when there's no active election */}
                      {electionData?.statistics.activeElections === 0 && (
                        <div className="mb-8">
                          <Card>
                            <CardHeader className="pb-3">
                              <CardTitle>Last Election Winner</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <LastElectionWinner />
                            </CardContent>
                          </Card>
                        </div>
                      )}

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
                      </div>
                    </>
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