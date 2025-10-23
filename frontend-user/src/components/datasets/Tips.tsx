import { Card, CardContent } from "../../ui/card";
import { Button } from "../../ui/button";
import { Info } from "lucide-react";

export default function Tips() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-primary/10 rounded-md">
            <Info className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Tips for managing datasets</h3>
            <ul className="mt-2 list-disc ml-5 space-y-1 text-sm text-muted-foreground">
              <li>
                Keep column names consistent across datasets to simplify joins.
              </li>
              <li>
                Prefer CSV or Parquet for tabular data — Parquet keeps types and
                is faster for large files.
              </li>
              <li>Use clear naming conventions including date and source.</li>
            </ul>
            <div className="mt-3">
              <Button variant="ghost" size="sm">
                Learn more
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
