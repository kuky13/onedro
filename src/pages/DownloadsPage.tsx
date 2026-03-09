import { useState, useEffect } from "react";
import { Download, Loader2, Link2, Video, CheckCircle2, Clipboard, Globe, ArrowDown, FileVideo, FileAudio, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { requestMediaDownload, type MediaDownloadFormat } from "@/services/api/mediaDownloads";
import { cn } from "@/lib/utils";

const QUALITY_OPTIONS = [
  { value: "best", label: "Melhor qualidade" },
  { value: "1080", label: "1080p" },
  { value: "720", label: "720p" },
  { value: "480", label: "480p" },
  { value: "360", label: "360p" },
];

const PLATFORMS = [
  { name: "YouTube", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  { name: "Instagram", color: "bg-pink-500/20 text-pink-400 border-pink-500/30" },
  { name: "TikTok", color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" },
  { name: "Twitter/X", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  { name: "Facebook", color: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30" },
];

export default function DownloadsPage() {
  const [url, setUrl] = useState("");
  const [format, setFormat] = useState<MediaDownloadFormat>("mp4");
  const [quality, setQuality] = useState("best");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ downloadUrl: string; filename: string; size?: number } | null>(null);

  useEffect(() => {
    if (!loading) { setProgress(0); return; }
    const interval = setInterval(() => {
      setProgress(prev => prev >= 90 ? 90 : prev + Math.random() * 15);
    }, 500);
    return () => clearInterval(interval);
  }, [loading]);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) { setUrl(text); toast.success("URL colada!"); }
    } catch { toast.error("Não foi possível acessar a área de transferência"); }
  };

  const handleDownload = async () => {
    if (!url.trim()) { toast.error("Cole a URL do vídeo primeiro"); return; }
    setLoading(true);
    setResult(null);
    try {
      const data = await requestMediaDownload({ url: url.trim(), format, quality });
      setProgress(100);
      setTimeout(() => { setResult(data); setLoading(false); toast.success("Download pronto!"); }, 400);
    } catch (err: any) {
      toast.error(err?.message || "Erro ao processar download");
      setLoading(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="container max-w-2xl mx-auto py-6 px-4 space-y-5">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 via-card to-card border border-border p-6">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
            <Download className="h-6 w-6 text-primary" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-foreground">Downloads</h1>
            <p className="text-sm text-muted-foreground">Baixe vídeos e áudios de diversas plataformas</p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {PLATFORMS.map(p => (
                <span key={p.name} className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full border", p.color)}>{p.name}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Card */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-5">
        {/* URL Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground flex items-center gap-2">
            <Globe className="h-3.5 w-3.5 text-muted-foreground" />
            URL do vídeo
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="https://youtube.com/watch?v=..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="pl-10"
                disabled={loading}
              />
            </div>
            <Button variant="outline" size="icon" onClick={handlePaste} disabled={loading} title="Colar URL">
              <Clipboard className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-border" />

        {/* Format Toggle */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Formato</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setFormat("mp4")}
              disabled={loading}
              className={cn(
                "flex items-center justify-center gap-2 rounded-xl border-2 p-3 transition-all text-sm font-medium",
                format === "mp4"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-secondary/50 text-muted-foreground hover:border-muted-foreground/50"
              )}
            >
              <FileVideo className="h-4 w-4" />
              Vídeo (MP4)
            </button>
            <button
              onClick={() => setFormat("mp3")}
              disabled={loading}
              className={cn(
                "flex items-center justify-center gap-2 rounded-xl border-2 p-3 transition-all text-sm font-medium",
                format === "mp3"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-secondary/50 text-muted-foreground hover:border-muted-foreground/50"
              )}
            >
              <FileAudio className="h-4 w-4" />
              Áudio (MP3)
            </button>
          </div>
        </div>

        {/* Quality - only for MP4 */}
        {format === "mp4" && (
          <div className="space-y-2 animate-fade-in">
            <label className="text-sm font-medium text-foreground">Qualidade</label>
            <div className="flex flex-wrap gap-1.5">
              {QUALITY_OPTIONS.map(q => (
                <button
                  key={q.value}
                  onClick={() => setQuality(q.value)}
                  disabled={loading}
                  className={cn(
                    "px-3 py-1.5 rounded-lg border text-xs font-medium transition-all",
                    quality === q.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-secondary/50 text-muted-foreground hover:border-muted-foreground/50"
                  )}
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Divider */}
        <div className="h-px bg-border" />

        {/* Download Button */}
        <Button onClick={handleDownload} disabled={loading || !url.trim()} className="w-full" size="lg">
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Processando...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Baixar
            </span>
          )}
        </Button>

        {/* Progress */}
        {loading && (
          <div className="space-y-1.5 animate-fade-in">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground text-center">{Math.round(progress)}% — Processando mídia...</p>
          </div>
        )}
      </div>

      {/* Result */}
      {result && (
        <div className="rounded-2xl border-2 border-primary/40 bg-primary/5 p-5 space-y-4 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Download pronto!</p>
              <p className="text-xs text-muted-foreground truncate max-w-[280px]">{result.filename}</p>
            </div>
          </div>
          {result.size && (
            <p className="text-xs text-muted-foreground">Tamanho: {formatSize(result.size)}</p>
          )}
          <Button asChild className="w-full" size="lg">
            <a href={result.downloadUrl} download={result.filename} target="_blank" rel="noopener noreferrer">
              <ArrowDown className="h-4 w-4 mr-2" />
              Baixar arquivo
            </a>
          </Button>
        </div>
      )}

      {/* How to use */}
      <div className="rounded-2xl border border-border bg-card/50 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Como usar</h2>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { step: "1", icon: Link2, label: "Cole a URL do vídeo" },
            { step: "2", icon: Video, label: "Escolha formato e qualidade" },
            { step: "3", icon: Download, label: "Clique em Baixar" },
          ].map(item => (
            <div key={item.step} className="flex flex-col items-center text-center gap-2 p-3">
              <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center">
                <item.icon className="h-4 w-4 text-primary" />
              </div>
              <span className="text-[11px] text-muted-foreground leading-tight">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
