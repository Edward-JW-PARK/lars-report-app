import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createHash, timingSafeEqual } from 'crypto';

// Vercel은 api 디렉터리에서 밑줄(_)로 시작하는 파일을 라우트로 만들지 않으므로
// 이 파일은 공용 모듈로만 사용됩니다.

export type ApiAuthResult =
  | { ok: true }
  | { ok: false; status: number; body: Record<string, unknown> };

function digest(value: string): Buffer {
  return createHash('sha256').update(value).digest();
}

/** 길이 차이로 인한 타이밍 공격을 막기 위해 해시한 뒤 비교합니다. */
function safeEqual(a: string, b: string): boolean {
  return timingSafeEqual(digest(a), digest(b));
}

/** x-admin-key 헤더 또는 Authorization: Bearer 값을 읽습니다. */
function readAdminKey(req: VercelRequest): string {
  const rawHeader = req.headers['x-admin-key'] ?? req.headers['authorization'];
  const raw = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;
  const value = (raw || '').toString().trim();
  if (!value) return '';
  const matched = /^Bearer\s+(.+)$/i.exec(value);
  return matched ? matched[1].trim() : value;
}

/**
 * LARS 관리자 API 인증.
 * LARS_ADMIN_KEY 환경변수와 같은 값을 x-admin-key(또는 Authorization: Bearer) 헤더로 보내야 통과합니다.
 * 키가 서버에 설정되어 있지 않으면 401 대신 503 으로 잠그고, 설정 방법을 안내합니다.
 */
export function checkAdminAuth(req: VercelRequest): ApiAuthResult {
  const expected = (process.env.LARS_ADMIN_KEY || '').trim();

  if (!expected) {
    return {
      ok: false,
      status: 503,
      body: {
        error: '서버에 LARS_ADMIN_KEY 환경변수가 설정되지 않아 API가 잠겨 있습니다.',
        code: 'ADMIN_KEY_NOT_CONFIGURED',
      },
    };
  }

  const provided = readAdminKey(req);
  if (provided && safeEqual(provided, expected)) {
    return { ok: true };
  }

  return {
    ok: false,
    status: 401,
    body: {
      error: '관리자 인증 키가 필요합니다.',
      code: 'ADMIN_AUTH_REQUIRED',
    },
  };
}

/**
 * CORS 헤더를 설정합니다.
 * 무제한 '*' 를 없애고, LARS_ALLOWED_ORIGINS(쉼표 구분)에 등록된 출처만 허용합니다.
 * 아무것도 등록하지 않으면 같은 출처 요청만 동작합니다.
 */
export function applyCors(req: VercelRequest, res: VercelResponse): void {
  const allowedOrigins = (process.env.LARS_ALLOWED_ORIGINS || '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);
  const origin = (req.headers.origin || '').toString().trim();

  if (origin && (allowedOrigins.includes('*') || allowedOrigins.includes(origin))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, X-Admin-Key'
  );
}
