import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { candidateColors } from "@/data/mock-data";

export interface Candidate {
  id?: number;
  index?: number;
  name: string;
  party: string;
  votes?: number;
  profileImage?: string;
  biography?: string;
}

interface CandidateGridProps {
  candidates: Candidate[];
  onSelectCandidate: (candidate: Candidate) => void;
  selectedCandidateId: number | null;
}

export function CandidateGrid({ 
  candidates, 
  onSelectCandidate, 
  selectedCandidateId 
}: CandidateGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
      {candidates.map((candidate, index) => (
        <CandidateCard 
          key={candidate.id || candidate.index} 
          candidate={candidate} 
          selected={selectedCandidateId === (candidate.id || candidate.index)}
          colorIndex={index % candidateColors.length}
          onSelect={() => onSelectCandidate(candidate)}
        />
      ))}
    </div>
  );
}

interface CandidateCardProps {
  candidate: Candidate;
  selected: boolean;
  colorIndex: number;
  onSelect: () => void;
}

function CandidateCard({ candidate, selected, colorIndex, onSelect }: CandidateCardProps) {
  return (
    <Card 
      className={`overflow-hidden transition-all ${
        selected 
          ? 'ring-2 ring-primary ring-offset-2' 
          : 'hover:shadow-md'
      }`}
    >
      <div 
        className="h-3" 
        style={{ backgroundColor: candidateColors[colorIndex] }}
      ></div>
      <CardHeader className="pb-3">
        <div className="flex items-center space-x-4">
          <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden">
            {candidate.profileImage ? (
              <img 
                src={candidate.profileImage} 
                alt={candidate.name} 
                className="h-full w-full object-cover"
              />
            ) : (
              <div 
                className="h-full w-full flex items-center justify-center text-2xl font-bold text-slate-400"
                style={{ backgroundColor: `${candidateColors[colorIndex]}30` }}
              >
                {candidate.name.charAt(0)}
              </div>
            )}
          </div>
          <div>
            <h3 className="font-bold text-lg">{candidate.name}</h3>
            <p className="text-sm text-muted-foreground">{candidate.party}</p>
          </div>
        </div>
      </CardHeader>
      <CardFooter>
        <Button 
          onClick={onSelect} 
          variant={selected ? "default" : "outline"} 
          className="w-full"
        >
          {selected ? "Selected" : "Select Candidate"}
        </Button>
      </CardFooter>
    </Card>
  );
}