import { Navbar } from "@/components/navbar";
import { ElectionStatus } from "@/components/election-status";
import { ElectionInfoCard } from "@/components/election-info-card";
import { PreviousElections } from "@/components/previous-elections";
import { BlockchainTransparency } from "@/components/blockchain-transparency";
import { Footer } from "@/components/footer";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <ElectionStatus />
          <ElectionInfoCard />
          <PreviousElections />
          <BlockchainTransparency />
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
