import { FileText, FileIcon } from "lucide-react";

export const getFileIcon = (type: string) => {
  switch (type) {
    case "CSV":
      return <FileText className="h-5 w-5 text-green-600" />;
    case "JSON":
      return <FileText className="h-5 w-5 text-blue-600" />;
    case "Excel":
      return <FileText className="h-5 w-5 text-emerald-600" />;
    case "ZIP":
      return <FileIcon className="h-5 w-5 text-orange-600" />;
    default:
      return <FileText className="h-5 w-5 text-gray-600" />;
  }
};

export const getStatusColor = (status: string) => {
  switch (status) {
    case "Ready":
      return "bg-green-100 text-green-800 border-green-200";
    case "Processing":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "Error":
      return "bg-red-100 text-red-800 border-red-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};
