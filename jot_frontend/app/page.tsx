import Editor from "@/components/editor";
import { TooltipProvider } from "@/components/ui/tooltip";

export default function Home() {
  return (
    <TooltipProvider>
      <Editor />
    </TooltipProvider>
  );
}
