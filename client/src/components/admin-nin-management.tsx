import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Loader2, CheckCircle, XCircle, Lock, Unlock } from "lucide-react";
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
      const data = await getAllNINs();
      setUsers(data);
    } catch (err: any) {
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
      const locked = await checkNINSubmissionLocked();
      setIsSubmissionLocked(locked);
    } catch (err: any) {
      toast({
        title: "Error",
        description: "Failed to load submission lock status",
        variant: "destructive",
      });
    } finally {
      setLoadingLockStatus(false);
    }
  };

  useEffect(() => {
    if (isConnected && account) {
      loadNINs();
      loadLockStatus();
    }
  }, [isConnected, account]);

  const handleToggleVerification = async (userId: string, currentStatus: 'Y' | 'N') => {
    const newStatus = currentStatus === 'Y' ? 'N' : 'Y';
    
    try {
      // Update user in the local state to show immediate feedback
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId 
            ? { ...user, verification_status: newStatus } 
            : user
        )
      );
      
      // Call the API to update the status
      const result = await updateNINVerificationStatus(userId, newStatus);
      
      if (!result.success) {
        // If the API call fails, revert the local state
        setUsers(prevUsers => 
          prevUsers.map(user => 
            user.id === userId 
              ? { ...user, verification_status: currentStatus } 
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
      toast({
        title: "Error",
        description: err.message || "Failed to update verification status",
        variant: "destructive",
      });
    }
  };

  const handleToggleLock = async () => {
    setLoadingLockStatus(true);
    
    try {
      const newLockStatus = !isSubmissionLocked;
      
      // Optimistically update UI
      setIsSubmissionLocked(newLockStatus);
      
      // Call the API to update the lock status
      const result = await toggleNINSubmissionLock(newLockStatus);
      
      if (!result.success) {
        // If the API call fails, revert the local state
        setIsSubmissionLocked(!newLockStatus);
        throw new Error(result.error || "Failed to toggle submission lock");
      }
      
      toast({
        title: "Success",
        description: `NIN submissions are now ${newLockStatus ? 'locked' : 'unlocked'}`,
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to toggle submission lock",
        variant: "destructive",
      });
    } finally {
      setLoadingLockStatus(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>NIN Verification Management</CardTitle>
        <CardDescription>
          Manage and verify National Identification Numbers submitted by users.
        </CardDescription>
        <div className="flex items-center space-x-2 mt-4">
          <span className="text-sm font-medium">NIN Submissions: </span>
          {loadingLockStatus ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Switch 
                checked={!isSubmissionLocked} 
                onCheckedChange={() => handleToggleLock()} 
                disabled={loadingLockStatus} 
              />
              <span className="text-sm">
                {isSubmissionLocked ? (
                  <Badge variant="destructive" className="flex items-center gap-1">
                    <Lock className="h-3 w-3" /> Locked
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 flex items-center gap-1">
                    <Unlock className="h-3 w-3" /> Unlocked
                  </Badge>
                )}
              </span>
            </>
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
                  <TableRow key={user.id}>
                    <TableCell className="font-mono">{user.nin}</TableCell>
                    <TableCell className="font-mono truncate max-w-[120px]">{user.wallet_address}</TableCell>
                    <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {user.verification_status === 'Y' ? (
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
                        variant={user.verification_status === 'Y' ? "destructive" : "default"} 
                        size="sm"
                        onClick={() => handleToggleVerification(user.id, user.verification_status)}
                        className={user.verification_status === 'Y' ? "" : "bg-green-600 hover:bg-green-700 text-white"}
                      >
                        {user.verification_status === 'Y' ? (
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
        
        <div className="mt-4 flex justify-end">
          <Button 
            variant="outline" 
            onClick={loadNINs}
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Refresh
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}