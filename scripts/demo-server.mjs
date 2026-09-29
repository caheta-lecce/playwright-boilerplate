import { createServer } from 'node:http';

// Deliberately a local UI demo, not a real authentication implementation.
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Playwright example</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>body{font:18px system-ui;margin:3rem;color:#18202a;background:#fff}input,button{font:inherit;padding:.5rem}label{display:block;margin-bottom:.5rem}[role=alert]{color:#a00000}</style>
</head><body><main>
<section id="login"><h1>Example sign in</h1>
<p>This local demo stores a display name in your browser.</p>
<form novalidate><label for="name">Display name</label>
<input id="name" autocomplete="name" aria-describedby="error">
<button type="submit">Sign in</button><p id="error" role="alert"></p></form></section>
<section id="home" hidden><h1 id="welcome"></h1><button id="logout">Sign out</button></section>
</main><script>
const login = document.querySelector('#login');
const home = document.querySelector('#home');
const nameInput = document.querySelector('#name');
const error = document.querySelector('#error');
function render() {
  const name = localStorage.getItem('example.displayName');
  login.hidden = Boolean(name);
  home.hidden = !name;
  document.querySelector('#welcome').textContent = name ? 'Welcome, ' + name : '';
}
document.querySelector('form').addEventListener('submit', (event) => {
  event.preventDefault();
  const name = nameInput.value.trim();
  error.textContent = name ? '' : 'Enter a display name.';
  nameInput.setAttribute('aria-invalid', String(!name));
  if (!name) { nameInput.focus(); return; }
  localStorage.setItem('example.displayName', name);
  render();
});
document.querySelector('#logout').addEventListener('click', () => {
  localStorage.removeItem('example.displayName');
  render();
  nameInput.focus();
});
render();
</script></body></html>`;

const server = createServer((request, response) => {
  if (request.url === '/health') {
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ status: 'ok' }));
    return;
  }
  if (request.url !== '/') {
    response.writeHead(404);
    response.end();
    return;
  }
  response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  response.end(html);
});
server.listen(4173, '127.0.0.1');
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close());
