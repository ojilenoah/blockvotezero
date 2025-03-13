import { useState, useEffect } from "react";

export function ElectionStatus() {
  const [timeRemaining, setTimeRemaining] = useState("23 hours remaining");
  
  // This would normally be fetched from an API
  const status = "Active";

  // Simulate countdown timer - would be replaced with actual end time calculation
  useEffect(() => {
    const timer = setInterval(() => {
      // This is a placeholder to simulate a countdown
      const hours = Math.floor(Math.random() * 23) + 1;
      setTimeRemaining(`${hours} hours remaining`);
    }, 60000); // update every minute

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Election Dashboard</h1>
        <div className="flex space-x-2">
          <div className="flex items-center text-sm">
            <div className="h-3 w-3 rounded-full bg-green-500 mr-2"></div>
            <span>{status}</span>
          </div>
          <span className="text-sm text-gray-500">{timeRemaining}</span>
        </div>
      </div>
    </div>
  );
}
