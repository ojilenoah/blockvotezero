import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import {
  getActiveElectionId,
  getElectionInfo,
  getAllCandidates,
  getTotalVotes,
} from "@/utils/blockchain";
import { candidateColors } from "@/data/mock-data";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

export function ElectionInfoCard() {
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');
  const [electionData, setElectionData] = useState<any>(null);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchElectionData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get active election ID
        const activeElectionId = await getActiveElectionId();

        if (!activeElectionId || activeElectionId <= 0) {
          setElectionData(null);
          setCandidates([]);
          return;
        }

        // Get election info
        const electionInfo = await getElectionInfo(activeElectionId);

        if (!electionInfo || !electionInfo.name) {
          throw new Error("Failed to fetch election information");
        }

        setElectionData({
          id: activeElectionId,
          title: electionInfo.name,
          startTime: new Date(electionInfo.startTime),
          endTime: new Date(electionInfo.endTime),
          isActive: electionInfo.active,
          isUpcoming: electionInfo.upcoming
        });

        // Only fetch candidates if election has started
        if (!electionInfo.upcoming) {
          const candidateList = await getAllCandidates(activeElectionId);
          const totalVotes = await getTotalVotes(activeElectionId);

          if (candidateList && candidateList.length > 0) {
            const candidatesWithStats = candidateList.map(candidate => ({
              name: candidate.name,
              party: candidate.party,
              votes: candidate.votes || 0,
              percentage: totalVotes > 0 ? Math.round((candidate.votes / totalVotes) * 100) : 0
            }));
            setCandidates(candidatesWithStats);
          }
        }
      } catch (error: any) {
        console.error("Error fetching election data:", error);
        setError(error?.message || "Failed to load election data");
      } finally {
        setLoading(false);
      }
    };

    fetchElectionData();
    const interval = setInterval(fetchElectionData, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [toast]);

  if (loading) {
    return (
      <Card className="bg-white shadow-md rounded-lg p-6 mb-8">
        <div className="flex justify-center items-center h-48">
          <div className="animate-pulse text-gray-500">Loading election data...</div>
        </div>
      </Card>
    );
  }

  if (error || !electionData) {
    return null; // Don't show anything if there's no active election
  }

  const timeUntil = electionData.isUpcoming
    ? `Starts ${electionData.startTime.toLocaleDateString()} at ${electionData.startTime.toLocaleTimeString()}`
    : `Ends ${electionData.endTime.toLocaleDateString()} at ${electionData.endTime.toLocaleTimeString()}`;

  return (
    <Card className="bg-white shadow-md rounded-lg p-6 mb-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left side - Election Information */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-gray-900">
              {electionData.title}
            </h2>
            <div className="flex items-center space-x-2">
              <div className={`h-3 w-3 rounded-full ${electionData.isActive ? 'bg-green-500' : 'bg-yellow-500'}`} />
              <span className="text-sm text-gray-600">
                {electionData.isActive ? 'Active' : 'Upcoming'}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center text-sm text-gray-600">
              <svg className="mr-2 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {timeUntil}
            </div>
          </div>

          {electionData.isActive && (
            <Link href="/vote">
              <Button className="w-full mt-4">
                Cast Your Vote
              </Button>
            </Link>
          )}
        </div>

        {/* Right side - Candidates Information */}
        {candidates.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Current Results</h3>
              <div className="flex space-x-2 text-sm">
                <button
                  onClick={() => setViewMode('chart')}
                  className={`px-3 py-1 rounded-md ${viewMode === 'chart' ? 'bg-primary text-white' : 'bg-gray-100'}`}
                >
                  Chart
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-3 py-1 rounded-md ${viewMode === 'table' ? 'bg-primary text-white' : 'bg-gray-100'}`}
                >
                  Table
                </button>
              </div>
            </div>

            {viewMode === 'chart' ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={candidates}
                      cx="50%"
                      cy="50%"
                      innerRadius="60%"
                      outerRadius="80%"
                      dataKey="percentage"
                    >
                      {candidates.map((_, index) => (
                        <Cell 
                          key={`cell-${index}`}
                          fill={candidateColors[index % candidateColors.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: any) => [`${value}%`, 'Votes']}
                      contentStyle={{ background: 'white', border: '1px solid #ccc' }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                <div className="mt-4 space-y-2">
                  {candidates.map((candidate, index) => (
                    <div key={index} className="flex items-center text-sm">
                      <div 
                        className="w-3 h-3 rounded-full mr-2"
                        style={{ backgroundColor: candidateColors[index % candidateColors.length] }}
                      />
                      <span className="flex-1">{candidate.name}</span>
                      <span className="font-medium">{candidate.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-900">Candidate</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-900">Party</th>
                      <th className="px-4 py-2 text-right text-sm font-medium text-gray-900">Votes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {candidates.map((candidate, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2 text-sm text-gray-900">{candidate.name}</td>
                        <td className="px-4 py-2 text-sm text-gray-500">{candidate.party}</td>
                        <td className="px-4 py-2 text-sm text-right text-gray-900">
                          {candidate.votes} ({candidate.percentage}%)
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}