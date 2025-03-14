import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  getActiveElectionId,
  getElectionInfo,
  getAllCandidates,
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
      console.log("Testing getActiveElectionId...");
      const activeId = await getActiveElectionId();
      results.activeElectionId = activeId;
      console.log("Active Election ID:", activeId);

      if (activeId > 0) {
        // Test 2: Get Election Info
        console.log("Testing getElectionInfo...");
        const electionInfo = await getElectionInfo(activeId);
        results.electionInfo = electionInfo;
        console.log("Election Info:", electionInfo);

        // Test 3: Get All Candidates
        console.log("Testing getAllCandidates...");
        const candidates = await getAllCandidates(activeId);
        results.candidates = candidates;
        console.log("Candidates:", candidates);
      }

      setTestResults(results);
      toast({
        title: "Test completed",
        description: "Check the console for detailed results",
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
          </div>
        )}
      </CardContent>
    </Card>
  );
}