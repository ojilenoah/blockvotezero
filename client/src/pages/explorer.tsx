import { useState } from "react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Explorer() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    // Simulate search delay
    setTimeout(() => {
      setIsSearching(false);
    }, 1000);
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
                  <CardTitle>Latest Voting Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[...Array(5)].map((_, index) => (
                      <div key={index} className="border-b border-gray-200 pb-4 last:border-b-0 last:pb-0">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm font-mono text-gray-600 truncate max-w-xs sm:max-w-sm md:max-w-md">
                              0x{Array.from({ length: 16 }, () => 
                                Math.floor(Math.random() * 16).toString(16)
                              ).join("")}...
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {Math.floor(Math.random() * 10) + 1} minutes ago
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">
                              {["Confirmed", "Success", "Completed"][Math.floor(Math.random() * 3)]}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Block #{Math.floor(Math.random() * 1000000) + 15000000}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
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
                  <div className="divide-y divide-gray-200">
                    <div className="py-4">
                      <h3 className="text-lg font-medium">2023 Community Council Election</h3>
                      <p className="text-sm text-gray-500">October 5, 2023 - October 12, 2023</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                          Active
                        </div>
                        <div className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                          2,450 votes
                        </div>
                        <div className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                          Contract: 0x9e56...c888
                        </div>
                      </div>
                    </div>
                    <div className="py-4">
                      <h3 className="text-lg font-medium">2022 Community Council Election</h3>
                      <p className="text-sm text-gray-500">Oct 10, 2022 - Oct 17, 2022</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          Completed
                        </div>
                        <div className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                          4,218 votes
                        </div>
                        <div className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                          Contract: 0x7a42...9f31
                        </div>
                      </div>
                    </div>
                    <div className="py-4">
                      <h3 className="text-lg font-medium">2021 Community Council Election</h3>
                      <p className="text-sm text-gray-500">Oct 12, 2021 - Oct 19, 2021</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          Completed
                        </div>
                        <div className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                          3,756 votes
                        </div>
                        <div className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                          Contract: 0x3b29...7d12
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="statistics">
              <Card>
                <CardHeader>
                  <CardTitle>Platform Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                      <p className="text-sm font-medium text-gray-500">Total Elections</p>
                      <p className="text-3xl font-bold mt-1">27</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                      <p className="text-sm font-medium text-gray-500">Total Votes Cast</p>
                      <p className="text-3xl font-bold mt-1">124,532</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                      <p className="text-sm font-medium text-gray-500">Registered Voters</p>
                      <p className="text-3xl font-bold mt-1">187,245</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                      <p className="text-sm font-medium text-gray-500">Average Participation</p>
                      <p className="text-3xl font-bold mt-1">76%</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                      <p className="text-sm font-medium text-gray-500">Total Transactions</p>
                      <p className="text-3xl font-bold mt-1">356,782</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                      <p className="text-sm font-medium text-gray-500">Chain Height</p>
                      <p className="text-3xl font-bold mt-1">15,732,851</p>
                    </div>
                  </div>
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