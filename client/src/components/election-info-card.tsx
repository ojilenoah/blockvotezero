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
import { NoActiveElection } from "@/components/no-active-election";
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
        console.log("Active election ID:", activeElectionId);

        if (activeElectionId > 0) {
          // Get election info
          const electionInfo = await getElectionInfo(activeElectionId);
          console.log("Election info:", electionInfo);

          if (electionInfo) {
            setElectionData({
              id: activeElectionId,
              title: electionInfo.name,
              dateRange: `${electionInfo.startTime.toLocaleDateString()} - ${electionInfo.endTime.toLocaleDateString()}`,
              schedule: `Voting ${electionInfo.upcoming ? 'starts' : 'closes'} at ${electionInfo.upcoming ? electionInfo.startTime.toLocaleTimeString() : electionInfo.endTime.toLocaleTimeString()}`,
              description: electionInfo.upcoming
                ? "This election is scheduled to start soon. Be ready to cast your vote!"
                : "Your vote matters. Participate in this election to make your voice heard.",
              isActive: electionInfo.active,
              isUpcoming: electionInfo.upcoming,
              startTime: electionInfo.startTime,
              endTime: electionInfo.endTime
            });

            // Get candidates if election has started (active or ended)
            if (!electionInfo.upcoming) {
              const candidateList = await getAllCandidates(activeElectionId);
              console.log("Candidates:", candidateList);

              if (candidateList && candidateList.length > 0) {
                const totalVotes = await getTotalVotes(activeElectionId);
                const candidatesWithPercentages = candidateList.map(candidate => ({
                  name: candidate.name,
                  party: candidate.party,
                  votes: candidate.votes || 0,
                  percentage: totalVotes > 0 ? Math.round((candidate.votes / totalVotes) * 100) : 0
                }));

                setCandidates(candidatesWithPercentages);
              }
            }
          } else {
            setElectionData(null);
          }
        } else {
          setElectionData(null);
        }
      } catch (error: any) {
        console.error("Error fetching election data:", error);
        setError(error?.message || "Failed to load election data");
        toast({
          title: "Error",
          description: "Failed to load election data",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchElectionData();
    const interval = setInterval(fetchElectionData, 30000);
    return () => clearInterval(interval);
  }, [toast]);

  if (loading) {
    return (
      <Card className="bg-white shadow-md rounded-lg p-6 mb-8">
        <div className="flex justify-center items-center h-48">
          <p className="text-gray-500">Loading election data...</p>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-white shadow-md rounded-lg p-6 mb-8">
        <div className="flex justify-center items-center h-48 flex-col">
          <p className="text-red-500 mb-2">Error loading election data</p>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      </Card>
    );
  }

  if (!electionData) {
    return (
      <Card className="bg-white shadow-md rounded-lg p-6 mb-8">
        <NoActiveElection 
          title="No Active Election"
          description="There is currently no active election. Check back later or contact the administrator."
          showSchedule={true}
          showButtons={true}
        />
      </Card>
    );
  }

  return (
    <Card className="bg-white shadow-md rounded-lg p-6 mb-8">
      <div className="flex flex-col lg:flex-row">
        <div className="flex-1 mb-6 lg:mb-0 lg:mr-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">
            {electionData.title}
          </h2>
          <div className="mb-4">
            <div className="flex items-center text-sm text-gray-500 mb-2">
              <svg className="mr-1.5 h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
              </svg>
              <span>{electionData.dateRange}</span>
            </div>
            <div className="flex items-center text-sm text-gray-500">
              <svg className="mr-1.5 h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
              <span>{electionData.schedule}</span>
            </div>
          </div>
          <p className="text-gray-600 text-sm mb-4">
            {electionData.description}
          </p>

          <Link href="/vote">
            <Button 
              className="mt-2"
              disabled={!electionData.isActive}
            >
              {electionData.isUpcoming 
                ? "Election starts soon"
                : electionData.isActive 
                  ? "Cast Your Vote"
                  : "Election has ended"}
            </Button>
          </Link>
        </div>

        {!electionData.isUpcoming && candidates.length > 0 && (
          <div className="flex-1 lg:border-l lg:pl-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Real-time Results</h3>
              <div className="inline-flex shadow-sm rounded-md">
                <button 
                  type="button" 
                  className={`relative inline-flex items-center px-3 py-1.5 rounded-l-md border border-gray-300 ${viewMode === 'chart' ? 'bg-primary text-white' : 'bg-white text-gray-700'} text-xs font-medium hover:bg-gray-50 focus:z-10 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary`}
                  onClick={() => setViewMode('chart')}
                >
                  Chart
                </button>
                <button 
                  type="button" 
                  className={`relative inline-flex items-center px-3 py-1.5 rounded-r-md border border-gray-300 ${viewMode === 'table' ? 'bg-primary text-white' : 'bg-white text-gray-700'} text-xs font-medium hover:bg-gray-50 focus:z-10 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary`}
                  onClick={() => setViewMode('table')}
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
                      paddingAngle={0}
                      dataKey="percentage"
                      nameKey="name"
                    >
                      {candidates.map((entry, index) => (
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
            ) : (
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg mb-4">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Candidate</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Party</th>
                      <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">Votes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {candidates.map((candidate, index) => (
                      <tr key={index}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">{candidate.name}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{candidate.party}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-right text-gray-500">{candidate.votes} ({candidate.percentage}%)</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {viewMode === 'chart' && (
              <div className="mt-4 space-y-3">
                {candidates.map((candidate, index) => (
                  <div className="flex items-center" key={index}>
                    <div 
                      className="w-4 h-4 rounded-full mr-2" 
                      style={{ backgroundColor: candidateColors[index % candidateColors.length] }}
                    ></div>
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-900">{candidate.name}</span>
                        <span className="text-sm text-gray-500">{candidate.percentage}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                        <div 
                          className="h-1.5 rounded-full" 
                          style={{ 
                            width: `${candidate.percentage}%`,
                            backgroundColor: candidateColors[index % candidateColors.length]
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}