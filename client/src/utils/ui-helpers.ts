import { ReactNode } from "react";

export const getStatusBadge = (status: string): ReactNode => {
  switch (status) {
    case "Active":
      return <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Active</div>;
    case "Completed":
      return <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Completed</div>;
    case "Upcoming":
      return <div className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Upcoming</div>;
    default:
      return <div className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">{status}</div>;
  }
};
