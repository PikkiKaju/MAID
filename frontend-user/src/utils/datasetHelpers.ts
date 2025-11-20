import { UserDataset } from "../models/dataset";
import { formatUploadDate } from "./functions";

/**
 * Interface for formatted dataset used by components
 */
export interface FormattedDataset {
  id: string;
  name: string;
  type: string;
  uploadDate: string;
  author: string;
  likes: number;
  isPublic: boolean;
}

/**
 * Validates file extension for CSV or ZIP files
 * @param file - File to validate
 * @param invalidFormatMessage - Error message for invalid format (from translation)
 * @returns Validation result with file type or error
 */
export const validateFile = (
  file: File,
  invalidFormatMessage: string
): { valid: boolean; type: "csv" | "zip" | null; error?: string } => {
  const fileName = file.name.toLowerCase();
  const extension = fileName.substring(fileName.lastIndexOf("."));

  if (extension === ".csv") {
    return { valid: true, type: "csv" };
  } else if (extension === ".zip") {
    return { valid: true, type: "zip" };
  } else {
    return {
      valid: false,
      type: null,
      error: invalidFormatMessage,
    };
  }
};

/**
 * Formats UserDataset to FormattedDataset format used by components
 * @param dataset - UserDataset to format
 * @returns FormattedDataset with formatted date and type
 */
export const formatDataset = (dataset: UserDataset): FormattedDataset => {
  // Determine file type (0 = CSV, 1 = ZIP)
  const fileType = dataset.dataType === 0 ? "CSV" : "ZIP";

  // Format date
  const uploadDate = formatUploadDate(dataset.createdAt);

  return {
    id: dataset.id,
    name: dataset.name,
    type: fileType,
    uploadDate: uploadDate,
    author: dataset.username,
    likes: dataset.likes,
    isPublic: dataset.isPublic,
  };
};

/**
 * Formats array of UserDatasets to FormattedDatasets
 * @param datasets - Array of UserDatasets to format
 * @returns Array of FormattedDatasets
 */
export const formatDatasets = (
  datasets: UserDataset[]
): FormattedDataset[] => {
  return datasets.map(formatDataset);
};

/**
 * Calculates pagination values
 * @param items - Array of items to paginate
 * @param currentPage - Current page number (1-based)
 * @param itemsPerPage - Number of items per page
 * @returns Pagination result with totalPages, startIndex, endIndex, and paginatedItems
 */
export const calculatePagination = <T>(
  items: T[],
  currentPage: number,
  itemsPerPage: number
): {
  totalPages: number;
  startIndex: number;
  endIndex: number;
  paginatedItems: T[];
} => {
  const totalPages = Math.ceil(items.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedItems = items.slice(startIndex, endIndex);

  return {
    totalPages,
    startIndex,
    endIndex,
    paginatedItems,
  };
};

