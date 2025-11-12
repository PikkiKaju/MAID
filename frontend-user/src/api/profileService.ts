import axiosInstance from "./axiosConfig";

export interface ProfileData {
  avatar: string;
  name: string;
  surname: string;
  title: string;
  bio: string;
  email: string;
  joined: string;
  totalProjects: number;
  publicProjects: number;
  totalDatasets: number;
  totalPublicDatasets: number;
}

export interface UpdateProfileData {
  name: string;
  surname: string;
  title: string;
  bio: string;
  email: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface AvatarOption {
  id: string;
  avatar: string;
}

class ProfileService {
  private baseUrl = "/Profile";

  private getToken(): string | null {
    // Try sessionStorage first, fallback to localStorage for backward compatibility
    return sessionStorage.getItem("token") || localStorage.getItem("token");
  }

  async getProfile(): Promise<ProfileData> {
    const token = this.getToken();
    if (!token) {
      throw new Error("No authentication token found");
    }

    const response = await axiosInstance.get<ProfileData>(
      `${this.baseUrl}/profile`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return response.data;
  }

  async updateProfile(data: UpdateProfileData): Promise<void> {
    const token = this.getToken();
    if (!token) {
      throw new Error("No authentication token found");
    }

    await axiosInstance.put(`${this.baseUrl}/profile`, data, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async deleteProfile(): Promise<void> {
    const token = this.getToken();
    if (!token) {
      throw new Error("No authentication token found");
    }

    await axiosInstance.delete(`${this.baseUrl}/profile`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async getAvatars(): Promise<AvatarOption[]> {
    const token = this.getToken();
    if (!token) {
      throw new Error("No authentication token found");
    }

    const response = await axiosInstance.get<AvatarOption[]>(
      `${this.baseUrl}/avatar`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return response.data;
  }

  async updateAvatar(avatarId: string): Promise<void> {
    const token = this.getToken();
    if (!token) {
      throw new Error("No authentication token found");
    }

    // Najpierw pobierz pełny obiekt avatara, aby uzyskać SVG string
    const avatars = await this.getAvatars();
    const selectedAvatar = avatars.find((a) => a.id === avatarId);
    
    if (!selectedAvatar) {
      throw new Error("Avatar not found");
    }

    // Backend przyjmuje string (SVG), nie obiekt
    await axiosInstance.put(
      `${this.baseUrl}/avatar`,
      selectedAvatar.avatar,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );
  }
}

export const profileService = new ProfileService();

