import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AssessmentPesos {
  tecnico: number;
  impacto: number;
  comportamental: number;
  estrategico: number;
  lideranca: number;
}

export const DEFAULT_PESOS: AssessmentPesos = {
  tecnico: 30,
  impacto: 25,
  comportamental: 20,
  estrategico: 15,
  lideranca: 10,
};

const PILAR_TO_KEY: Record<string, keyof AssessmentPesos> = {
  profundidadeTecnica: "tecnico",
  escopoImpacto: "impacto",
  comportamental: "comportamental",
  visaoEstrategica: "estrategico",
  liderancaAutonomia: "lideranca",
};

export function pesoForPilar(pesos: AssessmentPesos, pilarKey: string): number {
  const k = PILAR_TO_KEY[pilarKey];
  return k ? pesos[k] : 0;
}

export function recomputeNotaPonderada(
  analise: Record<string, { nota: number }>,
  pesos: AssessmentPesos,
): number {
  const tec = analise.profundidadeTecnica?.nota ?? 0;
  const imp = analise.escopoImpacto?.nota ?? 0;
  const com = analise.comportamental?.nota ?? 0;
  const est = analise.visaoEstrategica?.nota ?? 0;
  const lid = analise.liderancaAutonomia?.nota ?? 0;
  const total =
    tec * (pesos.tecnico / 100) +
    imp * (pesos.impacto / 100) +
    com * (pesos.comportamental / 100) +
    est * (pesos.estrategico / 100) +
    lid * (pesos.lideranca / 100);
  return Math.round(total * 100) / 100;
}

export function useAssessmentPesos() {
  const [pesos, setPesos] = useState<AssessmentPesos>(DEFAULT_PESOS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from("assessment_pesos")
        .select("*")
        .eq("id", 1)
        .maybeSingle();
      if (data) {
        setPesos({
          tecnico: Number(data.tecnico),
          impacto: Number(data.impacto),
          comportamental: Number(data.comportamental),
          estrategico: Number(data.estrategico),
          lideranca: Number(data.lideranca),
        });
      }
      setLoading(false);
    })();
  }, []);

  return { pesos, loading };
}
