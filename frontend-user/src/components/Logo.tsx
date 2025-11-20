import { Sparkles } from "lucide-react";
import { cn } from "../utils/tailwind";

interface LogoProps {
  className?: string;
}

export default function Logo({ className }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="h-8 w-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
        <Sparkles className="h-4 w-4 text-white" />
      </div>
      <span className="font-semibold text-lg bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
        Maid
      </span>
    </div>
  );
}
