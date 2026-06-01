import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { AdminNavbar } from "@/components/admin-navbar";
import { AdminElectionCreator } from "@/components/admin-election-creator";
import { AdminElectionLog } from "@/components/admin-election-log";
import { AdminManagement } from "@/components/admin-management";
import { AdminNinManagement } from "@/components/admin-nin-management";
import { BlockchainTest } from "@/components/blockchain-test";
import { getActiveElectionId, getElectionInfo, getTotalVotes } from "@/utils/blockchain";

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, isAuthenticated, loading, signOut } = useAuth();
  const adminEmail = user?.email ?? "";

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
    if (loading) return;
    if (!isAuthenticated) {
      toast({
        title: "Authentication required",
        description: "Sign in to access the admin console.",
        variant: "destructive",
      });
      setLocation("/admin/login");
    }
  }, [loading, isAuthenticated, setLocation, toast]);

  const handleLogout = async () => {
    await signOut();
    toast({
      title: "Logged out",
      description: "Signed out of the admin console.",
    });
    setLocation("/admin/login");
  };

  if (loading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="b-label">// authenticating…</div>
          <div className="b-display mt-2 text-2xl">Verifying session</div>
        </div>
      </div>
    );
  }

  const isElectionActive = electionData?.elections.some(e => e.status === "Active") ?? false;
  const hasUpcomingElection = electionData?.elections.some(e => e.status === "Upcoming") ?? false;

  return (
    <div className="min-h-screen flex flex-col">
      <AdminNavbar identity={adminEmail} onLogout={handleLogout} />

      <main className="flex-grow">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-end justify-between border-b-2 border-border pb-4">
            <div>
              <div className="b-label">// admin · console</div>
              <h1 className="b-display text-4xl">Dashboard</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Manage elections, voter registry, and admin settings.
              </p>
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
                    Legacy wallet-based admin tools. Account auth runs through
                    Supabase — sign in with email/password to access this console.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AdminManagement currentAddress={adminEmail} />
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