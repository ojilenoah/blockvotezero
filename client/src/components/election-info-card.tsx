import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import {
  getActiveElectionId,
  getElectionInfo,
  getAllCandidates,
  getTotalVotes,
} from "@/utils/blockchain";
import { candidateColors } from "@/data/mock-data";

export function ElectionInfoCard() {
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');

  // Query for active election data
  const { data: electionData, isLoading } = useQuery({
    queryKey: ['activeElection'],
    queryFn: async () => {
      console.log("Fetching election data for info card...");
      const activeElectionId = await getActiveElectionId();
      console.log("Active election ID:", activeElectionId);

      if (!activeElectionId) {
        console.log("No active election ID found");
        return null;
      }

      const electionInfo = await getElectionInfo(activeElectionId);
      console.log("Election info:", electionInfo);

      if (!electionInfo) {
        console.log("No election info found");
        return null;
      }

      // Get candidates and votes
      const candidates = await getAllCandidates(activeElectionId);
      console.log("Candidates:", candidates);
      const totalVotes = await getTotalVotes(activeElectionId);
      console.log("Total votes:", totalVotes);

      // Process and return the data
      return {
        id: activeElectionId,
        name: electionInfo.name,
        startTime: electionInfo.startTime,
        endTime: electionInfo.endTime,
        active: electionInfo.active,
        candidates: candidates.map(candidate => ({
          ...candidate,
          percentage: totalVotes > 0 ? Math.round((candidate.votes / totalVotes) * 100) : 0
        })),
        totalVotes
      };
    },
    staleTime: 30000, // Consider data fresh for 30 seconds
    refetchInterval: 60000, // Only refetch every minute
  });

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="h-48 flex items-center justify-center">
          <p className="text-gray-500">Loading election data...</p>
        </div>
      </Card>
    );
  }

  if (!electionData?.active) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900">No Active Election</h3>
          <p className="mt-2 text-sm text-gray-500">There are currently no active elections. Check back later for upcoming elections.</p>
        </div>
      </Card>
    );
  }

  const timeRemaining = new Date(electionData.endTime).getTime() - Date.now();
  const daysRemaining = Math.max(0, Math.floor(timeRemaining / (1000 * 60 * 60 * 24)));
  const hoursRemaining = Math.max(0, Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)));

  return (
    <Card className="p-6">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left side - Election Info */}
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{electionData.name}</h2>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">Election Period</p>
              <p className="font-medium">
                {new Date(electionData.startTime).toLocaleDateString()} - {new Date(electionData.endTime).toLocaleDateString()}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Time Remaining</p>
              <p className="font-medium">
                {daysRemaining} days {hoursRemaining} hours
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Total Votes Cast</p>
              <p className="font-medium">{electionData.totalVotes.toLocaleString()}</p>
            </div>

            <Link href="/vote">
              <Button className="w-full mt-4" size="lg">
                Cast Your Vote
              </Button>
            </Link>
          </div>
        </div>

        {/* Right side - Candidate Stats */}
        <div className="flex-1 lg:border-l lg:pl-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium">Current Results</h3>
            <div className="inline-flex rounded-md shadow-sm">
              <button
                type="button"
                className={`px-3 py-1.5 text-sm font-medium rounded-l-md border ${
                  viewMode === 'chart'
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
                onClick={() => setViewMode('chart')}
              >
                Chart
              </button>
              <button
                type="button"
                className={`px-3 py-1.5 text-sm font-medium rounded-r-md border ${
                  viewMode === 'table'
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
                onClick={() => setViewMode('table')}
              >
                Table
              </button>
            </div>
          </div>

          {viewMode === 'chart' ? (
            <>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={electionData.candidates}
                      cx="50%"
                      cy="50%"
                      innerRadius="60%"
                      outerRadius="80%"
                      dataKey="percentage"
                      nameKey="name"
                    >
                      {electionData.candidates.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={candidateColors[index % candidateColors.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => [`${value}%`, '']}
                      labelFormatter={(name) => `${name}`}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-4 space-y-3">
                {electionData.candidates.map((candidate, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: candidateColors[index % candidateColors.length] }}
                    />
                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{candidate.name}</span>
                        <span className="text-sm text-gray-500">{candidate.percentage}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                        <div
                          className="h-1.5 rounded-full"
                          style={{
                            width: `${candidate.percentage}%`,
                            backgroundColor: candidateColors[index % candidateColors.length]
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="overflow-hidden rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Candidate</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Party</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Votes</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">%</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {electionData.candidates.map((candidate, index) => (
                    <tr key={index}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{candidate.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{candidate.party}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-500">{candidate.votes.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">{candidate.percentage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}