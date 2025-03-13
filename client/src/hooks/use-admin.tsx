
import { useState, useEffect } from "react";
import { useMetaMask } from "./use-metamask";
import { isAdmin } from "../../../utils/blockchain";

export function useAdmin() {
  const { isConnected, account } = useMetaMask();
  const [isAdminUser, setIsAdminUser] = useState<boolean>(false);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkIfAdmin = async () => {
      if (!isConnected || !account) {
        setIsAdminUser(false);
        return;
      }

      setIsCheckingAdmin(true);
      setError(null);

      try {
        const adminCheck = await isAdmin(account);
        setIsAdminUser(adminCheck);
        
        // Update session storage
        if (adminCheck) {
          sessionStorage.setItem("isAdmin", "true");
          sessionStorage.setItem("adminAddress", account);
        } else {
          sessionStorage.removeItem("isAdmin");
          sessionStorage.removeItem("adminAddress");
        }
      } catch (err: any) {
        console.error("Error checking admin status:", err);
        setError(err.message || "Failed to verify admin status");
        setIsAdminUser(false);
      } finally {
        setIsCheckingAdmin(false);
      }
    };

    checkIfAdmin();
  }, [isConnected, account]);

  const logout = () => {
    sessionStorage.removeItem("isAdmin");
    sessionStorage.removeItem("adminAddress");
  };

  return { 
    isAdmin: isAdminUser, 
    isCheckingAdmin, 
    error,
    logout
  };
}
