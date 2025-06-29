import axiosInstance from "./axiosConfig";

export interface DatasetMetadata {
  id: string;
  name: string;
  username: string;
  createdAt: string;
}

export interface DatasetUploadResponse {
  message: string;
  datasetId: string;
}

export interface DatasetDetail extends DatasetMetadata {
  csvData?: string;
  isPublic?: boolean;
}

class DatasetService {
  private baseUrl = "/dataset";

  async uploadCsv(csvText: string, name: string, isPublic: boolean): Promise<DatasetUploadResponse> {
    const response = await axiosInstance.post<DatasetUploadResponse>(
      `${this.baseUrl}/upload-csv`,
      {
        csvText,
        name,
        isPublic
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    return response.data;
  }

  async getDatasets(): Promise<DatasetMetadata[]> {
    const response = await axiosInstance.get<DatasetMetadata[]>(
      `${this.baseUrl}/list`
    );
    return response.data;
  }

  async getPublicDatasets(): Promise<DatasetMetadata[]> {
    const response = await axiosInstance.get<DatasetMetadata[]>(
      `${this.baseUrl}/dataset-public`
    );
    return response.data;
  }

  async getAllDatasets(): Promise<{public: DatasetMetadata[], user: DatasetMetadata[]}> {
    try {
      const [publicDatasets, userDatasets] = await Promise.all([
        this.getPublicDatasets(),
        this.getDatasets()
      ]);
      
      return {
        public: publicDatasets,
        user: userDatasets
      };
    } catch (error) {
      console.error("Error fetching datasets:", error);
      throw error;
    }
  }

  async deleteDataset(id: string): Promise<void> {
    await axiosInstance.delete(`${this.baseUrl}/${id}`);
  }

  // Placeholder for dataset details endpoint (if available)
  async getDatasetDetails(id: string): Promise<DatasetDetail> {
    try {
      const response = await axiosInstance.get<DatasetDetail>(
        `${this.baseUrl}/${id}`
      );
      return response.data;
    } catch (error) {
      // If details endpoint doesn't exist, return minimal data
      console.warn("Dataset details endpoint not available:", error);
      throw new Error("Dataset details not available");
    }
  }
}

export const datasetService = new DatasetService();
