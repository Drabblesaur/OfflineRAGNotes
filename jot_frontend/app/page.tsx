import Editor from "@/components/Editor";
import { TooltipProvider } from "@/components/ui/tooltip";

export default function Home() {
  return (
    <TooltipProvider>
      <Editor />
    </TooltipProvider>
  );
}
