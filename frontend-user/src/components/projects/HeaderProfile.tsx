import { Button } from "../../ui/button";
import { Plus } from "lucide-react";

interface Props {
  onNewProject: () => void;
}

export default function HeaderProfile({ onNewProject }: Props) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-semibold">My Projects</h1>
        <p className="text-muted-foreground">
          Manage and organize your data science projects
        </p>
      </div>
      <Button className="gap-2" onClick={onNewProject}>
        <Plus className="h-4 w-4" />
        New Project
      </Button>
    </div>
  );
}
