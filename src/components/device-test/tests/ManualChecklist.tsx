import { useState } from "react";
import { MANUAL_TESTS_CONFIG, type TestResult as TestResultType } from "@/types/deviceTest";
import { Button } from "@/components/ui/button";
import { Check, X, SkipForward, CheckCircle2 } from "lucide-react";
import * as Icons from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion } from "framer-motion";

interface ManualChecklistProps {
    onComplete: (results: Record<string, TestResultType>) => void;
    initialResults?: Record<string, TestResultType>;
}

export function ManualChecklist({ onComplete, initialResults = {} }: ManualChecklistProps) {
    const [results, setResults] = useState<Record<string, TestResultType>>(initialResults);

    const handleMark = (testId: string, status: "passed" | "failed" | "skipped") => {
        setResults((prev) => ({
            ...prev,
            [testId]: {
                status,
                score: status === "passed" ? 100 : 0,
                completed_at: new Date().toISOString(),
                details: { manual: true }
            }
        }));
    };

    const handleFinish = () => {
        onComplete(results);
    };

    const progress = (Object.keys(results).filter(key => MANUAL_TESTS_CONFIG.some(t => t.id === key)).length / MANUAL_TESTS_CONFIG.length) * 100;

    return (
        <div className="flex flex-col h-full bg-background relative overflow-hidden">
            {/* Background gradients */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-[-100px] left-[-100px] w-[300px] h-[300px] bg-blue-500/5 rounded-full blur-[80px] pointer-events-none" />

            {/* Header */}
            <div className="p-6 pb-4 border-b border-white/5 bg-black/20 backdrop-blur-xl relative z-10">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                        <CheckCircle2 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold tracking-tight">Inspeção Manual</h2>
                        <p className="text-sm text-muted-foreground">Verifique os itens físicos do aparelho</p>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-4">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-muted-foreground font-medium">Progresso</span>
                        <span className="text-primary font-bold">{Math.round(progress)}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-muted/30 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full"
                            transition={{ duration: 0.5, ease: "easeOut" }}
                        />
                    </div>
                </div>
            </div>

            <ScrollArea className="flex-1 p-4">
                <div className="space-y-3 pb-24">
                    {MANUAL_TESTS_CONFIG.map((test, index) => {
                        const Icon = (Icons as any)[test.icon] || Icons.HelpCircle;
                        const currentResult = results[test.id];

                        return (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                key={test.id}
                                className={`p-4 rounded-xl border transition-all duration-300 ${currentResult?.status === "passed"
                                    ? "bg-green-500/5 border-green-500/20"
                                    : currentResult?.status === "failed"
                                        ? "bg-red-500/5 border-red-500/20"
                                        : currentResult?.status === "skipped"
                                            ? "bg-yellow-500/5 border-yellow-500/20"
                                            : "bg-card/50 border-white/5 hover:border-white/10"
                                    }`}
                            >
                                <div className="flex items-start gap-4">
                                    <div className={`p-2.5 rounded-lg flex-shrink-0
                    ${currentResult?.status === "passed" ? "bg-green-500/10 text-green-500" :
                                            currentResult?.status === "failed" ? "bg-red-500/10 text-red-500" :
                                                currentResult?.status === "skipped" ? "bg-yellow-500/10 text-yellow-500" :
                                                    "bg-primary/10 text-primary"}
                  `}>
                                        <Icon className="w-5 h-5" />
                                    </div>

                                    <div className="flex-1 min-w-0 pt-0.5">
                                        <h3 className="font-semibold text-sm truncate">{test.label}</h3>
                                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{test.description}</p>

                                        <div className="flex items-center gap-2 mt-3">
                                            <Button
                                                size="sm"
                                                variant={currentResult?.status === "passed" ? "default" : "outline"}
                                                className={`h-8 flex-1 text-xs ${currentResult?.status === "passed" ? "bg-green-500 hover:bg-green-600 text-white" : "border-green-500/30 hover:bg-green-500/10 hover:text-green-500"}`}
                                                onClick={() => handleMark(test.id, "passed")}
                                            >
                                                <Check className="w-3 h-3 mr-1" /> OK
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant={currentResult?.status === "failed" ? "default" : "outline"}
                                                className={`h-8 flex-1 text-xs ${currentResult?.status === "failed" ? "bg-red-500 hover:bg-red-600 text-white" : "border-red-500/30 hover:bg-red-500/10 hover:text-red-500"}`}
                                                onClick={() => handleMark(test.id, "failed")}
                                            >
                                                <X className="w-3 h-3 mr-1" /> Falha
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant={currentResult?.status === "skipped" ? "default" : "outline"}
                                                className={`h-8 px-2 text-xs ${currentResult?.status === "skipped" ? "bg-yellow-500 hover:bg-yellow-600 text-white" : "border-yellow-500/30 hover:bg-yellow-500/10 hover:text-yellow-500"}`}
                                                onClick={() => handleMark(test.id, "skipped")}
                                            >
                                                <SkipForward className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </ScrollArea>

            {/* Footer Action */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent pt-12">
                <Button
                    className="w-full h-12 text-base font-semibold shadow-lg shadow-primary/20"
                    onClick={handleFinish}
                >
                    Finalizar Diagnóstico
                </Button>
            </div>
        </div>
    );
}
