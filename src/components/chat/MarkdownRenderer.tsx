import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ExternalLink } from 'lucide-react';

interface MarkdownRendererProps {
  text: string;
}

export function MarkdownRenderer({ text }: MarkdownRendererProps) {
  const [linkToOpen, setLinkToOpen] = useState<string | null>(null);

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    
    // Links internos (começam com /)
    if (href.startsWith('/')) {
      window.location.href = href;
      return;
    }
    
    // Links externos - mostrar confirmação
    setLinkToOpen(href);
  };

  const confirmOpenLink = () => {
    if (linkToOpen) {
      window.open(linkToOpen, '_blank', 'noopener,noreferrer');
      setLinkToOpen(null);
    }
  };

  const formatInline = (s: string) => {
    // Primeiro processa links: [texto](url)
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const parts: (string | JSX.Element)[] = [];
    let lastIndex = 0;
    let match;

    while ((match = linkRegex.exec(s)) !== null) {
      // Adiciona texto antes do link
      if (match.index > lastIndex) {
        const textBefore = s.substring(lastIndex, match.index);
        parts.push(...formatTextWithStyles(textBefore));
      }

      // Adiciona o link
      const linkText = match[1] || '';
      const linkHref = match[2] || '';
      parts.push(
        <a
          key={`link-${match.index}`}
          href={linkHref}
          onClick={(e) => handleLinkClick(e, linkHref)}
          className="inline-flex items-center gap-1 text-primary hover:text-primary/80 underline underline-offset-2 font-medium transition-colors"
        >
          {linkText}
          {!linkHref.startsWith('/') && (
            <ExternalLink className="h-3 w-3" />
          )}
        </a>
      );

      lastIndex = match.index + match[0].length;
    }

    // Adiciona texto restante
    if (lastIndex < s.length) {
      parts.push(...formatTextWithStyles(s.substring(lastIndex)));
    }

    return parts.length > 0 ? parts : formatTextWithStyles(s);
  };

  const formatTextWithStyles = (s: string) => {
    const parts = s.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={i}>{part.slice(1, -1)}</em>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i] || '';

    // Separador horizontal
    if (line.trim() === '---') {
      elements.push(<hr key={`hr-${i}`} className="my-3 border-border/50" />);
      i++;
      continue;
    }

    // Títulos
    if (line.startsWith('### ')) {
      elements.push(
        <h3 key={`h3-${i}`} className="text-lg font-bold mt-4 mb-2">
          {formatInline(line.slice(4))}
        </h3>
      );
      i++;
      continue;
    }

    if (line.startsWith('## ')) {
      elements.push(
        <h2 key={`h2-${i}`} className="text-xl font-bold mt-4 mb-2">
          {formatInline(line.slice(3))}
        </h2>
      );
      i++;
      continue;
    }

    if (line.startsWith('# ')) {
      elements.push(
        <h1 key={`h1-${i}`} className="text-2xl font-bold mt-4 mb-2">
          {formatInline(line.slice(2))}
        </h1>
      );
      i++;
      continue;
    }

    // Listas
    if (line.startsWith('- ')) {
      const items: string[] = [];
      while (i < lines.length && (lines[i] || '').startsWith('- ')) {
        items.push((lines[i] || '').slice(2));
        i++;
      }
      elements.push(
        <ul key={`ul-${i}`} className="list-disc pl-5 space-y-1 my-2">
          {items.map((it, idx) => (
            <li key={idx} className="text-sm">
              {formatInline(it)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Linhas vazias
    if (line.trim().length === 0) {
      elements.push(<div key={`sp-${i}`} className="h-2" />);
      i++;
      continue;
    }

    // Parágrafos normais
    elements.push(
      <p key={`p-${i}`} className="text-sm whitespace-pre-wrap leading-relaxed">
        {formatInline(line)}
      </p>
    );
    i++;
  }

  return (
    <>
      <div className="space-y-1">{elements}</div>

      <AlertDialog open={!!linkToOpen} onOpenChange={() => setLinkToOpen(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ExternalLink className="h-5 w-5" />
              Abrir link externo?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Você será redirecionado para uma página externa:
              <br />
              <span className="font-mono text-xs break-all mt-2 block">
                {linkToOpen}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmOpenLink}>
              Abrir em nova aba
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
