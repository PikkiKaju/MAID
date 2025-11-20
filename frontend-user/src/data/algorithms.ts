/**
 * Available algorithms for project calculations
 */
export interface Algorithm {
  value: string;
  label: string;
}

export const algorithms: Algorithm[] = [
  { value: "linear", label: "Regresja liniowa" },
  { value: "ridge", label: "Regresja grzbietowa" },
  { value: "lasso", label: "Lasso" },
  { value: "svr", label: "SVR" },
  { value: "decision-tree", label: "Drzewo decyzyjne" },
  { value: "elasticnet", label: "Elastic Net" },
  { value: "random-forest", label: "Random Forest" },
  { value: "polynomial", label: "Wielomianowa" },
];

