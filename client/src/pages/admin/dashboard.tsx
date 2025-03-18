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

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [adminAddress, setAdminAddress] = useState<string>("");

  // Query for getting elections data
  const { data: electionData, isLoading: loadingElections } = useQuery({
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

  if (!isAuthenticated) {
    return <div className="p-8 text-center">Authenticating...</div>;
  }

  const isElectionActive = electionData?.elections.some(e => e.status === "Active") ?? false;
  const hasUpcomingElection = electionData?.elections.some(e => e.status === "Upcoming") ?? false;

  return (
    <div className="min-h-screen flex flex-col">
      <AdminNavbar address={adminAddress} onLogout={handleLogout} />

      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600">Manage elections and system settings</p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="text-sm text-gray-500 text-right mr-2">
                <div>Connected as:</div>
                <div className="font-mono">{adminAddress}</div>
              </div>
              <Button variant="outline" onClick={handleLogout}>Logout</Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Active Elections</CardTitle>
                <CardDescription>Currently running elections</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{electionData?.statistics.activeElections || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Upcoming Elections</CardTitle>
                <CardDescription>Scheduled for the future</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{electionData?.statistics.upcomingElections || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Total Votes</CardTitle>
                <CardDescription>Across all elections</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{electionData?.statistics.totalVotes || 0}</div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="create">
            <TabsList className="mb-6">
              <TabsTrigger value="create">Create Election</TabsTrigger>
              <TabsTrigger value="nin">NIN Verification</TabsTrigger>
              <TabsTrigger value="manage">Manage Admin</TabsTrigger>
              <TabsTrigger value="test">Blockchain Test</TabsTrigger>
            </TabsList>

            <TabsContent value="create">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Create New Election</CardTitle>
                    <CardDescription>
                      Set up a new election to be deployed to the blockchain
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
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
              </div>
            </TabsContent>

            <TabsContent value="manage">
              <Card>
                <CardHeader>
                  <CardTitle>Admin Management</CardTitle>
                  <CardDescription>
                    Update admin wallet address with MetaMask signature verification
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AdminManagement currentAddress={adminAddress} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="nin">
              <AdminNinManagement />
            </TabsContent>

            <TabsContent value="test">
              <BlockchainTest />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <footer className="border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col items-center justify-between md:flex-row">
            <p className="text-sm text-gray-500">
              &copy; {new Date().getFullYear()} BlockVote Admin Panel
            </p>
            <p className="text-sm text-gray-500 mt-2 md:mt-0">
              Secure Blockchain-Based Voting System
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}