export type ParameterConfig = {
  key: string;
  label: string;
  type: "number" | "text" | "select";
  options?: string[];
  min?: number;
};

export const paramConfig: Record<string, ParameterConfig[]> = {
  linear: [],
  ridge: [{ key: "alpha", label: "Alpha", type: "number", min: 0 }],
  lasso: [{ key: "alpha", label: "Alpha", type: "number", min: 0 }],
  polynomial: [
    { key: "degree", label: "Stopień (degree)", type: "number", min: 1 },
  ],
  svr: [
    {
      key: "kernel",
      label: "Kernel",
      type: "select",
      options: ["linear", "poly", "rbf", "sigmoid"],
    },
    { key: "C", label: "C", type: "number", min: 0 },
    { key: "epsilon", label: "Epsilon", type: "number", min: 0 },
  ],
  "decision-tree": [
    { key: "max_depth", label: "Max depth", type: "number", min: 1 },
    { key: "random_state", label: "Random state", type: "number", min: 0 },
  ],
  elasticnet: [
    { key: "alpha", label: "Alpha", type: "number", min: 0 },
    { key: "l1_ratio", label: "L1 ratio", type: "number", min: 0 },
  ],
  "random-forest": [
    { key: "max_depth", label: "Max depth", type: "number", min: 1 },
    { key: "random_state", label: "Random state", type: "number", min: 0 },
    {
      key: "n_estimators",
      label: "Liczba drzew (n_estimators)",
      type: "number",
      min: 1,
    },
  ],
};

