import { Navbar } from "@/components/navbar";
import { ElectionStatus } from "@/components/election-status";
import { ElectionInfoCard } from "@/components/election-info-card";
import { LastElectionWinner } from "@/components/last-election-winner";
import { PreviousElections } from "@/components/previous-elections";
import { BlockchainTransparency } from "@/components/blockchain-transparency";
import { Footer } from "@/components/footer";
import { ShieldCheck, Vote, History, Lock } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      
      {/* Hero section */}
      <div className="bg-gradient-to-b from-white to-slate-50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
              <ShieldCheck className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900 mb-4">
              Secure Blockchain Voting
            </h1>
            <p className="text-lg text-slate-600 mb-8 max-w-2xl">
              A transparent and tamper-proof voting platform powered by blockchain technology
              ensuring the integrity of every election.
            </p>
            
            <ElectionStatus />
          </div>
        </div>
      </div>
      
      <main className="flex-grow py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Features section */}
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
              <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center mb-4">
                <Vote className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Easy Voting</h3>
              <p className="text-slate-600">
                Securely cast your vote from anywhere with our simple and intuitive interface.
              </p>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
              <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center mb-4">
                <Lock className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Secure Identity</h3>
              <p className="text-slate-600">
                Your identity is verified through NIN registration and blockchain authentication.
              </p>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
              <div className="h-12 w-12 rounded-lg bg-amber-100 flex items-center justify-center mb-4">
                <History className="h-6 w-6 text-amber-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Transparent Results</h3>
              <p className="text-slate-600">
                View election results and verify votes through the immutable blockchain ledger.
              </p>
            </div>
          </div>
          
          {/* Election info and last winner cards */}
          <div className="grid md:grid-cols-2 gap-8 mb-16">
            <ElectionInfoCard />
            <LastElectionWinner />
          </div>
          
          {/* Previous elections section */}
          <div className="mb-16">
            <PreviousElections />
          </div>
          
          {/* Blockchain transparency */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 mb-16">
            <BlockchainTransparency />
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
