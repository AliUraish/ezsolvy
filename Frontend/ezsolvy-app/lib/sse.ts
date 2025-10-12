export async function streamSSE(url: string, onEvent: (e: any) => void, signal?: AbortSignal) {
  const res = await fetch(url, { method: 'GET', signal, headers: { Accept: 'text/event-stream' } });
  if (!res.ok || !res.body) throw new Error(`SSE failed: ${res.status}`);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buffer.indexOf('\n\n')) !== -1) {
      const chunk = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 2);
      if (!chunk) continue;
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (line.startsWith('data:')) {
          const json = line.slice(5).trim();
          try {
            onEvent(JSON.parse(json));
          } catch {
            // ignore invalid json
          }
        }
      }
    }
  }
}


