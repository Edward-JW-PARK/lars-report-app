// LARS 관리자 앱의 API 호출 도우미.
// /api/* 요청에 관리자 키를 x-admin-key 헤더로 실어 보냅니다.
// 보안상 브라우저를 닫으면 키가 자동 삭제되도록 sessionStorage를 사용합니다.

const STORAGE_KEY = "lars_admin_key";

export function getAdminKey(): string {
  try {
    // 이전에 localStorage에 저장됐던 공용 키가 있다면 즉시 정리합니다.
    if (localStorage.getItem(STORAGE_KEY)) {
      localStorage.removeItem(STORAGE_KEY);
    }
    return sessionStorage.getItem(STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

export function saveAdminKey(key: string): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.setItem(STORAGE_KEY, key);
  } catch {
    // 저장할 수 없는 환경(사생활 보호 모드 등)에서는 메모리 상태만 사용합니다.
  }
}

export function clearAdminKey(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
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
