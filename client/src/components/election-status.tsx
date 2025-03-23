import { useState, useEffect } from "react";
import { getActiveElectionId, getElectionInfo } from "@/utils/blockchain";

export function ElectionStatus() {
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null);
  const [status, setStatus] = useState<"Active" | "Upcoming" | "Inactive" | "Loading">("Loading");
  const [electionEndTime, setElectionEndTime] = useState<Date | null>(null);
  const [electionStartTime, setElectionStartTime] = useState<Date | null>(null);

  // Fetch active election data
  useEffect(() => {
    const fetchElectionData = async () => {
      try {
        const activeElectionId = await getActiveElectionId();
        
        if (activeElectionId > 0) {
          const electionInfo = await getElectionInfo(activeElectionId);
          
          if (electionInfo) {
            // Check if current time is between start and end time
            const now = new Date();
            const startTime = new Date(electionInfo.startTime);
            const endTime = new Date(electionInfo.endTime);
            
            console.log("[ElectionStatus] Current time:", now);
            console.log("[ElectionStatus] Election start time:", startTime);
            console.log("[ElectionStatus] Election end time:", endTime);
            
            if (now >= startTime && now <= endTime) {
              setStatus("Active");
              setElectionEndTime(endTime);
              setTimeRemaining(null); // Let the countdown timer handle this
            } else if (now < startTime) {
              // This is an upcoming election
              setStatus("Upcoming");
              setElectionStartTime(startTime);
              
              // Calculate time until election starts
              const timeUntilStart = startTime.getTime() - now.getTime();
              const days = Math.floor(timeUntilStart / (1000 * 60 * 60 * 24));
              const hours = Math.floor((timeUntilStart % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
              const minutes = Math.floor((timeUntilStart % (1000 * 60 * 60)) / (1000 * 60));
              
              if (days > 0) {
                setTimeRemaining(`Starts in ${days} day${days > 1 ? 's' : ''} ${hours} hour${hours > 1 ? 's' : ''}`);
              } else if (hours > 0) {
                setTimeRemaining(`Starts in ${hours} hour${hours > 1 ? 's' : ''} ${minutes} minute${minutes > 1 ? 's' : ''}`);
              } else {
                setTimeRemaining(`Starts in ${minutes} minute${minutes > 1 ? 's' : ''}`);
              }
            } else {
              // This election is over
              setStatus("Inactive");
              setTimeRemaining(null);
            }
          } else {
            setStatus("Inactive");
            setTimeRemaining(null);
          }
        } else {
          setStatus("Inactive");
          setTimeRemaining(null);
        }
      } catch (error) {
        console.error("Error fetching election status:", error);
        setStatus("Inactive");
      }
    };

    fetchElectionData();
    
    // Poll for updates every 30 seconds
    const interval = setInterval(fetchElectionData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Update countdown timer for active elections
  useEffect(() => {
    if (!electionEndTime || status !== "Active") return;

    const updateRemainingTime = () => {
      const now = new Date();
      const remainingMs = electionEndTime.getTime() - now.getTime();
      
      if (remainingMs <= 0) {
        setStatus("Inactive");
        setTimeRemaining(null);
        return;
      }
      
      const days = Math.floor(remainingMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((remainingMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
      
      if (days > 0) {
        setTimeRemaining(`${days} day${days > 1 ? 's' : ''} ${hours} hour${hours > 1 ? 's' : ''} remaining`);
      } else if (hours > 0) {
        setTimeRemaining(`${hours} hour${hours > 1 ? 's' : ''} ${minutes} minute${minutes > 1 ? 's' : ''} remaining`);
      } else {
        setTimeRemaining(`${minutes} minute${minutes > 1 ? 's' : ''} remaining`);
      }
    };
    
    updateRemainingTime();
    const timer = setInterval(updateRemainingTime, 60000); // update every minute
    
    return () => clearInterval(timer);
  }, [electionEndTime, status]);

  // Define status indicator color and animation
  const getStatusStyle = () => {
    switch (status) {
      case "Active":
        return "bg-green-500 animate-pulse shadow-lg shadow-green-200"; // Blinking green for active
      case "Upcoming":
        return "bg-orange-500 animate-pulse shadow-lg shadow-orange-200"; // Blinking orange for upcoming
      case "Loading":
        return "bg-yellow-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Election Dashboard</h1>
        <div className="flex space-x-2">
          <div className="flex items-center text-sm">
            <div className={`h-4 w-4 rounded-full ${getStatusStyle()} mr-2`}></div>
            <span className="font-medium">{status}</span>
          </div>
          {timeRemaining && (
            <span className="text-sm text-gray-500">{timeRemaining}</span>
          )}
        </div>
      </div>
    </div>
  );
}
