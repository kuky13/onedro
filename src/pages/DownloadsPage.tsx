import { useState } from "react";
import { Download, Loader2, Link2, Music, Video, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { requestMediaDownload, type MediaDownloadFormat } from "@/services/api/mediaDownloads";

const QUALITY_OPTIONS = [
  { value: "best", label: "Melhor qualidade" },
  { value: "1080", label: "1080p" },
  { value: "720", label: "720p" },
  { value: "480", label: "480p" },
  { value: "360", label: "360p" },
];

export default function DownloadsPage() {
  const [url, setUrl] = useState("");
  const [format, setFormat] = useState<MediaDownloadFormat>("mp4");
  const [quality, setQuality] = useState("best");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ downloadUrl: string; filename: string; size?: number } | null>(null);

  const handleDownload = async () => {
    if (!url.trim()) {
      toast.error("Cole a URL do vídeo primeiro");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const data = await requestMediaDownload({ url: url.trim(), format, quality });
      setResult(data);
      toast.success("Download pronto!");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao processar download");
    } finally {
      setLoading(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="container max-w-2xl mx-auto py-6 px-4 space-y-6">
      <PageHeader
        title="Downloads"
        description="Baixe vídeos e áudios de diversas plataformas"
        icon={<Download className="h-5 w-5" />}
      />

      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        {/* URL Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">URL do vídeo</label>
          <div className="relative">
            <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="https://youtube.com/watch?v=..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="pl-10"
              disabled={loading}
            />
          </div>
        </div>

        {/* Format & Quality */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Formato</label>
            <Select value={format} onValueChange={(v) => setFormat(v as MediaDownloadFormat)} disabled={loading}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mp4">
                  <span className="flex items-center gap-2"><Video className="h-4 w-4" /> MP4</span>
                </SelectItem>
                <SelectItem value="mp3">
                  <span className="flex items-center gap-2"><Music className="h-4 w-4" /> MP3</span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Qualidade</label>
            <Select value={quality} onValueChange={setQuality} disabled={loading}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {QUALITY_OPTIONS.map((q) => (
                  <SelectItem key={q.value} value={q.value}>{q.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Download Button */}
        <Button
          onClick={handleDownload}
          disabled={loading || !url.trim()}
          className="w-full"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processando...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Baixar
            </>
          )}
        </Button>
      </div>

      {/* Result */}
      {result && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-3 animate-fade-in">
          <div className="flex items-center gap-2 text-primary">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-medium">Download pronto!</span>
          </div>

          <div className="text-sm text-muted-foreground space-y-1">
            <p className="truncate">Arquivo: {result.filename}</p>
            {result.size && <p>Tamanho: {formatSize(result.size)}</p>}
          </div>

          <Button asChild className="w-full" size="lg">
            <a href={result.downloadUrl} download={result.filename} target="_blank" rel="noopener noreferrer">
              <Download className="h-4 w-4 mr-2" />
              Baixar arquivo
            </a>
          </Button>
        </div>
      )}
    </div>
  );
}
