import { useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import Editor from "@/components/editor";
import { TooltipProvider } from "./components/ui/tooltip";
function App() {
  return (
    <TooltipProvider>
      <Editor />
    </TooltipProvider>
  );
}

export default App;
