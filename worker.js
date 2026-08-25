export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const refCode = url.searchParams.get('ref') || '';

    if (url.pathname === '/register' || url.pathname === '/register/') {
      const appDeepLink = `taskearn://register?ref=${refCode}`;
      
      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TaskEarn Registration</title>
  <style>
    body {
      background-color: #0f172a;
      color: #f8fafc;
      font-family: system-ui, -apple-system, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
      padding: 20px;
      text-align: center;
    }
    .card {
      background-color: #1e293b;
      padding: 30px;
      border-radius: 16px;
      border: 1px solid #334155;
      max-width: 400px;
      width: 100%;
      box-shadow: 0 10px 25px rgba(0,0,0,0.3);
    }
    .btn {
      background-color: #6366f1;
      color: white;
      padding: 14px 24px;
      border-radius: 10px;
      text-decoration: none;
      font-weight: bold;
      display: inline-block;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="card">
    <h2>TaskEarn Registration</h2>
    <p>Referral Code: <strong>${refCode || 'N/A'}</strong></p>
    <a href="${appDeepLink}" class="btn">Open in App</a>
  </div>
  <script>
    window.location.href = "${appDeepLink}";
  </script>
</body>
</html>`;

      return new Response(html, {
        headers: { 'content-type': 'text/html;charset=UTF-8' },
      });
    }

    if (env.ASSETS) {
      const assetResponse = await env.ASSETS.fetch(request);
      if (assetResponse.status !== 404) {
        return assetResponse;
      }
      return env.ASSETS.fetch(new Request(new URL('/index.html', request.url), request));
    }

    return new Response('404 Not Found', { status: 404 });
  },
};