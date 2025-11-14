import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { CalculationResult } from "../../api/projectService";

interface CalculationResultsProps {
  result: CalculationResult | null;
  loading: boolean;
}

export default function CalculationResults({
  result,
  loading,
}: CalculationResultsProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!result) {
    return null;
  }

  const info = result.model_info;
  const degree = result.degree;
  const n_features = result.n_features;
  const coefficients = result.coefficients || info?.coefficients;
  const intercept = result.intercept || info?.intercept;
  const r2 = info?.r_squared;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6">
        {/* Visualization Card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">
              Wizualizacja wyników
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full min-h-[500px] overflow-auto bg-card rounded-lg p-6 border border-border">
              <div
                className="w-full flex items-center justify-center min-h-[450px]"
                dangerouslySetInnerHTML={{
                  __html: result.svg_plot,
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Model Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-semibold">
              Informacje o modelu
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {typeof degree !== "undefined" && (
                <div className="flex items-center justify-between p-4 bg-accent dark:bg-accent/50 rounded-lg">
                  <span className="text-base font-medium text-foreground">
                    Stopień wielomianu:
                  </span>
                  <span className="text-lg font-semibold text-foreground">
                    {degree}
                  </span>
                </div>
              )}
              {typeof n_features !== "undefined" && (
                <div className="flex items-center justify-between p-4 bg-accent dark:bg-accent/50 rounded-lg">
                  <span className="text-base font-medium text-foreground">
                    Liczba cech:
                  </span>
                  <span className="text-lg font-semibold text-foreground">
                    {n_features}
                  </span>
                </div>
              )}
              {typeof r2 !== "undefined" && (
                <div className="flex items-center justify-between p-4 bg-accent dark:bg-accent/50 rounded-lg">
                  <span className="text-base font-medium text-foreground">
                    Współczynnik determinacji (R²):
                  </span>
                  <span className="text-lg font-semibold text-foreground">
                    {typeof r2 === "number" ? r2.toFixed(4) : r2}
                  </span>
                </div>
              )}
              {typeof intercept !== "undefined" && (
                <div className="flex items-center justify-between p-4 bg-accent dark:bg-accent/50 rounded-lg">
                  <span className="text-base font-medium text-foreground">
                    Wyraz wolny (Intercept):
                  </span>
                  <span className="text-lg font-semibold text-foreground">
                    {typeof intercept === "number"
                      ? intercept.toFixed(4)
                      : intercept}
                  </span>
                </div>
              )}
              {Array.isArray(coefficients) && coefficients.length > 0 && (
                <div className="p-4 bg-accent dark:bg-accent/50 rounded-lg">
                  <div className="text-base font-medium text-foreground mb-3">
                    Współczynniki:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {coefficients.map((c: number, i: number) => (
                      <div
                        key={i}
                        className="px-3 py-1.5 bg-card border border-border rounded-md text-base font-medium text-foreground"
                      >
                        β{i}: {typeof c === "number" ? c.toFixed(4) : c}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Predictions Card */}
      {result.prediction &&
        Array.isArray(result.prediction) &&
        result.prediction.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-semibold">
                Przewidywania
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-64 overflow-y-auto">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                  {result.prediction.map((pred: number, idx: number) => (
                    <div
                      key={idx}
                      className="p-2 bg-muted rounded-lg text-center text-sm font-medium"
                    >
                      {typeof pred === "number" ? pred.toFixed(4) : pred}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
    </div>
  );
}
