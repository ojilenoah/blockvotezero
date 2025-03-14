import { useState, useEffect } from "react";
import { getActiveElectionId, getElectionInfo } from "@/utils/blockchain";

export function ElectionStatus() {
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null);
  const [status, setStatus] = useState<"Active" | "Inactive" | "Loading">("Loading");
  const [electionEndTime, setElectionEndTime] = useState<Date | null>(null);

  // Fetch active election data
  useEffect(() => {
    const fetchElectionData = async () => {
      try {
        const activeElectionId = await getActiveElectionId();
        
        if (activeElectionId > 0) {
          const electionInfo = await getElectionInfo(activeElectionId);
          
          if (electionInfo && electionInfo.active) {
            setStatus("Active");
            setElectionEndTime(new Date(electionInfo.endTime));
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

  // Update countdown timer
  useEffect(() => {
    if (!electionEndTime) return;

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
  }, [electionEndTime]);

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Election Dashboard</h1>
        <div className="flex space-x-2">
          <div className="flex items-center text-sm">
            <div className={`h-3 w-3 rounded-full ${status === "Active" ? "bg-green-500" : status === "Loading" ? "bg-yellow-500" : "bg-gray-500"} mr-2`}></div>
            <span>{status}</span>
          </div>
          {timeRemaining && (
            <span className="text-sm text-gray-500">{timeRemaining}</span>
          )}
        </div>
      </div>
    </div>
  );
}
