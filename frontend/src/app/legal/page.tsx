import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LegalPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-6 w-6 text-yellow-500" />
        <h1 className="text-2xl font-bold">Aviso Legal y Disclaimer</h1>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Aviso de riesgo</CardTitle></CardHeader>
        <CardContent className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground space-y-3">
          <p>
            <strong>Belfort</strong> es una plataforma de análisis experimental para uso personal.
            Los análisis, scores, patrones y probabilidades mostrados se basan en indicadores técnicos
            y datos históricos, y <strong>no constituyen asesoramiento financiero</strong> de ningún tipo.
          </p>
          <p>
            La inversión en criptomonedas conlleva un <strong>riesgo elevado de pérdida de capital</strong>.
            Los mercados son altamente volátiles e impredecibles. El rendimiento pasado no garantiza resultados futuros.
          </p>
          <p>
            Los backtests mostrados son simulaciones sobre datos históricos con condiciones ideales.
            Los resultados reales pueden diferir significativamente debido a slippage, comisiones,
            liquidez y condiciones de mercado variables.
          </p>
          <p>
            <strong>Siempre opere con gestión de riesgo adecuada</strong>: use stop loss, no arriesgue
            más de lo que puede permitirse perder, y consulte a un asesor financiero cualificado antes
            de tomar decisiones de inversión.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
