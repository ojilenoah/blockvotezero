// This file contains placeholder data for the election voting system
// In a real application, this would be fetched from a backend API

export const candidateColors = [
  'rgb(59, 130, 246)',   // blue-500
  'rgb(99, 102, 241)',   // indigo-500
  'rgb(168, 85, 247)',   // purple-500
  'rgb(236, 72, 153)',   // pink-500
];

export const mockElectionData = {
  currentElection: {
    id: 1,
    title: "2023 Community Council Election",
    dateRange: "October 5, 2023 - October 12, 2023",
    schedule: "Voting closes at 23:59 UTC",
    description: "Vote for representatives to serve on the community council for the next 12 months. Council members will help guide platform development and community initiatives.",
    status: "Active",
    votesCount: "2,450",
    eligibleVoters: "5,400",
    participationPercentage: 45,
  },
  
  topCandidates: [
    {
      id: 1,
      name: "Sarah Johnson",
      percentage: 32,
    },
    {
      id: 2,
      name: "Michael Chen",
      percentage: 28,
    },
    {
      id: 3,
      name: "Alex Rodriguez",
      percentage: 21,
    },
    {
      id: 4,
      name: "Jamie Taylor",
      percentage: 19,
    },
  ],
  
  previousElections: [
    {
      id: 2,
      title: "2022 Community Council Election",
      dateRange: "Oct 10, 2022 - Oct 17, 2022",
      status: "Completed",
      participation: "4,218 votes (78% participation)",
    },
    {
      id: 3,
      title: "2021 Community Council Election",
      dateRange: "Oct 12, 2021 - Oct 19, 2021",
      status: "Completed",
      participation: "3,756 votes (72% participation)",
    },
    {
      id: 4,
      title: "Treasury Allocation Proposal #45",
      dateRange: "Jul 5, 2021 - Jul 12, 2021",
      status: "Completed",
      participation: "4,192 votes (81% participation)",
    },
  ],
};
