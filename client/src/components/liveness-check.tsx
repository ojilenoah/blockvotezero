import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface LivenessCheckProps {
  onComplete: () => void;
}

export function LivenessCheck({ onComplete }: LivenessCheckProps) {
  const { toast } = useToast();
  const [isCapturing, setIsCapturing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isCaptured, setIsCaptured] = useState(false);

  const handleCapture = () => {
    setIsCapturing(true);
    // Simulate camera capture delay
    setTimeout(() => {
      setIsCapturing(false);
      setIsCaptured(true);
      toast({
        title: "Image captured",
        description: "Please click verify to continue",
      });
    }, 1500);
  };

  const handleVerify = () => {
    setIsVerifying(true);
    // Simulate verification delay
    setTimeout(() => {
      setIsVerifying(false);
      toast({
        title: "Identity verified",
        description: "Liveness check completed successfully",
      });
      onComplete();
    }, 2000);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Liveness Check</CardTitle>
        <CardDescription>
          Please position your face in the center of the frame and take a photo
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="aspect-video bg-slate-800 rounded-md flex items-center justify-center mb-4 relative overflow-hidden">
          {/* Camera preview placeholder */}
          <div className="text-white/40 text-center p-4">
            {isCapturing ? (
              <div className="animate-pulse">Capturing...</div>
            ) : (
              <>
                {isCaptured ? (
                  <div className="flex flex-col items-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="64"
                      height="64"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-green-400 mb-2"
                    >
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                      <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                    <span>Image captured</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="64"
                      height="64"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="mb-2"
                    >
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                      <circle cx="12" cy="13" r="4"></circle>
                    </svg>
                    <span>Camera preview</span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Face outline guide */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-32 h-32 border-2 border-dashed border-white/60 rounded-full"></div>
          </div>
        </div>

        <div className="text-sm text-muted-foreground mb-4">
          <ul className="list-disc pl-5 space-y-1">
            <li>Ensure your face is clearly visible</li>
            <li>Make sure there is good lighting</li>
            <li>Look directly at the camera</li>
            <li>Remove glasses or face coverings</li>
          </ul>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col space-y-2">
        <div className="grid grid-cols-2 gap-4 w-full">
          <Button 
            onClick={handleCapture} 
            disabled={isCapturing || isVerifying}
            className="flex items-center justify-center"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-2"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
            {isCapturing ? "Capturing..." : "Capture"}
          </Button>
          <Button 
            onClick={handleVerify} 
            disabled={!isCaptured || isVerifying}
            className="flex items-center justify-center"
            variant={isCaptured ? "default" : "outline"}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-2"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            {isVerifying ? "Verifying..." : "Verify"}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}