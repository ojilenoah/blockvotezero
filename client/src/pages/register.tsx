import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { NinRegistrationForm } from "@/components/nin-registration-form";
import { NinStatusCheck } from "@/components/nin-status-check";

export default function Register() {
  const [currentTab, setCurrentTab] = useState<string>("register");
  
  const handleSuccessfulRegistration = () => {
    // Switch to status tab after successful registration
    setCurrentTab("status");
  };
  
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              NIN Verification Portal
            </h1>
            <p className="mt-2 text-lg text-gray-600">
              Register your National Identification Number to participate in elections.
            </p>
          </div>

          <div className="max-w-md mx-auto">
            <Tabs defaultValue="register" value={currentTab} onValueChange={setCurrentTab}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="register">Register NIN</TabsTrigger>
                <TabsTrigger value="status">Check Status</TabsTrigger>
              </TabsList>
              
              <TabsContent value="register">
                <NinRegistrationForm onSuccess={handleSuccessfulRegistration} />
              </TabsContent>
              
              <TabsContent value="status">
                <NinStatusCheck />
              </TabsContent>
            </Tabs>
          </div>

          <div className="mt-12 max-w-3xl mx-auto">
            <div className="bg-slate-50 p-4 rounded-lg">
              <h2 className="text-xl font-semibold mb-2">Important Information</h2>
              <ul className="list-disc pl-5 space-y-2 text-sm text-slate-700">
                <li>Your NIN will be securely stored and used only for voter verification purposes.</li>
                <li>You must connect your wallet (MetaMask or Phantom) to register and check your verification status.</li>
                <li>NIN verification may take some time as it goes through an administrative review process.</li>
                <li>Once verified, you will be eligible to participate in blockchain-based elections.</li>
                <li>Your wallet address will be associated with your NIN for secure voter identification.</li>
                <li>Phantom wallet users can connect using their Polygon addresses for seamless verification.</li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}