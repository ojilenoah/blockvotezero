import { useEffect } from "react";
import { useLocation } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminNavbar } from "@/components/admin-navbar";
import { AdminElectionCreator } from "@/components/admin-election-creator";
import { AdminElectionList } from "@/components/admin-election-list";
import { AdminManagement } from "@/components/admin-management";
import { useAdmin } from "@/hooks/use-admin";
import { useMetaMask } from "@/hooks/use-metamask";
import { Loader2 } from "lucide-react";

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const { isAdmin, isCheckingAdmin } = useAdmin();
  const { isConnected } = useMetaMask();

  // Check if user is authenticated
  useEffect(() => {
    if (!isConnected) {
      setLocation("/admin/login");
      return;
    }

    if (!isCheckingAdmin && !isAdmin) {
      setLocation("/admin/login");
    }
  }, [isConnected, isAdmin, isCheckingAdmin, setLocation]);

  if (isCheckingAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-lg">Verifying admin status...</p>
        </div>
      </div>
    );
  }

  // If we're still checking, or user is not admin, don't render the dashboard
  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />

      <div className="container mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

        <Tabs defaultValue="create">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="create">Create Election</TabsTrigger>
            <TabsTrigger value="manage">Manage Elections</TabsTrigger>
            <TabsTrigger value="admin">Admin Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="mt-0">
            <AdminElectionCreator />
          </TabsContent>

          <TabsContent value="manage" className="mt-0">
            <AdminElectionList />
          </TabsContent>

          <TabsContent value="admin" className="mt-0">
            <AdminManagement />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}