// LARS 관리자 앱의 API 호출 도우미.
// /api/* 요청에 관리자 키를 x-admin-key 헤더로 실어 보냅니다.

const STORAGE_KEY = "lars_admin_key";

export function getAdminKey(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

export function saveAdminKey(key: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, key);
  } catch {
    // 저장할 수 없는 환경(사생활 보호 모드 등)에서는 메모리 상태만 사용합니다.
  }
}

export function clearAdminKey(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // 무시
  }
}

export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers || {});
  const key = getAdminKey();

  if (key) {
    headers.set("x-admin-key", key);
  }
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(input, { ...init, headers });
}
