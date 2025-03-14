import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getStatusBadge } from "@/utils/ui-helpers";
import { CONTRACT_ADDRESS } from "@/utils/blockchain";
import type { Election } from "@/pages/explorer";

interface AdminElectionLogProps {
  elections: Election[];
  isLoading: boolean;
}

export function AdminElectionLog({ elections, isLoading }: AdminElectionLogProps) {
  // Format address for display
  const formatAddress = (address: string) => {
    if (!address) return "";
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Election History</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-gray-500">Loading elections from blockchain...</p>
          </div>
        ) : !elections?.length ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No elections found on the blockchain</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {elections.map((election) => (
              <div className="py-4" key={election.id}>
                <h3 className="text-lg font-medium">{election.name}</h3>
                <p className="text-sm text-gray-500">
                  {new Date(election.startTime).toLocaleDateString()} - {new Date(election.endTime).toLocaleDateString()}
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
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
