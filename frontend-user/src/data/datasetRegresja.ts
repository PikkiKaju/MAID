// Zbiory danych do regresji - dane tymczasowe

export interface datasetRegresja {
  id: string;
  name: string;
  xValues: number[];
  yValues: number[];
  isPublic: boolean;
  createdAt: string;
}

export const datasetRegresjaList: datasetRegresja[] = [
  {
    id: "01d75921-2bdb-4ece-a3d8-9ddd6a3e09db",
    name: "Pomiar temperatury vs zużycie energii",
    xValues: [15, 16, 18, 20, 22, 24, 26],
    yValues: [120, 115, 110, 108, 106, 104, 103],
    isPublic: true,
    createdAt: "2025-06-29T10:30:00.000Z",
  },
  {
    id: "02e85a32-3cec-5fdf-b4e9-aeee7b4f0ace",
    name: "Wzrost vs waga",
    xValues: [150, 160, 165, 170, 175, 180, 185],
    yValues: [50, 55, 58, 62, 68, 72, 78],
    isPublic: false,
    createdAt: "2025-06-29T09:15:00.000Z",
  },
];
