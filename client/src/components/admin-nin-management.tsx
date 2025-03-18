import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Loader2, CheckCircle, XCircle, Lock, Unlock, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMetaMask } from "@/hooks/use-metamask";
import { getAllNINs, updateNINVerificationStatus, toggleNINSubmissionLock, checkNINSubmissionLocked, User } from "@/utils/supabase";

export function AdminNinManagement() {
  const { toast } = useToast();
  const { isConnected, account } = useMetaMask();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmissionLocked, setIsSubmissionLocked] = useState(false);
  const [loadingLockStatus, setLoadingLockStatus] = useState(true);

  const loadNINs = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch users data from Supabase
      const data = await getAllNINs();
      
      if (data) {
        console.log("NIN data loaded:", data);
        setUsers(data);
      } else {
        console.error("No users data returned");
        setError("Failed to load user records");
      }
    } catch (err: any) {
      console.error("Error loading NINs:", err);
      setError(err.message || "Failed to load NIN records");
      toast({
        title: "Error",
        description: "Failed to load NIN records",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadLockStatus = async () => {
    setLoadingLockStatus(true);
    try {
      // Get the current locked status from admin_config
      const locked = await checkNINSubmissionLocked();
      console.log("Loaded lock status:", locked);
      setIsSubmissionLocked(locked);
    } catch (err: any) {
      console.error("Error loading lock status:", err);
      toast({
        title: "Error",
        description: "Failed to load registration lock status",
        variant: "destructive",
      });
    } finally {
      setLoadingLockStatus(false);
    }
  };

  useEffect(() => {
    // Load data on component mount
    loadNINs();
    loadLockStatus();
  }, []);

  const handleToggleVerification = async (walletAddress: string, currentStatus: 'Y' | 'N') => {
    const newStatus = currentStatus === 'Y' ? 'N' : 'Y';

    try {
      // Optimistically update UI
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.wallet_address === walletAddress 
            ? { ...user, status: newStatus } 
            : user
        )
      );

      // Update status in database
      const result = await updateNINVerificationStatus(walletAddress, newStatus);

      if (!result.success) {
        // Revert UI change if update failed
        setUsers(prevUsers => 
          prevUsers.map(user => 
            user.wallet_address === walletAddress 
              ? { ...user, status: currentStatus } 
              : user
          )
        );

        throw new Error(result.error || "Failed to update verification status");
      }

      toast({
        title: "Success",
        description: `User verification status updated to ${newStatus === 'Y' ? 'Verified' : 'Not Verified'}`,
      });
    } catch (err: any) {
      console.error("Error toggling verification:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to update verification status",
        variant: "destructive",
      });
    }
  };

  const handleToggleLock = async () => {
    setLoadingLockStatus(true);

    if (!account) {
      toast({
        title: "Error",
        description: "Admin wallet not connected",
        variant: "destructive",
      });
      setLoadingLockStatus(false);
      return;
    }

    try {
      const newLockStatus = !isSubmissionLocked;
      
      // Optimistically update UI
      setIsSubmissionLocked(newLockStatus);

      // Update lock status in database
      const result = await toggleNINSubmissionLock(newLockStatus, account);

      if (!result.success) {
        // Revert UI change if update failed
        setIsSubmissionLocked(!newLockStatus);
        throw new Error(result.error || "Failed to toggle registration lock");
      }

      toast({
        title: "Success",
        description: `NIN submissions are now ${newLockStatus ? 'locked' : 'unlocked'}`,
      });
    } catch (err: any) {
      console.error("Error toggling lock:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to toggle registration lock",
        variant: "destructive",
      });
    } finally {
      setLoadingLockStatus(false);
    }
  };

  // Calculate statistics
  const totalRegistrations = users.length;
  const verifiedCount = users.filter(user => user.status === 'Y').length;
  const pendingCount = users.filter(user => user.status === 'N').length;

  return (
    <Card className="w-full">
      <CardHeader className="space-y-4">
        <CardTitle>NIN Verification Management</CardTitle>
        <CardDescription>
          Manage and verify National Identification Numbers submitted by users.
        </CardDescription>

        {/* Registration Statistics - Single Card */}
        <div className="bg-slate-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-lg">Registration Summary</h3>
              <p className="text-sm text-gray-500">Current NIN registration status</p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                loadNINs();
                loadLockStatus();
              }}
              disabled={loading || loadingLockStatus}
            >
              {(loading || loadingLockStatus) ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-1" />
              )}
              Refresh
            </Button>
          </div>
          
          <div className="flex justify-between mt-4 gap-4">
            <div className="bg-white p-3 rounded-md border flex-1">
              <p className="text-sm font-medium text-slate-600">Total Registrations</p>
              <p className="text-2xl font-bold">{totalRegistrations}</p>
            </div>
            
            <div className="bg-white p-3 rounded-md border flex-1">
              <p className="text-sm font-medium text-green-600">Verified</p>
              <p className="text-2xl font-bold text-green-700">{verifiedCount}</p>
            </div>
            
            <div className="bg-white p-3 rounded-md border flex-1">
              <p className="text-sm font-medium text-amber-600">Pending</p>
              <p className="text-2xl font-bold text-amber-700">{pendingCount}</p>
            </div>
          </div>
        </div>

        {/* Lock Controls */}
        <div className="flex items-center justify-between p-4 bg-white border rounded-lg mt-4">
          <div>
            <h3 className="font-medium">Registration Control</h3>
            <p className="text-sm text-gray-500">Control whether users can submit new NIN registrations</p>
          </div>
          {loadingLockStatus ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <div className="flex items-center gap-4">
              {isSubmissionLocked ? (
                <Badge variant="destructive" className="flex items-center gap-1 px-3 py-1 text-sm">
                  <Lock className="h-4 w-4 mr-1" /> Registrations Locked
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 flex items-center gap-1 px-3 py-1 text-sm">
                  <Unlock className="h-4 w-4 mr-1" /> Registrations Open
                </Badge>
              )}
              <Switch 
                checked={!isSubmissionLocked} 
                onCheckedChange={handleToggleLock} 
                disabled={loadingLockStatus}
              />
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex justify-center p-8">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          </div>
        ) : error ? (
          <div className="text-center p-4">
            <p className="text-red-500 mb-2">{error}</p>
            <Button onClick={loadNINs} variant="outline">
              Try Again
            </Button>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center p-6 bg-slate-50 rounded-md">
            <p className="text-slate-500">No NIN records found.</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>NIN</TableHead>
                  <TableHead>Wallet Address</TableHead>
                  <TableHead>Registration Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.wallet_address}>
                    <TableCell className="font-mono">{user.nin}</TableCell>
                    <TableCell className="font-mono truncate max-w-[120px]">{user.wallet_address}</TableCell>
                    <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {user.status === 'Y' ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          Verified
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                          Pending
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant={user.status === 'Y' ? "destructive" : "default"} 
                        size="sm"
                        onClick={() => handleToggleVerification(user.wallet_address, user.status)}
                        className={user.status === 'Y' ? "" : "bg-green-600 hover:bg-green-700 text-white"}
                      >
                        {user.status === 'Y' ? (
                          <>
                            <XCircle className="h-4 w-4 mr-1" />
                            Revoke
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Verify
                          </>
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}