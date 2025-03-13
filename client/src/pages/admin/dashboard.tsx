import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { AdminNavbar } from "../../components/admin-navbar";
import { AdminElectionCreator } from "../../components/admin-election-creator";
import { AdminManagement } from "../../components/admin-management";
import { mockElectionData } from "../../data/mock-data";

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [adminAddress, setAdminAddress] = useState<string>("");
  
  useEffect(() => {
    // Check if user is authenticated as admin
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
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{mockElectionData.currentElection.isActive ? "1" : "0"}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Total Elections</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">27</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Registered Voters</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">187,245</div>
              </CardContent>
            </Card>
          </div>
          
          <Tabs defaultValue="create">
            <TabsList className="mb-6">
              <TabsTrigger value="create">Create Election</TabsTrigger>
              <TabsTrigger value="manage">Manage Admin</TabsTrigger>
            </TabsList>
            
            <TabsContent value="create">
              <Card>
                <CardHeader>
                  <CardTitle>Create New Election</CardTitle>
                  <CardDescription>
                    Set up a new election to be deployed to the blockchain
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AdminElectionCreator isElectionActive={mockElectionData.currentElection.isActive} />
                </CardContent>
              </Card>
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