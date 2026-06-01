// This file contains placeholder data for the election voting system
// In a real application, this would be fetched from a backend API

// Brutalist palette — high-contrast hues that read at small sizes.
export const candidateColors = [
  '#FF4D00',  // signal orange
  '#0A0A0A',  // ink
  '#00874D',  // deep green
  '#1E40AF',  // cobalt
  '#7C3AED',  // violet
  '#DC2626',  // siren red
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
    isActive: true,
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

  // User info for voter panel
  voterInfo: {
    name: "John A. Citizen",
    nin: "12345678901",
    registrationDate: "March 15, 2020",
    votingDistrict: "Central District"
  },

  // Candidates for the voter panel
  candidates: [
    {
      id: 1,
      name: "Sarah Johnson",
      party: "Progressive Alliance",
      profileImage: "",
      biography: "Former educator with 15 years of experience in community organizing. Focused on educational reform and environmental sustainability initiatives."
    },
    {
      id: 2,
      name: "Michael Chen",
      party: "Unity Coalition",
      profileImage: "",
      biography: "Tech entrepreneur and community advocate. Passionate about digital inclusion and modernizing community services through technology."
    },
    {
      id: 3,
      name: "Alex Rodriguez",
      party: "Community First",
      profileImage: "",
      biography: "Small business owner and neighborhood association president. Dedicated to economic development and supporting local businesses."
    },
    {
      id: 4,
      name: "Jamie Taylor",
      party: "Forward Together",
      profileImage: "",
      biography: "Civil rights attorney with a focus on housing equality. Advocates for affordable housing and tenant protection measures."
    },
    {
      id: 5,
      name: "Dana Williams",
      party: "Independent",
      profileImage: "",
      biography: "Community organizer and social worker. Focuses on youth programs and mental health services for underserved populations."
    },
    {
      id: 6,
      name: "Morgan Lee",
      party: "People's Party",
      profileImage: "",
      biography: "Urban planner with expertise in sustainable development. Advocates for public transportation improvements and green spaces."
    }
  ]
};
