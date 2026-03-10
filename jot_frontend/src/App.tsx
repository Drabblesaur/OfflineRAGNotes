import Editor from "@/components/editor";
import { TooltipProvider } from "./components/ui/tooltip";
import NoteScreen from "./components/NoteScreen";
import FolderScreen from "./components/FolderScreen";
import { mockFolder } from "./mock/mockFolder";
import { mockNote } from "./mock/mockNote";
function App() {
  return (
    <TooltipProvider>
      <FolderScreen
        folder={mockFolder}
        onNoteSelect={(note) => console.log("Selected note:", note)}
      />
      {/*<NoteScreen note={mockNote} onContentChange={(content) => console.log("Content changed:", content)}/>*/}
    </TooltipProvider>
  );
}

export default App;
