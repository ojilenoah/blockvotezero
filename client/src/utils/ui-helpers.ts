import { ReactNode } from "react";
import { jsx as _jsx } from "react/jsx-runtime";

export const getStatusBadge = (status: string): ReactNode => {
  const baseClasses = "text-xs px-2 py-1 rounded";

  switch (status) {
    case "Active":
      return _jsx("div", {
        className: `${baseClasses} bg-green-100 text-green-800`,
        children: "Active"
      });
    case "Completed":
      return _jsx("div", {
        className: `${baseClasses} bg-blue-100 text-blue-800`,
        children: "Completed"
      });
    case "Upcoming":
      return _jsx("div", {
        className: `${baseClasses} bg-yellow-100 text-yellow-800`,
        children: "Upcoming"
      });
    default:
      return _jsx("div", {
        className: `${baseClasses} bg-gray-100 text-gray-800`,
        children: status
      });
  }
};