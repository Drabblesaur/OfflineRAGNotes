import { useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import Editor from "@/components/editor";
import { TooltipProvider } from "./components/ui/tooltip";
import NoteScreen from "./components/NoteScreen";
function App() {
  return (
    <TooltipProvider>
      <NoteScreen
        note={{
          id: "1",
          title: "My Note",
          content: "",
          favorite: false,
          tags: [],
          date: new Date(),
        }}
      />
    </TooltipProvider>
  );
}

export default App;
