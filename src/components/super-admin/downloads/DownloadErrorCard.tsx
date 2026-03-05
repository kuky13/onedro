import { AlertCircle, Copy, RefreshCw, Wand2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { ClassifiedDownloadError } from "@/features/video-downloader/classifyDownloadError";

type Props = {
  error: ClassifiedDownloadError;
  canTryMp3: boolean;
  canTryBest: boolean;
  onRetry: () => void;
  onTryMp3: () => void;
  onTryBest: () => void;
  onCopyDetails: () => void;
};

export function DownloadErrorCard({
  error,
  canTryMp3,
  canTryBest,
  onRetry,
  onTryMp3,
  onTryBest,
  onCopyDetails,
}: Props) {
  return (
    <Card className="border-destructive/30 bg-destructive/5 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <AlertCircle className="h-5 w-5 text-destructive" />
          {error.title}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="p-4 rounded-lg border bg-destructive/5 border-destructive/20 space-y-2">
          <p className="font-medium text-foreground">{error.userMessage}</p>
          {error.isLikelyShortTikTokUrl && (
            <p className="text-sm text-muted-foreground">
              Dica: links encurtados do TikTok (vt/vm.tiktok.com) costumam falhar. Prefira o link completo do
              vídeo.
            </p>
          )}
          {!!error.suggestedActions?.length && (
            <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
              {error.suggestedActions.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Button onClick={onRetry} className="h-11 flex-1">
            <RefreshCw className="h-4 w-4" />
            Tentar novamente
          </Button>
          {canTryMp3 && (
            <Button onClick={onTryMp3} variant="outline" className="h-11">
              <Wand2 className="h-4 w-4" />
              Tentar MP3
            </Button>
          )}
          {canTryBest && (
            <Button onClick={onTryBest} variant="outline" className="h-11">
              <Wand2 className="h-4 w-4" />
              Tentar “best"
            </Button>
          )}
        </div>

        {!!error.technicalDetails && (
          <Accordion type="single" collapsible>
            <AccordionItem value="details" className="border border-border rounded-xl px-4">
              <AccordionTrigger className="text-left hover:no-underline">
                Detalhes técnicos
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-4">
                <div className="space-y-3">
                  <pre className="text-xs whitespace-pre-wrap break-words bg-muted/30 border border-border rounded-lg p-3 max-h-56 overflow-auto">
                    {error.technicalDetails}
                  </pre>
                  <Button onClick={onCopyDetails} variant="outline" className="h-10">
                    <Copy className="h-4 w-4" />
                    Copiar detalhes
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}
