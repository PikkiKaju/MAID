import { useState, useRef } from 'react';
import { Upload, Table, X } from 'lucide-react';
import { Button } from '../../../ui/button';

export default function DatasetTab() {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<string[][] | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileUpload = async (file: File) => {
    setCsvFile(file);
    const text = await file.text();
    const rows = text.split('\n').map(row => row.split(',').map(cell => cell.trim()));
    
    if (rows.length > 0) {
      setColumns(rows[0]);
      setCsvData(rows.slice(1).filter(row => row.some(cell => cell.length > 0)));
    }
  };

  const clearDataset = () => {
    setCsvFile(null);
    setCsvData(null);
    setColumns([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="h-full flex flex-col p-4 bg-slate-50">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">Dataset Manager</h2>
        {csvFile && (
          <Button variant="outline" size="sm" onClick={clearDataset}>
            <X size={14} className="mr-1" /> Clear Dataset
          </Button>
        )}
      </div>

      {!csvFile ? (
        <div className="flex-1 flex items-center justify-center border-2 border-dashed border-slate-300 rounded-lg bg-white">
          <div className="text-center p-8">
            <Upload size={48} className="mx-auto mb-4 text-slate-400" />
            <h3 className="text-lg font-medium text-slate-700 mb-2">Upload Dataset</h3>
            <p className="text-sm text-slate-500 mb-4">
              Upload a CSV file to use for training
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
              }}
            />
            <Button onClick={() => fileInputRef.current?.click()}>
              <Upload size={16} className="mr-2" />
              Choose CSV File
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden bg-white border rounded-lg">
          <div className="p-3 border-b bg-slate-50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-700">{csvFile.name}</p>
                <p className="text-xs text-slate-500">
                  {csvData?.length || 0} rows × {columns.length} columns
                </p>
              </div>
              <Table size={20} className="text-slate-400" />
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-100 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-slate-600 border-r">#</th>
                  {columns.map((col, idx) => (
                    <th key={idx} className="px-3 py-2 text-left font-semibold text-slate-600 border-r">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {csvData?.slice(0, 100).map((row, rowIdx) => (
                  <tr key={rowIdx} className="border-b hover:bg-slate-50">
                    <td className="px-3 py-2 text-slate-400 border-r">{rowIdx + 1}</td>
                    {row.map((cell, cellIdx) => (
                      <td key={cellIdx} className="px-3 py-2 border-r">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {csvData && csvData.length > 100 && (
              <div className="p-3 text-center text-xs text-slate-500 bg-slate-50 border-t">
                Showing first 100 of {csvData.length} rows
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
