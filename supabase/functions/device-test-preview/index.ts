import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    const userAgent = req.headers.get("user-agent") || "";

    console.log(`[device-test-preview] Token: ${token}, User-Agent: ${userAgent}`);

    if (!token) {
      return new Response("Token não fornecido", { status: 400 });
    }

    const html = generatePreviewHTML(
      "Diagnóstico de Dispositivo | One Drip",
      "Teste todas as funcionalidades do seu aparelho: tela, câmera, áudio, sensores e mais.",
      token
    );

    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("[device-test-preview] Error:", error);
    return new Response("Erro interno", { status: 500 });
  }
});

function generatePreviewHTML(title: string, description: string, token: string): string {
  const imageUrl =
    "https://storage.googleapis.com/gpt-engineer-file-uploads/c1MYFcoH52gXlUJLHdUVkOoh2fE2/social-images/social-1761995877292-Drip.png";
  const testUrl = `https://www.onedrip.com.br/testar/${token}`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  
  <!-- Meta tags para preview -->
  <meta name="description" content="${escapeHtml(description)}">
  
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="${escapeHtml(testUrl)}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:image" content="${escapeHtml(imageUrl)}">
  <meta property="og:image:width" content="512">
  <meta property="og:image:height" content="512">
  <meta property="og:site_name" content="One Drip">
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(imageUrl)}">
  
  <!-- Redirect para a app -->
  <meta http-equiv="refresh" content="2; url=${escapeHtml(testUrl)}">
  
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    .container {
      text-align: center;
      padding: 20px;
      max-width: 500px;
    }
    h1 {
      margin: 0 0 10px 0;
      font-size: 24px;
    }
    p {
      margin: 0 0 20px 0;
      opacity: 0.9;
      font-size: 14px;
    }
    a {
      display: inline-block;
      padding: 12px 24px;
      background: white;
      color: #667eea;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      transition: all 0.3s;
    }
    a:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(description)}</p>
    <a href="${escapeHtml(testUrl)}">Abrir Diagnóstico</a>
    <p style="margin-top: 40px; font-size: 12px; opacity: 0.7;">Redirecionando automaticamente...</p>
  </div>
  
  <script>
    setTimeout(() => {
      window.location.href = "${escapeHtml(testUrl)}";
    }, 2000);
  </script>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
