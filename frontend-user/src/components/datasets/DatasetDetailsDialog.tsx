import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../../ui/dialog";
import { datasetService } from "../../api/datasetService";
import { Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  datasetId: string;
  datasetName: string;
  token: string;
}

interface CsvRow {
  [key: string]: string;
}

export default function DatasetDetailsDialog({
  open,
  onOpenChange,
  datasetId,
  datasetName,
  token,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<CsvRow[]>([]);

  useEffect(() => {
    if (open && datasetId && token) {
      fetchDatasetDetails();
    } else {
      // Reset state when dialog closes
      setHeaders([]);
      setRows([]);
      setError(null);
    }
  }, [open, datasetId, token]);

  const fetchDatasetDetails = async () => {
    setLoading(true);
    setError(null);

    try {
      const csvData = await datasetService.getDatasetDetails(datasetId, token);

      // Parse CSV data
      const lines = csvData.trim().split("\n");
      if (lines.length === 0) {
        setError("Dataset jest pusty");
        setLoading(false);
        return;
      }

      // First line is headers
      const csvHeaders = lines[0].split(",").map((h) => h.trim());
      setHeaders(csvHeaders);

      // Parse data rows
      const parsedRows: CsvRow[] = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map((v) => v.trim());
        const row: CsvRow = {};
        csvHeaders.forEach((header, index) => {
          row[header] = values[index] || "";
        });
        parsedRows.push(row);
      }

      setRows(parsedRows);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Nie udało się pobrać szczegółów datasetu"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Szczegóły datasetu: {datasetName}</DialogTitle>
          <DialogDescription>Podgląd zawartości pliku CSV</DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Ładowanie danych...</span>
          </div>
        )}

        {error && (
          <div className="p-4 bg-destructive/10 text-destructive rounded-md">
            {error}
          </div>
        )}

        {!loading && !error && headers.length > 0 && (
          <div className="mt-4">
            <div className="rounded-md border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-muted">
                      {headers.map((header, index) => (
                        <th
                          key={index}
                          className="px-4 py-2 text-left font-semibold text-sm border-b"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, rowIndex) => (
                      <tr
                        key={rowIndex}
                        className="hover:bg-muted/50 transition-colors"
                      >
                        {headers.map((header, colIndex) => (
                          <td
                            key={colIndex}
                            className="px-4 py-2 text-sm border-b"
                          >
                            {row[header] || "-"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="mt-4 text-sm text-muted-foreground">
              Liczba wierszy: {rows.length}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
