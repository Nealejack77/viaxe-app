/* Post-process the Expo web export into an installable PWA.
 * - copies public/* into dist/ (icons, manifest, sw)
 * - injects manifest link, theme-color, Apple home-screen meta + apple-touch-icon
 * - registers the service worker
 * Idempotent: safe to run repeatedly.
 */
const fs = require('fs');
const path = require('path');

const root = __dirname + '/..';
const dist = path.join(root, 'dist');
const pub = path.join(root, 'public');
const indexPath = path.join(dist, 'index.html');

if (!fs.existsSync(indexPath)) {
  console.error('pwa-inject: dist/index.html not found — run `expo export --platform web` first.');
  process.exit(1);
}

// 1) Ensure public assets are in dist.
if (fs.existsSync(pub)) {
  for (const f of fs.readdirSync(pub)) {
    fs.copyFileSync(path.join(pub, f), path.join(dist, f));
  }
}

// 2) Inject head + SW registration.
let html = fs.readFileSync(indexPath, 'utf8');

const headTags = `
    <link rel="manifest" href="/manifest.json" />
    <meta name="theme-color" content="#171714" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="VIAXE" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />`;

if (!html.includes('rel="manifest"')) {
  html = html.replace('</head>', headTags + '\n  </head>');
}

// notch-safe viewport
if (!html.includes('viewport-fit=cover')) {
  html = html.replace(
    /(<meta name="viewport" content="[^"]*)("\s*\/?>)/,
    '$1, viewport-fit=cover$2'
  );
}

const swReg = `
    <script>
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', function () {
          navigator.serviceWorker.register('/sw.js').catch(function () {});
        });
      }
    </script>`;

if (!html.includes("serviceWorker.register('/sw.js')")) {
  html = html.replace('</body>', swReg + '\n  </body>');
}

fs.writeFileSync(indexPath, html);
console.log('pwa-inject: manifest, apple meta, icons and service worker injected into dist/index.html');
