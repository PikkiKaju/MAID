import { Search, Plus } from "lucide-react";
import { Button } from "../../ui/button";

interface Props {
  searchTerm: string;
  statusFilter: string;
  onCreate?: () => void;
}

export default function EmptyState({
  searchTerm,
  statusFilter,
  onCreate,
}: Props) {
  return (
    <div className="text-center py-12">
      <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
        <Search className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">No projects found</h3>
      <p className="text-muted-foreground mb-4">
        {searchTerm || statusFilter !== "all"
          ? "Try adjusting your search or filters"
          : "Get started by creating your first project"}
      </p>
      {!searchTerm && statusFilter === "all" && (
        <Button onClick={onCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Create Your First Project
        </Button>
      )}
    </div>
  );
}
