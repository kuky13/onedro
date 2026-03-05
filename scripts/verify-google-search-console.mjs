const url = 'http://localhost:8080/google7003972c56534389.html';

try {
  const res = await fetch(url);
  const text = await res.text();
  console.log('status', res.status);
  console.log(text.trim());
} catch (err) {
  console.error('fetch_failed', err?.name || 'Error', err?.message || String(err));
  process.exitCode = 1;
}

