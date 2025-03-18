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
import { useMetaMask } from "@/hooks/use-metamask";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, Loader2, ExternalLink } from "lucide-react";
import { ethers } from "ethers";
import VotingSystemABI from "../contracts/VotingSystem.json";

// ... rest of the imports remain the same ...

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

export default function Explorer() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(10);
  const { chainId } = useMetaMask();
  const { toast } = useToast();

  // Replace the transactions query with new Alchemy implementation
  const { data: transactionData, isLoading: loadingTransactions, isFetching, refetch } = useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      try {
        const provider = new ethers.JsonRpcProvider(ALCHEMY_URL);
        const contract = new ethers.Contract(CONTRACT_ADDRESS, VotingSystemABI.abi, provider);

        // Create Alchemy API URL
        const alchemyBaseUrl = ALCHEMY_URL.split('/v2/')[0];
        const alchemyApiKey = ALCHEMY_URL.split('/v2/')[1];

        const response = await fetch(`${alchemyBaseUrl}/v2/${alchemyApiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: 1,
            jsonrpc: "2.0",
            method: "alchemy_getAssetTransfers",
            params: [
              {
                fromBlock: "0x0",
                toBlock: "latest",
                toAddress: CONTRACT_ADDRESS,
                category: ["external"],
                withMetadata: true,
                excludeZeroValue: false,
                maxCount: "0x64" // Fetch last 100 transactions
              }
            ]
          })
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        const transfers = result.result.transfers;

        // Process each transaction to include function name
        const processedTransactions: Transaction[] = await Promise.all(
          transfers.map(async (transfer: any) => {
            const tx = await provider.getTransaction(transfer.hash);
            const receipt = await provider.getTransactionReceipt(transfer.hash);

            let functionName = "Unknown Function";
            try {
              if (tx?.data && tx.data !== "0x") {
                const iface = new ethers.Interface(VotingSystemABI.abi);
                const decodedInput = iface.parseTransaction({ data: tx.data, value: tx.value });
                if (decodedInput) {
                  functionName = decodedInput.name;
                }
              }
            } catch (decodeError) {
              // Silently continue if we can't decode the function
            }

            return {
              hash: transfer.hash,
              timestamp: new Date(transfer.metadata.blockTimestamp),
              from: transfer.from,
              to: transfer.to,
              value: transfer.value,
              asset: transfer.asset,
              status: receipt?.status === 1 ? "Success" : "Failed",
              functionName
            };
          })
        );

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

  // Filter transactions based on search query
  const filteredTransactions = transactionData?.transactions.filter(tx => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      tx.hash.toLowerCase().includes(query) ||
      tx.from.toLowerCase().includes(query) ||
      tx.functionName.toLowerCase().includes(query)
    );
  }) || [];

  // Calculate pagination
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentTransactions = filteredTransactions.slice(startIndex, endIndex);

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
                      <div className="text-center py-8 text-muted-foreground">
                        No transactions found
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
                                <TableCell className="font-mono">
                                  {tx.hash.substring(0, 10)}...
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
                    <>
                      <div className="divide-y divide-gray-200">
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