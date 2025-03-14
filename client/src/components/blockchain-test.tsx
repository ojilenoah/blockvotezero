import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  getActiveElectionId,
  getElectionInfo,
  getAllCandidates,
  getTotalVotes,
  CONTRACT_ADDRESS,
} from "@/utils/blockchain";

export function BlockchainTest() {
  const { toast } = useToast();
  const [testResults, setTestResults] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(false);

  const runTests = async () => {
    setIsLoading(true);
    const results: Record<string, any> = {
      contractAddress: CONTRACT_ADDRESS,
    };

    try {
      // Test 1: Get Active Election ID
      console.log("Test 1: Getting active election ID...");
      const activeId = await getActiveElectionId();
      results.activeElectionId = activeId;
      console.log("Active Election ID:", activeId);

      if (activeId > 0) {
        // Test 2: Get Election Info
        console.log("Test 2: Getting election info...");
        const electionInfo = await getElectionInfo(activeId);

        if (electionInfo) {
          // Add date objects for testing time calculations
          const now = new Date();
          const startTime = new Date(electionInfo.startTime);
          const endTime = new Date(electionInfo.endTime);
          const isActive = now >= startTime && now <= endTime;

          results.electionInfo = {
            ...electionInfo,
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            calculatedActive: isActive,
            now: now.toISOString()
          };
          console.log("Election Info:", results.electionInfo);

          // Test 3: Get All Candidates
          console.log("Test 3: Getting candidates...");
          const candidates = await getAllCandidates(activeId);
          results.candidates = candidates;
          console.log("Candidates:", candidates);

          // Test 4: Get Total Votes
          console.log("Test 4: Getting total votes...");
          const totalVotes = await getTotalVotes(activeId);
          results.totalVotes = totalVotes;
          console.log("Total Votes:", totalVotes);
        }
      }

      setTestResults(results);
      toast({
        title: "Test completed",
        description: "Check the console and results below for details",
      });
    } catch (error: any) {
      console.error("Test failed:", error);
      toast({
        title: "Test failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="mb-4">
          <h2 className="text-xl font-semibold mb-2">Blockchain Connection Test</h2>
          <p className="text-sm text-gray-500 mb-4">Tests connection to blockchain and retrieves election data</p>
          <Button onClick={runTests} disabled={isLoading}>
            {isLoading ? "Testing..." : "Run Test"}
          </Button>
        </div>

        {Object.keys(testResults).length > 0 && (
          <div className="mt-4 space-y-4">
            <div>
              <h3 className="font-medium">Contract Address:</h3>
              <code className="block bg-gray-100 p-2 rounded text-sm">
                {testResults.contractAddress}
              </code>
            </div>

            <div>
              <h3 className="font-medium">Active Election ID:</h3>
              <code className="block bg-gray-100 p-2 rounded text-sm">
                {testResults.activeElectionId || "No active election"}
              </code>
            </div>

            {testResults.electionInfo && (
              <div>
                <h3 className="font-medium">Election Info:</h3>
                <pre className="block bg-gray-100 p-2 rounded text-sm overflow-auto">
                  {JSON.stringify(testResults.electionInfo, null, 2)}
                </pre>
              </div>
            )}

            {testResults.candidates && (
              <div>
                <h3 className="font-medium">Candidates:</h3>
                <pre className="block bg-gray-100 p-2 rounded text-sm overflow-auto">
                  {JSON.stringify(testResults.candidates, null, 2)}
                </pre>
              </div>
            )}

            {testResults.totalVotes !== undefined && (
              <div>
                <h3 className="font-medium">Total Votes:</h3>
                <code className="block bg-gray-100 p-2 rounded text-sm">
                  {testResults.totalVotes}
                </code>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}