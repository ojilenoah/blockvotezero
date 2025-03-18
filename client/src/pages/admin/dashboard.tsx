import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { AdminNavbar } from "@/components/admin-navbar";
import { AdminElectionCreator } from "@/components/admin-election-creator";
import { AdminElectionLog } from "@/components/admin-election-log";
import { AdminManagement } from "@/components/admin-management";
import { AdminNinManagement } from "@/components/admin-nin-management";
import { BlockchainTest } from "@/components/blockchain-test";
import { getActiveElectionId, getElectionInfo, getAllCandidates, getTotalVotes } from "@/utils/blockchain";
import { 
  VoteIcon, 
  CalendarIcon, 
  UsersIcon, 
  BarChartIcon, 
  LayoutDashboardIcon, 
  ShieldIcon, 
  FileTextIcon,
  LogOutIcon,
  RefreshCwIcon
} from "lucide-react";

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [adminAddress, setAdminAddress] = useState<string>("");
  const [refreshing, setRefreshing] = useState(false);

  // Query for getting elections data
  const { data: electionData, isLoading: loadingElections, refetch } = useQuery({
    queryKey: ['admin-elections'],
    queryFn: async () => {
      const currentElectionId = await getActiveElectionId();
      const electionList = [];
      let totalVotesCount = 0;
      let activeCount = 0;
      let upcomingCount = 0;

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
              upcomingCount++;
            } else if (now >= startTime && now <= endTime) {
              status = "Active";
              activeCount++;
            }

            const votes = await getTotalVotes(id);
            totalVotesCount += votes;

            electionList.push({
              id,
              name: electionInfo.name,
              startTime: startTime.toISOString(),
              endTime: endTime.toISOString(),
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
          return new Date(b.startTime).getTime() - new Date(a.startTime).getTime();
        }),
        statistics: {
          totalElections: electionList.length,
          totalVotes: totalVotesCount,
          activeElections: activeCount,
          upcomingElections: upcomingCount,
          completedElections: electionList.length - activeCount - upcomingCount,
        }
      };
    },
    staleTime: 30000, // Consider data fresh for 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });

  useEffect(() => {
    const isAdmin = sessionStorage.getItem("isAdmin") === "true";
    const storedAddress = sessionStorage.getItem("adminAddress");

    if (!isAdmin || !storedAddress) {
      toast({
        title: "Authentication required",
        description: "Please login with an admin wallet",
        variant: "destructive",
      });
      setLocation("/admin/login");
      return;
    }

    setIsAuthenticated(true);
    setAdminAddress(storedAddress);
  }, [setLocation, toast]);

  const handleLogout = () => {
    sessionStorage.removeItem("isAdmin");
    sessionStorage.removeItem("adminAddress");
    setIsAuthenticated(false);
    toast({
      title: "Logged out",
      description: "Successfully logged out from admin panel",
    });
    setLocation("/admin/login");
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setTimeout(() => setRefreshing(false), 1000);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-100 flex flex-col items-center gap-4 max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <ShieldIcon className="h-8 w-8 text-primary" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Authenticating...</h1>
            <p className="text-slate-500">Verifying your admin credentials</p>
          </div>
          <div className="w-16 h-16 relative mt-4">
            <div className="absolute inset-0 rounded-full border-4 border-primary/30"></div>
            <div className="absolute inset-0 rounded-full border-4 border-primary border-l-transparent animate-spin"></div>
          </div>
        </div>
      </div>
    );
  }

  const isElectionActive = electionData?.elections.some(e => e.status === "Active") ?? false;
  const hasUpcomingElection = electionData?.elections.some(e => e.status === "Upcoming") ?? false;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100">
      <AdminNavbar address={adminAddress} onLogout={handleLogout} />

      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
            <div>
              <div className="flex items-center gap-3">
                <LayoutDashboardIcon className="h-8 w-8 text-primary" />
                <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
              </div>
              <p className="text-slate-600 mt-1">Manage elections, voters, and system settings</p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center gap-2"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCwIcon className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </Button>
              
              <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-lg shadow-sm border border-slate-200">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <div>
                  <div className="text-xs text-slate-500">Connected as Admin</div>
                  <div className="font-mono text-xs truncate max-w-[150px] sm:max-w-[200px]">{adminAddress}</div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                  onClick={handleLogout}
                >
                  <LogOutIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="border border-slate-200 shadow-sm overflow-hidden bg-white hover:shadow-md transition-shadow">
              <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-blue-600">Active Elections</CardTitle>
                  <div className="p-2 rounded-full bg-blue-50">
                    <VoteIcon className="h-5 w-5 text-blue-500" />
                  </div>
                </div>
                <CardDescription>Currently running elections</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-blue-700">
                  {loadingElections ? (
                    <div className="h-8 w-12 bg-slate-200 animate-pulse rounded"></div>
                  ) : (
                    electionData?.statistics.activeElections || 0
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card className="border border-slate-200 shadow-sm overflow-hidden bg-white hover:shadow-md transition-shadow">
              <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-amber-600">Upcoming Elections</CardTitle>
                  <div className="p-2 rounded-full bg-amber-50">
                    <CalendarIcon className="h-5 w-5 text-amber-500" />
                  </div>
                </div>
                <CardDescription>Scheduled for the future</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-amber-700">
                  {loadingElections ? (
                    <div className="h-8 w-12 bg-slate-200 animate-pulse rounded"></div>
                  ) : (
                    electionData?.statistics.upcomingElections || 0
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card className="border border-slate-200 shadow-sm overflow-hidden bg-white hover:shadow-md transition-shadow">
              <div className="absolute top-0 left-0 w-1 h-full bg-green-500"></div>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-green-600">Total Votes</CardTitle>
                  <div className="p-2 rounded-full bg-green-50">
                    <BarChartIcon className="h-5 w-5 text-green-500" />
                  </div>
                </div>
                <CardDescription>Across all elections</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-green-700">
                  {loadingElections ? (
                    <div className="h-8 w-12 bg-slate-200 animate-pulse rounded"></div>
                  ) : (
                    electionData?.statistics.totalVotes || 0
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
            <Tabs defaultValue="create" className="w-full">
              <TabsList className="w-full grid grid-cols-4 mb-8 p-1 bg-slate-100 rounded-lg gap-1">
                <TabsTrigger value="create" className="data-[state=active]:bg-white data-[state=active]:shadow-sm flex gap-2 transition-all">
                  <FileTextIcon className="h-4 w-4" />
                  <span>Elections</span>
                </TabsTrigger>
                <TabsTrigger value="nin" className="data-[state=active]:bg-white data-[state=active]:shadow-sm flex gap-2 transition-all">
                  <UsersIcon className="h-4 w-4" />
                  <span>Voter Management</span>
                </TabsTrigger>
                <TabsTrigger value="manage" className="data-[state=active]:bg-white data-[state=active]:shadow-sm flex gap-2 transition-all">
                  <ShieldIcon className="h-4 w-4" />
                  <span>Admin Access</span>
                </TabsTrigger>
                <TabsTrigger value="test" className="data-[state=active]:bg-white data-[state=active]:shadow-sm flex gap-2 transition-all">
                  <BarChartIcon className="h-4 w-4" />
                  <span>System Check</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="create" className="mt-0 space-y-6">
                <Card className="border-0 shadow-md">
                  <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent rounded-t-lg">
                    <CardTitle>Create New Election</CardTitle>
                    <CardDescription>
                      Set up a new election to be deployed to the blockchain
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <AdminElectionCreator 
                      isElectionActive={isElectionActive}
                      hasUpcomingElection={hasUpcomingElection}
                      electionStatus={isElectionActive ? "active" : hasUpcomingElection ? "upcoming" : "none"}
                    />
                  </CardContent>
                </Card>

                <AdminElectionLog 
                  elections={electionData?.elections || []}
                  isLoading={loadingElections}
                />
              </TabsContent>

              <TabsContent value="nin" className="mt-0">
                <AdminNinManagement />
              </TabsContent>

              <TabsContent value="manage" className="mt-0">
                <Card className="border-0 shadow-md">
                  <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent rounded-t-lg">
                    <CardTitle>Admin Management</CardTitle>
                    <CardDescription>
                      Update admin wallet address with MetaMask signature verification
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <AdminManagement currentAddress={adminAddress} />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="test" className="mt-0">
                <Card className="border-0 shadow-md">
                  <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent rounded-t-lg">
                    <CardTitle>Blockchain Test</CardTitle>
                    <CardDescription>
                      Test and verify your connection to the blockchain
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <BlockchainTest />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200 mt-auto bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col items-center justify-between md:flex-row">
            <p className="text-sm text-slate-500">
              &copy; {new Date().getFullYear()} BlockVote Admin Panel
            </p>
            <p className="text-sm text-slate-500 mt-2 md:mt-0">
              Secure Blockchain-Based Voting System
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}