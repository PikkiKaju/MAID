// Zbiory danych do regresji - dane tymczasowe

export interface datasetRegresja {
  id: number;
  title: string;
  xValues: number[];
  yValues: number[];
  isPublic: boolean;
}

export const datasetRegresjaList: datasetRegresja[] = [
  {
    id: 1,
    title: "Pomiar temperatury vs zużycie energii",
    xValues: [15, 16, 18, 20, 22, 24, 26],
    yValues: [120, 115, 110, 108, 106, 104, 103],
    isPublic: true,
  },
  {
    id: 2,
    title: "Wzrost vs waga",
    xValues: [150, 160, 165, 170, 175, 180, 185],
    yValues: [50, 55, 58, 62, 68, 72, 78],
    isPublic: false,
  },
];
