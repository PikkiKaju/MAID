import axiosInstance from "./axiosConfig";

export interface DatasetMetadata {
  id: string;
  name: string;
  username: string;
  createdAt: string;
}

export interface DatasetMyMetadata {
  id: string;
  name: string;
  IsPublic: string;
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

  async uploadCsv(
    file: File,
    name: string,
    columnTransform: string,
    emptyTransform: string,
    isPublic: boolean,
    token: string
  ): Promise<DatasetUploadResponse> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", name);
    formData.append("columnTransform", columnTransform);
    formData.append("emptyTransform", emptyTransform);
    formData.append("isPublic", isPublic.toString());

    const response = await axiosInstance.post<DatasetUploadResponse>(
      "/Dataset/upload-csv",
      formData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          // No Content-Type header here, so Axios can set multipart/form-data boundary
        },
        transformRequest: (data, headers) => {
          delete headers["Content-Type"];
          return data;
        },
      }
    );

    return response.data;
  }

  async uploadPhoto(
    file: File,
    name: string,
    isPublic: boolean,
    token: string
  ): Promise<DatasetUploadResponse> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", name);
    formData.append("isPublic", isPublic.toString());

    const response = await axiosInstance.post<DatasetUploadResponse>(
      "/Dataset/upload-photo",
      formData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          // No Content-Type header here, so Axios can set multipart/form-data boundary
        },
        transformRequest: (data, headers) => {
          delete headers["Content-Type"];
          return data;
        },
      }
    );

    return response.data;
  }

  async getDatasets(token: string): Promise<DatasetMyMetadata[]> {
    const response = await axiosInstance.get<DatasetMyMetadata[]>(
      `${this.baseUrl}/list`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  }

  async getPublicDatasets(token: string): Promise<DatasetMetadata[]> {
    const response = await axiosInstance.get<DatasetMetadata[]>(
      `${this.baseUrl}/dataset-public`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  }

  async getAllDatasets(token: string): Promise<{ public: DatasetMetadata[]; user: DatasetMyMetadata[] }> {
    try {
      const [publicDatasets, userDatasets] = await Promise.all([
        this.getPublicDatasets(token),
        this.getDatasets(token),
      ]);

      return {
        public: publicDatasets,
        user: userDatasets,
      };
    } catch (error) {
      console.error("Error fetching datasets:", error);
      throw error;
    }
  }

  async deleteDataset(id: string, token: string): Promise<void> {
    await axiosInstance.delete(`/Dataset/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async getDatasetDetails(id: string, token: string): Promise<string> {
    const response = await axiosInstance.get<string>(`/Dataset/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      responseType: "text", // Important: get raw CSV text
    });
    return response.data;
  }
}

export const datasetService = new DatasetService();
