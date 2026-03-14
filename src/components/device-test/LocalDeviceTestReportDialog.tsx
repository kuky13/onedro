import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { TestResults } from "@/types/deviceTest";
import { TestResult } from "@/components/device-test/TestResult";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  results: TestResults;
  title?: string;
};

export function LocalDeviceTestReportDialog({ open, onOpenChange, results, title = "Relatório do Checklist" }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md p-0 gap-0 max-h-[90vh] overflow-hidden">
        <DialogHeader className="p-4 pb-2 border-b border-border/30">
          <DialogTitle className="text-base">{title}</DialogTitle>
          <DialogDescription className="sr-only">
            Visualização e download do relatório gerado a partir do checklist manual.
          </DialogDescription>
        </DialogHeader>

        <div className="h-[calc(90vh-72px)] overflow-auto">
          <TestResult results={results} onClose={() => onOpenChange(false)} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

