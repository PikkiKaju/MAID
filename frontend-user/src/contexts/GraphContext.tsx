/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, ReactNode } from 'react';

export interface GraphContextType {
  graphId: string | null;
  setGraphId: (id: string | null) => void;
}

const GraphContext = createContext<GraphContextType | undefined>(undefined);

export function GraphProvider({ children }: { children: ReactNode }) {
  const [graphId, setGraphId] = useState<string | null>(null);
  return (
    <GraphContext.Provider value={{ graphId, setGraphId }}>
      {children}
    </GraphContext.Provider>
  );
}

export function useGraph() {
  const ctx = useContext(GraphContext);
  if (!ctx) throw new Error('useGraph must be used within a GraphProvider');
  return ctx;
}
