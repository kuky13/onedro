import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Download, Loader2, CheckCircle, FileVideo, FileAudio, Copy, Clock, Eye, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { requestMediaDownload } from '@/services/api/mediaDownloads';
import { classifyDownloadError } from '@/features/video-downloader/classifyDownloadError';
import { DownloadErrorCard } from '@/components/super-admin/downloads/DownloadErrorCard';
const SUPPORTED_DOMAINS = ['youtube.com', 'youtu.be', 'tiktok.com', 'instagram.com', 'facebook.com', 'twitter.com', 'x.com'];
interface DownloadHistory {
  id: string;
  url: string;
  downloadUrl: string;
  filename: string;
  format: string;
  quality: string;
  timestamp: number;
  fileSize?: number;
}
const PROGRESS_MESSAGES = ['Conectando ao servidor...', 'Extraindo metadados do vídeo...', 'Processando download...', 'Convertendo vídeo...', 'Finalizando...'];

const VideoUrlSchema = z
  .string()
  .trim()
  .min(10, 'Por favor, insira um link válido')
  .refine((val) => {
    try {
      // valida URL bem formada
       
      new URL(val);
      return true;
    } catch {
      return false;
    }
  }, 'Por favor, insira um link válido');

export function DownloadVideoPage() {
  const [videoUrl, setVideoUrl] = useState('');
  const [format, setFormat] = useState<'mp4' | 'mp3'>('mp4');
  const [quality, setQuality] = useState('best');
  const [isDownloading, setIsDownloading] = useState(false);
  const [progressMessage, setProgressMessage] = useState('');
  const [downloadHistory, setDownloadHistory] = useState<DownloadHistory[]>([]);
  const [status, setStatus] = useState<{
    type: 'idle' | 'processing' | 'success' | 'error';
    message?: string;
    downloadUrl?: string;
    filename?: string;
    fileSize?: number;
  }>({
    type: 'idle'
  });
  useEffect(() => {
    // Carregar histórico do localStorage
    const savedHistory = localStorage.getItem('videoDownloadHistory');
    if (savedHistory) {
      try {
        setDownloadHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error('Erro ao carregar histórico:', e);
      }
    }
  }, []);
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isDownloading) {
      const initialMessage = PROGRESS_MESSAGES[0];
      if (initialMessage) setProgressMessage(initialMessage);
      let index = 0;
      interval = setInterval(() => {
        index = (index + 1) % PROGRESS_MESSAGES.length;
        const message = PROGRESS_MESSAGES[index];
        if (message) setProgressMessage(message);
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [isDownloading]);
  const validateDomain = (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      return SUPPORTED_DOMAINS.some(domain => urlObj.hostname.includes(domain));
    } catch {
      return false;
    }
  };
  const saveToHistory = (data: Omit<DownloadHistory, 'id' | 'timestamp'>) => {
    const newEntry: DownloadHistory = {
      ...data,
      id: Date.now().toString(),
      timestamp: Date.now()
    };
    const updatedHistory = [newEntry, ...downloadHistory].slice(0, 5);
    setDownloadHistory(updatedHistory);
    localStorage.setItem('videoDownloadHistory', JSON.stringify(updatedHistory));
  };
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Link copiado para área de transferência!');
  };
  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return 'Tamanho desconhecido';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };
  const getFormatIcon = (fmt: string) => {
    return fmt === 'mp3' ? FileAudio : FileVideo;
  };
  const startDownload = async (overrides?: Partial<{ format: 'mp4' | 'mp3'; quality: string }>) => {
    const nextFormat = overrides?.format ?? format;
    const nextQuality = overrides?.quality ?? quality;

    const parsedUrl = VideoUrlSchema.safeParse(videoUrl);
    if (!parsedUrl.success) {
      toast.error(parsedUrl.error.issues?.[0]?.message || 'Por favor, insira um link válido');
      return;
    }
    if (!validateDomain(videoUrl)) {
      toast.error('Domínio não suportado. Use links do YouTube, TikTok, Instagram, Facebook ou Twitter/X.');
      return;
    }
    setIsDownloading(true);
    setStatus({
      type: 'processing'
    });
    try {
      const result = await requestMediaDownload({
        url: videoUrl.trim(),
        format: nextFormat,
        quality: nextQuality,
      });

      setStatus({
        type: 'success',
        downloadUrl: result.downloadUrl,
        filename: result.filename,
        ...(typeof result.size === 'number' ? { fileSize: result.size } : {}),
      });
      saveToHistory({
        url: videoUrl,
        downloadUrl: result.downloadUrl,
        filename: result.filename,
        format: nextFormat,
        quality: nextQuality,
        ...(typeof result.size === 'number' ? { fileSize: result.size } : {}),
      });
      toast.success('Vídeo processado com sucesso!');
    } catch (error: any) {
      const rawMessage = error?.message || 'Erro de conexão com a API';
      const classified = classifyDownloadError({ rawMessage, url: videoUrl });
      setStatus({
        type: 'error',
        message: rawMessage,
      });
      toast.error(classified.title);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownload = async () => startDownload();
  const handleReset = () => {
    setVideoUrl('');
    setStatus({
      type: 'idle'
    });
  };
  const handleHistoryDownload = (item: DownloadHistory) => {
    window.open(item.downloadUrl, '_blank');
    toast.info('Abrindo download...');
  };
  const handleHistoryPreview = (item: DownloadHistory) => {
    window.open(item.downloadUrl, '_blank');
    toast.info('Abrindo pré-visualização...');
  };

  const handleCopyTechnicalDetails = async (details: string) => {
    try {
      await navigator.clipboard.writeText(details);
      toast.success('Detalhes copiados!');
    } catch {
      toast.error('Não foi possível copiar os detalhes');
    }
  };
  return <div className="min-h-screen bg-background">
       {/* Header Responsivo */}
       <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border/50">
         <div className="max-w-7xl mx-auto flex justify-between items-center px-4 lg:px-8 py-3 lg:py-4">
           <Link to="/" className="flex items-center gap-2">
             <img alt="OneDrip Logo" className="h-7 w-7 lg:h-9 lg:w-9" src="/lovable-uploads/logoo.png" />
             <span className="font-bold text-lg lg:text-xl text-foreground">OneDrip</span>
           </Link>
          <Button asChild variant="outline" size="sm" className="text-sm lg:text-base">
            <Link to="/" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Link>
          </Button>
         </div>
       </header>

       {/* Hero Section */}
       <section className="px-4 lg:px-8 pt-8 lg:pt-16 pb-6 lg:pb-12">
         <div className="max-w-4xl mx-auto text-center">
           
           
           <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-3 lg:mb-4 leading-tight">
             Baixe Vídeos de Qualquer
             <br />
             <span className="text-primary">Plataforma</span>
           </h1>
           
           <p className="text-muted-foreground text-base lg:text-lg mb-6 lg:mb-8 max-w-2xl mx-auto">
             YouTube, TikTok, Instagram, Facebook e mais. Escolha o formato e a qualidade ideal para você.
           </p>
         </div>
       </section>

       {/* Main Content */}
       <section className="px-4 lg:px-8 pb-12 lg:pb-20">
         <div className="max-w-4xl mx-auto space-y-6 lg:space-y-8">
           
           {/* Card de Download */}
           <Card className="border-border/50 shadow-lg">
             <CardHeader className="pb-4">
               <CardTitle className="text-xl lg:text-2xl">Cole o Link do Vídeo</CardTitle>
               <CardDescription className="text-base">
                 Suportamos YouTube, TikTok, Instagram, Facebook e Twitter/X
               </CardDescription>
             </CardHeader>
             <CardContent className="space-y-4 lg:space-y-6">
           <div className="space-y-2">
             <Label htmlFor="video-url">Link do Vídeo (YouTube, TikTok, etc.)</Label>
             <Textarea id="video-url" placeholder="https://www.youtube.com/watch?v=..." value={videoUrl} onChange={e => setVideoUrl(e.target.value)} disabled={isDownloading} rows={3} className="resize-none" />
           </div>
 
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="format">Formato</Label>
              <Select value={format} onValueChange={v => setFormat(v as 'mp4' | 'mp3')} disabled={isDownloading}>
                <SelectTrigger id="format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mp4">Vídeo (MP4)</SelectItem>
                  <SelectItem value="mp3">Apenas Áudio (MP3)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quality">Qualidade</Label>
              <Select value={quality} onValueChange={setQuality} disabled={isDownloading}>
                <SelectTrigger id="quality">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="best">Melhor Qualidade</SelectItem>
                  <SelectItem value="1080p">1080p (Full HD)</SelectItem>
                  <SelectItem value="720p">720p</SelectItem>
                  <SelectItem value="480p">480p (SD)</SelectItem>
                  <SelectItem value="360p">360p</SelectItem>
                  <SelectItem value="240p">240p</SelectItem>
                  <SelectItem value="144p">144p</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

           <div className="flex flex-col sm:flex-row gap-3">
             <Button onClick={handleDownload} disabled={isDownloading || !videoUrl.trim()} className="flex-1 h-11 lg:h-12 text-base font-semibold">
               {isDownloading ? <>
                   <Loader2 className="h-4 w-4 animate-spin" />
                   Processando...
                 </> : <>
                   <Download className="h-4 w-4" />
                   Iniciar Download
                 </>}
             </Button>
             {status.type !== 'idle' && <Button onClick={handleReset} variant="outline" className="h-11 lg:h-12">
                 Limpar
               </Button>}
           </div>
         </CardContent>
       </Card>
 
           {/* Status Cards */}
           {status.type === 'processing' && <Card className="border-primary/30 bg-primary/5 shadow-lg">
               <CardHeader>
                 <CardTitle className="flex items-center gap-2 text-xl">
                   <Loader2 className="h-5 w-5 animate-spin text-primary" />
                   Processando Download
                 </CardTitle>
               </CardHeader>
               <CardContent className="space-y-4">
                 <Progress value={undefined} className="w-full h-2" />
                 <p className="text-sm text-muted-foreground text-center animate-pulse">
                   {progressMessage}
                 </p>
                 <p className="text-xs text-muted-foreground text-center">
                   ⏱️ O processamento pode levar alguns minutos dependendo do tamanho do vídeo.
                 </p>
               </CardContent>
             </Card>}

           {status.type === 'success' && status.downloadUrl && <Card className="border-green-500/30 bg-green-500/5 shadow-lg">
               <CardHeader>
                 <CardTitle className="flex items-center gap-2 text-xl">
                   <CheckCircle className="h-5 w-5 text-green-600" />
                   Download Concluído!
                 </CardTitle>
                 <CardDescription className="text-base">
                   ⚠️ O arquivo ficará disponível por tempo limitado. Baixe imediatamente.
                 </CardDescription>
               </CardHeader>
               <CardContent className="space-y-4">
                 <div className="p-6 rounded-xl border bg-background/50 backdrop-blur space-y-4">
              <div className="flex items-start gap-4">
                {(() => {
                  const Icon = getFormatIcon(format);
                  return <Icon className="h-12 w-12 text-primary" />;
                })()}
                <div className="flex-1 space-y-1">
                  <p className="font-semibold text-foreground break-all">{status.filename}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatFileSize(status.fileSize)} • {format.toUpperCase()} • {quality === 'best' ? 'Melhor Qualidade' : quality}
                  </p>
                </div>
              </div>

                   <div className="flex flex-col sm:flex-row gap-3">
                <Button onClick={() => window.open(status.downloadUrl, '_blank')} className="flex-1 h-12 text-base font-semibold">
                  <Download className="h-4 w-4" />
                       Baixar Arquivo
                </Button>
                <Button onClick={() => copyToClipboard(status.downloadUrl!)} variant="outline" className="h-12">
                  <Copy className="h-4 w-4" />
                       Copiar Link
                </Button>
              </div>
                 </div>
               </CardContent>
             </Card>}

            {status.type === 'error' && (
              <DownloadErrorCard
                error={classifyDownloadError({ rawMessage: status.message || '', url: videoUrl })}
                canTryMp3={!isDownloading && format === 'mp4'}
                canTryBest={!isDownloading && quality !== 'best'}
                onRetry={() => startDownload()}
                onTryMp3={() => {
                  setFormat('mp3');
                  setQuality('best');
                  void startDownload({ format: 'mp3', quality: 'best' });
                }}
                onTryBest={() => {
                  setQuality('best');
                  void startDownload({ quality: 'best' });
                }}
                onCopyDetails={() => {
                  const details = status.message || '';
                  void handleCopyTechnicalDetails(details);
                }}
              />
            )}

           {/* Histórico */}
           {downloadHistory.length > 0 && <Card className="border-border/50 shadow-lg">
               <CardHeader>
                 <CardTitle className="flex items-center gap-2 text-xl">
                   <Clock className="h-5 w-5" />
                   Downloads Recentes
                 </CardTitle>
                 <CardDescription className="text-base">
                   Seus últimos downloads (clique para visualizar ou baixar novamente)
                 </CardDescription>
               </CardHeader>
               <CardContent>
                 <div className="space-y-3">
              {downloadHistory.map(item => {
                const Icon = getFormatIcon(item.format);
                const date = new Date(item.timestamp).toLocaleString('pt-BR');
                return <div key={item.id} className="p-4 rounded-xl border bg-background/50 backdrop-blur transition-all hover:border-primary/50 hover:shadow-md flex items-center gap-3 lg:gap-4">
                       <Icon className="h-10 w-10 lg:h-12 lg:w-12 text-primary/70 flex-shrink-0" />
                       <div className="flex-1 min-w-0">
                         <p className="font-semibold text-sm lg:text-base truncate">{item.filename}</p>
                         <p className="text-xs lg:text-sm text-muted-foreground mt-1">
                           {date} • {item.format.toUpperCase()} • {item.quality === 'best' ? 'Melhor' : item.quality}
                         </p>
                       </div>
                       <div className="flex items-center gap-2 flex-shrink-0">
                         <Button onClick={() => handleHistoryPreview(item)} variant="ghost" size="icon" className="h-9 w-9 lg:h-10 lg:w-10">
                           <Eye className="h-4 w-4 lg:h-5 lg:w-5" />
                         </Button>
                         <Button onClick={() => handleHistoryDownload(item)} variant="default" size="icon" className="h-9 w-9 lg:h-10 lg:w-10">
                           <Download className="h-4 w-4 lg:h-5 lg:w-5" />
                         </Button>
                       </div>
                     </div>;
              })}
            </div>
               </CardContent>
             </Card>}
         </div>
       </section>
     </div>;
}