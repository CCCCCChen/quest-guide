const API_BASE = import.meta.env.VITE_API_BASE || '/api';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  // Electron 环境：通过 IPC 代理转发到本地后端
  if (window.electronAPI?.api?.proxy) {
    const method = options.method || 'GET';
    const body = options.body ? JSON.parse(options.body as string) : undefined;
    const res = await window.electronAPI.api.proxy(method, path, body);
    if (res.status !== 200 && res.status !== 201) {
      const err = (res.body as { error?: string })?.error || `请求失败: ${res.status}`;
      throw new Error(res.status === 0 ? `后端未启动: ${res.error}` : err);
    }
    return res.body as T;
  }

  // 浏览器 / Vite dev server 环境：直接 fetch
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `请求失败: ${res.status}`);
  }
  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

export default api;
