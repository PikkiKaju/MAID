import { useState, useEffect, useCallback } from 'react';
import { ApiProject, DisplayProject } from '../models/project';
import axiosInstance from '../api/axiosConfig';

interface UseProjectsResult {
    allProjects: DisplayProject[];
    newProjects: DisplayProject[];
    popularProjects: DisplayProject[];
    loading: boolean;
    error: string | null;
    refetch: () => void;
}

const transformApiProjectToDisplayProject = (apiProject: ApiProject): DisplayProject => {
    return {
        id: apiProject.id,
        name: apiProject.name, 
        createdAt: apiProject.createdAt, 
        lastModifiedAt: apiProject.lastModifiedAt, 
        isPublic: apiProject.isPublic,
        likes: apiProject.likes,
    };
};

export const useProjects = (): UseProjectsResult => {
    const [allProjects, setAllProjects] = useState<DisplayProject[]>([]);
    const [newProjects, setNewProjects] = useState<DisplayProject[]>([]);
    const [popularProjects, setPopularProjects] = useState<DisplayProject[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [allRes, newRes, popularRes] = await Promise.all([
                axiosInstance.get<ApiProject[]>('/Project/All'),
                axiosInstance.get<ApiProject[]>('/Project/New'),
                axiosInstance.get<ApiProject[]>('/Project/Popular'),
            ]);

            setAllProjects(allRes.data.map(transformApiProjectToDisplayProject));
            setNewProjects(newRes.data.map(transformApiProjectToDisplayProject));
            setPopularProjects(popularRes.data.map(transformApiProjectToDisplayProject));
        } catch (err: any) {
            console.error("Błąd podczas pobierania danych projektów:", err);
            setError(err.message || "Nie udało się załadować projektów. Spróbuj ponownie.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return { allProjects, newProjects, popularProjects, loading, error, refetch: fetchData };
};