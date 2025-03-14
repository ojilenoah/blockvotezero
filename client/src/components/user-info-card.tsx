import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface UserInfoCardProps {
  userInfo: {
    name?: string;
    nin: string;
    registrationDate?: string;
    votingDistrict?: string;
  };
}

export function UserInfoCard({ userInfo }: UserInfoCardProps) {
  return (
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <CardTitle>Voter Information</CardTitle>
        <CardDescription>Verified voter details</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Full Name</p>
            <p className="font-medium">{userInfo.name || "Voter name not available"}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">National ID (NIN)</p>
            <p className="font-medium">{userInfo.nin}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Registration Date</p>
            <p className="font-medium">{userInfo.registrationDate || "Not registered"}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Voting District</p>
            <p className="font-medium">{userInfo.votingDistrict || "District not assigned"}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}