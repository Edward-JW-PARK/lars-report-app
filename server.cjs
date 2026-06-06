// server.cjs - 독립 Express API 서버 (Anthropic Claude 연동)
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// .env.local 파일 수동 로드
function loadEnvFile() {
  const envPath = path.join(__dirname, '.env.local');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim();
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
    console.log('✅ .env.local 로드 완료');
  } else {
    console.warn('⚠️  .env.local 파일이 없습니다.');
  }
}

loadEnvFile();

const Anthropic = require('@anthropic-ai/sdk');
const { Pool } = require('pg');

// Railway는 DATABASE_URL 환경변수를 자동으로 넣어줍니다.
const rawDbUrl = process.env.DATABASE_URL;
const isDbConfigured = !!rawDbUrl;

console.log(`\n🔍 DATABASE_URL 환경변수 상태: ${isDbConfigured ? '✅ 존재함' : '❌ 없음'}`);
if (rawDbUrl) {
  // 비밀번호 마스킹 후 일부만 출력
  const maskedUrl = rawDbUrl.replace(/:([^@]+)@/, ':****@');
  console.log(`   URL(마스킹): ${maskedUrl}`);
}

let pool = null;
let dbError = null;

if (isDbConfigured) {
  try {
    // railway.internal = Railway 내부 네트워크 (SSL 불필요, Private Networking 활성화 필요)
    // rlwy.net / proxy.rlwy.net = Railway 공개 프록시 URL (SSL 필요)
    const isInternalUrl = rawDbUrl.includes('railway.internal');
    const isPublicProxy = rawDbUrl.includes('rlwy.net');
    pool = new Pool({
      connectionString: rawDbUrl,
      ssl: isInternalUrl
        ? false
        : { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
      max: 5
    });
    console.log(`🐘 PostgreSQL 연결 풀 생성 완료 (${isInternalUrl ? '내부 네트워크' : isPublicProxy ? '공개 프록시(rlwy.net)' : '외부 URL'} 모드)`);
  } catch (poolErr) {
    console.error('❌ Pool 생성 실패:', poolErr.message);
    dbError = poolErr.message;
    pool = null;
  }
} else {
  console.warn('⚠️ DATABASE_URL 환경변수가 없습니다. DB 없이 인메모리(임시) 모드로 동작합니다.');
  dbError = 'DATABASE_URL 환경변수가 설정되지 않았습니다.';
}

// 데이터베이스 초기화 함수
async function initDatabase() {
  if (!pool) {
    // 로컬 백업용 인메모리 데이터 적재
    inMemoryEvaluations = [
      {
        id: "eval-mingun-pre",
        studentName: "박민건",
        grade: "middle_3",
        subject: "math",
        examType: "사전",
        mentorName: "박하늘 코치",
        mentorNotes: "기초적인 연산은 빠르고 정확하지만, 곱셈공식의 문장제 활용 및 복잡한 식을 치환하여 인수분해하는 고난도 문제를 다룰 때 순간적인 오개념이나 적용 실수가 빈번함. 태도는 다소 성급하게 끝내려는 경향이 있음.",
        date: "2026.04.27",
        answers: {
          1: true, 2: true, 3: true, 4: true, 5: true, 6: true, 7: true, 8: true, 9: true, 10: true,
          11: true, 12: true, 13: true, 
          14: false,
          15: true, 16: true, 
          17: false,
          18: true, 19: true, 
          20: false,
          21: true, 22: true, 23: true, 24: true, 25: true
        },
        aiResult: {
          overallAnalysis: "박민건 학생은 제곱근과 실수의 대소 비교, 지수법칙의 기초 연산 등 기본 영역에서 뛰어난 직관과 높은 성취(88점)를 나타내고 있습니다. 전반적인 수학적 이해력과 계산 속도는 우수하나, 정밀성과 심화 집중력이 다소 흔들리는 양상을 보입니다.",
          conceptAnalysis: "곱셈 공식의 변형식 적용(14, 17번) 및 복잡한 식의 치환형 인수분해(20번)에서 개념 오답이 관찰됩니다. 이는 단순히 공식을 암기한 수준에 머무르고 있어, 여러 식의 묶음이나 변형 공식을 입체적으로 치환해 응용하는 힘이 약함을 의미합니다.",
          coachingPrescription: "1단계: (x + y)² = x² + 2xy + y²의 전개 과정을 면적 모델이나 직관적인 기하 모형으로 보여주며 대칭적 공식을 스스로 유도하게 지도하십시오.\n2단계: 복잡한 항의 식은 다른 문자로 크게 치환(예: A = x-2)하여 간소화하고 전개하는 과정을 풀이 과정에 생략 없이 쓰도록 유도하십시오.\n3단계: 매주 10분씩 멘토링 초반에 인수분해 오답 역추적 훈련을 통해 실수를 정정하는 시간을 가지십시오.",
          actionPlan: "1. 완전제곱식의 변형 공식 3종을 백지에 스스로 유도하고 멘토에게 구두로 설명해 보기.\n2. 매일 3문제씩 치환형 인수분해 문제 식 설계부터 꼼꼼히 적으며 풀어보는 훈련하기."
        }
      },
      {
        id: "eval-mingun-mid",
        studentName: "박민건",
        grade: "middle_3",
        subject: "math",
        examType: "중간",
        mentorName: "박하늘 코치",
        mentorNotes: "곱셈공식과 인수분해 영역을 멘토와 보충 학습한 후 치른 시험. 식을 치환해서 푸는 형태에 대해 자신감을 얻었으나, 여전히 연립방정식 활용 실생활 문제에서 식이 막히는 부분이 존재함.",
        date: "2026.05.20",
        answers: {
          1: true, 2: true, 3: true, 4: true, 5: true, 6: true, 7: true, 8: true, 9: true, 10: true,
          11: true, 12: true, 13: true, 14: true, 15: true, 16: true, 17: true, 18: true, 19: true, 20: true,
          21: false,
          22: true, 23: true, 
          24: false,
          25: true
        },
        aiResult: {
          overallAnalysis: "박민건 학생은 중간 평가에서 92점을 기록하며 직전 사전 평가(88점) 대비 눈에 띄게 향상되었습니다. 특히 이전의 취약점이었던 곱셈공식 변형과 치환 인수분해 문제를 모두 완벽하게 해결하며 학습 교정의 긍정적인 성과를 보였습니다.",
          conceptAnalysis: "원의 중심각과 접선 성질이 결합된 기하 각도 문항(21번)과 통계 대푯값 계산(24번)에서 경미한 실수가 발생했습니다. 개념 누수라기보다는 기하학적 도형의 위치 관계 단서 파악과 자료 정렬 시 발생한 단순 연산 실수에 가깝습니다.",
          coachingPrescription: "1단계: 원의 접선과 반지름이 만나는 지점이 '직각(90도)'이 된다는 기본 직교 성질을 도형 위에 반드시 표시하고 시작하도록 가이드하십시오.\n2단계: 자료의 중앙값을 구할 때는 반드시 크기 순서대로 숫자를 다시 나열하여 중복이나 누락이 없는지 시각적으로 체크하도록 피드백하십시오.",
          actionPlan: "1. 기하 문제를 풀 때 '반지름'과 '직각 표시'를 붉은 펜으로 먼저 그리는 훈련하기.\n2. 자료 분석 시 항상 정렬을 수동으로 검증하는 체크리스트 1개 실천하기."
        }
      }
    ];
    return;
  }
  
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS evaluations (
      id VARCHAR(50) PRIMARY KEY,
      student_name VARCHAR(100) NOT NULL,
      grade VARCHAR(50) NOT NULL,
      subject VARCHAR(50) NOT NULL,
      exam_type VARCHAR(20) NOT NULL,
      mentor_name VARCHAR(100),
      mentor_notes TEXT,
      answers JSONB NOT NULL,
      date VARCHAR(50),
      ai_result JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  
  try {
    const client = await pool.connect();
    try {
      await client.query(createTableQuery);
      console.log('✅ evaluations 테이블 상태 검증 완료');
      
      const checkRes = await client.query('SELECT COUNT(*) FROM evaluations');
      const count = parseInt(checkRes.rows[0].count, 10);
      
      if (count === 0) {
        console.log('📦 DB가 비어 있습니다. 초기 박민건 2회차 모형 데이터를 마이그레이션합니다...');
        const initialEvals = [
          {
            id: "eval-mingun-pre",
            studentName: "박민건",
            grade: "middle_3",
            subject: "math",
            examType: "사전",
            mentorName: "박하늘 코치",
            mentorNotes: "기초적인 연산은 빠르고 정확하지만, 곱셈공식의 문장제 활용 및 복잡한 식을 치환하여 인수분해하는 고난도 문제를 다룰 때 순간적인 오개념이나 적용 실수가 빈번함. 태도는 다소 성급하게 끝내려는 경향이 있음.",
            date: "2026.04.27",
            answers: {
              1: true, 2: true, 3: true, 4: true, 5: true, 6: true, 7: true, 8: true, 9: true, 10: true,
              11: true, 12: true, 13: true, 
              14: false,
              15: true, 16: true, 
              17: false,
              18: true, 19: true, 
              20: false,
              21: true, 22: true, 23: true, 24: true, 25: true
            },
            aiResult: {
              overallAnalysis: "박민건 학생은 제곱근과 실수의 대소 비교, 지수법칙의 기초 연산 등 기본 영역에서 뛰어난 직관과 높은 성취(88점)를 나타내고 있습니다. 전반적인 수학적 이해력과 계산 속도는 우수하나, 정밀성과 심화 집중력이 다소 흔들리는 양상을 보입니다.",
              conceptAnalysis: "곱셈 공식의 변형식 적용(14, 17번) 및 복잡한 식의 치환형 인수분해(20번)에서 개념 오답이 관찰됩니다. 이는 단순히 공식을 암기한 수준에 머무르고 있어, 여러 식의 묶음이나 변형 공식을 입체적으로 치환해 응용하는 힘이 약함을 의미합니다.",
              coachingPrescription: "1단계: (x + y)² = x² + 2xy + y²의 전개 과정을 면적 모델이나 직관적인 기하 모형으로 보여주며 대칭적 공식을 스스로 유도하게 지도하십시오.\n2단계: 복잡한 항의 식은 다른 문자로 크게 치환(예: A = x-2)하여 간소화하고 전개하는 과정을 풀이 과정에 생략 없이 쓰도록 유도하십시오.\n3단계: 매주 10분씩 멘토링 초반에 인수분해 오답 역추적 훈련을 통해 실수를 정정하는 시간을 가지십시오.",
              actionPlan: "1. 완전제곱식의 변형 공식 3종을 백지에 스스로 유도하고 멘토에게 구두로 설명해 보기.\n2. 매일 3문제씩 치환형 인수분해 문제 식 설계부터 꼼꼼히 적으며 풀어보는 훈련하기."
            }
          },
          {
            id: "eval-mingun-mid",
            studentName: "박민건",
            grade: "middle_3",
            subject: "math",
            examType: "중간",
            mentorName: "박하늘 코치",
            mentorNotes: "곱셈공식과 인수분해 영역을 멘토와 보충 학습한 후 치른 시험. 식을 치환해서 푸는 형태에 대해 자신감을 얻었으나, 여전히 연립방정식 활용 실생활 문제에서 식이 막히는 부분이 존재함.",
            date: "2026.05.20",
            answers: {
              1: true, 2: true, 3: true, 4: true, 5: true, 6: true, 7: true, 8: true, 9: true, 10: true,
              11: true, 12: true, 13: true, 14: true, 15: true, 16: true, 17: true, 18: true, 19: true, 20: true,
              21: false,
              22: true, 23: true, 
              24: false,
              25: true
            },
            aiResult: {
              overallAnalysis: "박민건 학생은 중간 평가에서 92점을 기록하며 직전 사전 평가(88점) 대비 눈에 띄게 향상되었습니다. 특히 이전의 취약점이었던 곱셈공식 변형과 치환 인수분해 문제를 모두 완벽하게 해결하며 학습 교정의 긍정적인 성과를 보였습니다.",
              conceptAnalysis: "원의 중심각과 접선 성질이 결합된 기하 각도 문항(21번)과 통계 대푯값 계산(24번)에서 경미한 실수가 발생했습니다. 개념 누수라기보다는 기하학적 도형의 위치 관계 단서 파악과 자료 정렬 시 발생한 단순 연산 실수에 가깝습니다.",
              coachingPrescription: "1단계: 원의 접선과 반지름이 만나는 지점이 '직각(90도)'이 된다는 기본 직교 성질을 도형 위에 반드시 표시하고 시작하도록 가이드하십시오.\n2단계: 자료의 중앙값을 구할 때는 반드시 크기 순서대로 숫자를 다시 나열하여 중복이나 누락이 없는지 시각적으로 체크하도록 피드백하십시오.",
              actionPlan: "1. 기하 문제를 풀 때 '반지름'과 '직각 표시'를 붉은 펜으로 먼저 그리는 훈련하기.\n2. 자료 분석 시 항상 정렬을 수동으로 검증하는 체크리스트 1개 실천하기."
            }
          }
        ];
        
        for (const item of initialEvals) {
          const insertQuery = `
            INSERT INTO evaluations (id, student_name, grade, subject, exam_type, mentor_name, mentor_notes, answers, date, ai_result)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          `;
          await client.query(insertQuery, [
            item.id,
            item.studentName,
            item.grade,
            item.subject,
            item.examType,
            item.mentorName,
            item.mentorNotes,
            JSON.stringify(item.answers),
            item.date,
            JSON.stringify(item.aiResult)
          ]);
        }
        console.log('✅ 초기 박민건 데이터 마이그레이션 완료!');
      }
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('❌ 데이터베이스 초기화 실패:', err.message);
  }
}

const app = express();
const PORT = process.env.PORT || 3099;

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '2mb' }));

// ── [수정] 정규식 기반 알맹이 텍스트 추출 함수 (빈칸 버그 전면 해결) ────────────────
function extractFieldByRegex(text, fieldName, nextFieldName) {
  const escapedFieldName = fieldName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  let patternStr;

  if (nextFieldName) {
    const escapedNextFieldName = nextFieldName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    patternStr = `"${escapedFieldName}"\\s*:\\s*"([\\s\\S]*?)"\\s*,\\s*"${escapedNextFieldName}"`;
  } else {
    // [마지막 필드 전용] 뒤에 닫는 쌍따옴표(")와 마지막 중괄호 } 사이의 문자열을 가장 안전하게 전체 추출
    patternStr = `"${escapedFieldName}"\\s*:\\s*"([\\s\\S]*?)"\\s*\\}?\\s*`;
  }

  const regex = new RegExp(patternStr, 'i');
  let match = text.match(regex);

  if (match) {
    return match[1];
  }

  // 느슨한 매칭 백업
  const loosePatternStr = nextFieldName 
    ? `"${escapedFieldName}"\\s*:\\s*"([\\s\\S]*?)"?\\s*(?=,\\s*"${escapedNextFieldName}")`
    : `"${escapedFieldName}"\\s*:\\s*"([\\s\\S]*?)"?\\s*(?=\\s*\\})`;
  
  const looseRegex = new RegExp(loosePatternStr, 'i');
  match = text.match(looseRegex);
  
  if (match) {
    return match[1];
  }

  return "";
}

// ── 강력한 통합 JSON 파싱/복구 엔진 ──────────────────────────────────────────
function robustJsonParse(rawText) {
  let cleaned = rawText.trim();

  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  cleaned = cleaned.trim();

  try {
    return JSON.parse(cleaned);
  } catch (e) {
    console.warn('⚠️ 표준 JSON.parse 실패. 정규식 기반 복구 파서 가동...');
  }

  const fields = ['overallAnalysis', 'conceptAnalysis', 'coachingPrescription', 'actionPlan'];
  const result = {};

  for (let i = 0; i < fields.length; i++) {
    const current = fields[i];
    const next = fields[i + 1] || null;
    let extracted = extractFieldByRegex(cleaned, current, next);

    extracted = extracted
      .replace(/\\"/g, '"')
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t');

    result[current] = extracted.trim();
  }

  if (result.overallAnalysis || result.conceptAnalysis || result.coachingPrescription || result.actionPlan) {
    console.log('✅ 정규식 복구 파서로 텍스트 추출에 성공하였습니다!');
    return result;
  }

  throw new Error("정규식 복구 파서로도 데이터를 추출할 수 없습니다.");
}

// ── 데이터베이스 연동 임시 인메모리 저장소 (DB 없을 때 호환) ────────────────────────
let inMemoryEvaluations = [];

initDatabase();

// 1. GET /api/evaluations - 전체 채점 기록 목록 조회 (최신 등록순)
app.get('/api/evaluations', async (req, res) => {
  if (pool) {
    try {
      const dbRes = await pool.query('SELECT * FROM evaluations ORDER BY created_at DESC');
      const list = dbRes.rows.map(row => ({
        id: row.id,
        studentName: row.student_name,
        grade: row.grade,
        subject: row.subject,
        examType: row.exam_type,
        mentorName: row.mentor_name,
        mentorNotes: row.mentor_notes,
        answers: row.answers,
        date: row.date,
        aiResult: row.ai_result
      }));
      return res.json(list);
    } catch (err) {
      console.error('❌ evaluations 조회 실패:', err.message);
      return res.status(500).json({ error: 'DB 조회 도중 에러가 발생했습니다.' });
    }
  } else {
    return res.json(inMemoryEvaluations);
  }
});

// 2. POST /api/evaluations - 신규 채점 기록 등록
app.post('/api/evaluations', async (req, res) => {
  const { id, studentName, grade, subject, examType, mentorName, mentorNotes, answers, date, aiResult } = req.body;
  console.log(`\n📥 [POST /api/evaluations] 신규 등록 요청 수신`);
  console.log(`   학생명: ${studentName}, 학년: ${grade}, 과목: ${subject}, 회차: ${examType}`);
  console.log(`   pool 상태: ${pool ? '✅ DB 연결됨' : '❌ 인메모리 모드'}`);
  if (pool) {
    try {
      const insertQuery = `
        INSERT INTO evaluations (id, student_name, grade, subject, exam_type, mentor_name, mentor_notes, answers, date, ai_result)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `;
      await pool.query(insertQuery, [
        id,
        studentName,
        grade,
        subject,
        examType,
        mentorName,
        mentorNotes,
        JSON.stringify(answers),
        date,
        aiResult ? JSON.stringify(aiResult) : null
      ]);
      console.log(`✅ [DB INSERT 성공] ${studentName} 학생 데이터 저장 완료 (id: ${id})`);
      return res.status(201).json({ success: true });
    } catch (err) {
      console.error(`❌ [DB INSERT 실패] evaluations 추가 실패: ${err.message}`);
      console.error(`   오류 상세:`, err);
      return res.status(500).json({ error: 'DB 저장 도중 에러가 발생했습니다.', detail: err.message });
    }
  } else {
    console.warn(`⚠️ [인메모리 저장] DB 미연결 상태 - ${studentName} 데이터를 메모리에만 저장합니다.`);
    const newEval = { id, studentName, grade, subject, examType, mentorName, mentorNotes, answers, date, aiResult };
    inMemoryEvaluations.unshift(newEval);
    return res.status(201).json({ success: true });
  }
});

// 3. PUT /api/evaluations/:id - 채점 기록 수정 (AI 분석 결과 업데이트 포함)
app.put('/api/evaluations/:id', async (req, res) => {
  const { id } = req.params;
  const { studentName, grade, subject, examType, mentorName, mentorNotes, answers, date, aiResult } = req.body;
  if (pool) {
    try {
      const updateQuery = `
        UPDATE evaluations
        SET student_name = $1, grade = $2, subject = $3, exam_type = $4, mentor_name = $5, mentor_notes = $6, answers = $7, date = $8, ai_result = $9
        WHERE id = $10
      `;
      await pool.query(updateQuery, [
        studentName,
        grade,
        subject,
        examType,
        mentorName,
        mentorNotes,
        JSON.stringify(answers),
        date,
        aiResult ? JSON.stringify(aiResult) : null,
        id
      ]);
      return res.json({ success: true });
    } catch (err) {
      console.error('❌ evaluations 수정 실패:', err.message);
      return res.status(500).json({ error: 'DB 수정 도중 에러가 발생했습니다.' });
    }
  } else {
    inMemoryEvaluations = inMemoryEvaluations.map(e => 
      e.id === id 
        ? { ...e, studentName, grade, subject, examType, mentorName, mentorNotes, answers, date, aiResult }
        : e
    );
    return res.json({ success: true });
  }
});

// 4. DELETE /api/evaluations/:id - 채점 기록 삭제
app.delete('/api/evaluations/:id', async (req, res) => {
  const { id } = req.params;
  if (pool) {
    try {
      await pool.query('DELETE FROM evaluations WHERE id = $1', [id]);
      return res.json({ success: true });
    } catch (err) {
      console.error('❌ evaluations 삭제 실패:', err.message);
      return res.status(500).json({ error: 'DB 삭제 도중 에러가 발생했습니다.' });
    }
  } else {
    inMemoryEvaluations = inMemoryEvaluations.filter(e => e.id !== id);
    return res.json({ success: true });
  }
});

// ── POST /api/generate-coaching-report ──────────────────────────────────────
app.post('/api/generate-coaching-report', async (req, res) => {
  try {
    const {
      studentName, grade, subject, examType,
      totalScore, wrongQuestions, mentorNotes
    } = req.body;

    if (!studentName || !grade || !subject) {
      return res.status(400).json({ error: '필수 항목 누락: studentName, grade, subject' });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'ANTHROPIC_API_KEY가 설정되지 않았습니다.' });
    }

    const anthropic = new Anthropic({ apiKey });

    const wrongQuestionsText =
      wrongQuestions && wrongQuestions.length > 0
        ? wrongQuestions
            .map(
              (q) =>
                `- 문항 ${q.q_idx}번 (${q.ch_name} 단원, 난이도: ${q.diff}):\n  * 성취기준: [${q.std_code}] ${q.std_desc}\n  * 오답 요인/오개념: ${q.misconception || '개념 이해 부족'}`
            )
            .join('\n')
        : '오답 문항이 없습니다. (100점 만점!)';

    const gradeLabel =
      grade === 'middle_1' ? '중학교 1학년'
      : grade === 'middle_2' ? '중학교 2학년'
      : '중학교 3학년';

    const subjectLabel = subject === 'math' ? '수학' : '영어';

    // ★ [프롬프트 튜닝] 분량을 컴팩트하게 조율하고 불필요한 미사여구를 대폭 감축 지시 ★
    const systemInstruction = `당신은 대한민국 최고 수준의 교육 진단 및 멘토링 코칭 전문가인 'SGS Learnway 학습성과 진단 엔진'입니다.
귀하의 임무는 학생의 평가 점수와 오답 문항 정보, 멘토의 수기 메모를 분석하여, 학생용 학습 처방과 대학생 멘토가 현장에서 즉시 적용할 수 있는 압축된 피드백 가이드를 제공하는 것입니다.

**[작성 핵심 수칙 - 분량 단축 및 컴팩트화]**
1. 학생의 실명("${studentName}")을 자연스럽게 언급하되, 구구절절한 배경 설명이나 지나치게 화려한 미사여구는 전부 생략하고 핵심 피드백 정보만 압축해 전달하십시오.
2. 모든 분석과 코칭 멘트는 종이 출력물에 보기 좋게 담기도록 기존 분량의 '절반 이하'로 짧고 컴팩트하게 구성해 주십시오. (문장 길이를 명확하게 줄이십시오.)
3. 반드시 아래 지정된 JSON 형식으로만 답변을 반환하십시오. 마크다운, 코드블록 없이 JSON만 반환해야 합니다.
4. JSON 내 문자열에 실제 엔터(줄바꿈)나 쌍따옴표(")는 절대 그냥 쓰지 마십시오. 줄바꿈은 반드시 문자기호 '\\n'으로, 큰따옴표는 작은따옴표(')로 대체하여 표현하십시오.

**[응답 JSON 필드 규격 및 분량 지침]**
{
  "overallAnalysis": "종합 성취 분석 코멘트. 점수 수준과 학생 강약점을 총 2~3개의 간결한 문장으로 요약하여 따뜻하게 격려하고 명확한 현 상태를 평가합니다.",
  "conceptAnalysis": "핵심 취약점 및 오개념 분석. 오답의 성취기준을 토대로 학생이 막혀 있는 수학/영어의 핵심 구멍과 오개념을 구구절절한 설명 없이 요점만 요약하여 2~3문장 이내로 정리합니다.",
  "coachingPrescription": "멘토를 위한 맞춤형 코칭 처방전. 대학생 멘토가 쉽게 행동에 옮기도록 군더더기 서설을 빼고 [1단계], [2단계], [3단계]의 명확한 핵심 실천 행동 지침으로만 쪼개어 아주 콤팩트하게 작성합니다. (단계별로 1~2줄 요약)",
  "actionPlan": "학생을 위한 실천 액션 플랜. 학생용 스스로 학습 미션을 가독성 높게 정리하여 2~3가지를 확실하게 처방합니다. (예: '1. 틀린 문항 5문제 직접 오답 정리하기\\n2. 하루 20분 핵심 공식 카드 정독')"
}

⚠️ 주의: JSON 객체 외의 텍스트(설명, 마크다운, 코드블록 등)를 절대 포함하지 마십시오.`;

    const prompt = `[평가 데이터 및 학생 정보]
- 학생명: ${studentName}
- 학년: ${gradeLabel}
- 과목: ${subjectLabel}
- 평가 회차: ${examType} 평가
- 100점 환산 점수: ${totalScore}점

[틀린 문항 상세 정보]
${wrongQuestionsText}

[멘토의 수기 관찰 메모]
${mentorNotes || '기재된 메모 없음'}

위 데이터를 철저히 분석하여, [응답 JSON 필드 규격]에 맞춘 순수 JSON 객체만 반환해주십시오.`;

    console.log(`\n🤖 Claude AI 분석 요청: ${studentName} (${gradeLabel} ${subjectLabel} ${examType}평가, ${totalScore}점)`);
    console.log(`  오답 수: ${wrongQuestions ? wrongQuestions.length : 0}문항`);

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
      system: systemInstruction,
      messages: [{ role: 'user', content: prompt }],
    });

    const responseText =
      response.content[0].type === 'text' ? response.content[0].text : '';

    console.log('🤖 Claude로부터 받은 로 데이터 가공 및 파싱 시작...');
    
    let resultJson;
    try {
      resultJson = robustJsonParse(responseText);
    } catch (e) {
      console.error('❌ [최종 실패] 모든 구문 분석 실패:', e.message);
      resultJson = { 
        rawText: responseText,
        error: "JSON 파싱 전체 실패",
        overallAnalysis: "죄송합니다. 분석 결과를 안전하게 가공하지 못했습니다. 서버 로그를 참조해 주세요."
      };
    }

    console.log('📦 최종 반환 완료! 반환 키:', Object.keys(resultJson));
    return res.status(200).json(resultJson);

  } catch (error) {
    console.error('❌ API 에러:', error.message || error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// 헬스체크 엔드포인트
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'LARS API 서버 정상 작동 중',
    apiKey: process.env.ANTHROPIC_API_KEY ? '✅ 설정됨' : '❌ 없음',
    dbMode: pool ? '✅ PostgreSQL 연결됨' : '⚠️ 인메모리 모드'
  });
});

// DB 실제 상태 확인용 디버그 엔드포인트
app.get('/api/db-status', async (req, res) => {
  if (!pool) {
    const maskedUrl = rawDbUrl ? rawDbUrl.replace(/:([^@]+)@/, ':****@') : '없음';
    return res.json({
      mode: 'inmemory',
      message: '⚠️ DB 미연결 - 인메모리 모드로 동작 중',
      isDbConfigured,
      rawDbUrlState: rawDbUrl ? `✅ 존재함 (길이: ${rawDbUrl.length})` : '❌ 없음',
      maskedUrl,
      dbError: dbError || '알 수 없는 이유로 풀이 생성되지 않았습니다.',
      inMemoryCount: inMemoryEvaluations.length,
      inMemoryStudents: inMemoryEvaluations.map(e => e.studentName)
    });
  }
  try {
    const countRes = await pool.query('SELECT COUNT(*) as cnt FROM evaluations');
    const listRes = await pool.query('SELECT id, student_name, exam_type, created_at FROM evaluations ORDER BY created_at DESC');
    return res.json({
      mode: 'postgresql',
      message: '✅ PostgreSQL DB 연결 정상',
      totalRecords: parseInt(countRes.rows[0].cnt, 10),
      records: listRes.rows
    });
  } catch (err) {
    return res.status(500).json({
      mode: 'error',
      message: '❌ DB 조회 실패',
      error: err.message
    });
  }
});

// ── [추가] 배포 환경을 위한 React 정적 파일(dist) 통합 서빙 ────────────────────
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  
  // SPA 라우팅 지원: API를 제외한 모든 요청을 index.html로 리다이렉트
  app.get('*any', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
  console.log('📦 배포 통합 서빙 활성화: dist 폴더 정적 라우팅이 완료되었습니다.');
} else {
  console.warn('⚠️  dist 폴더가 없습니다. 로컬 개발 API 서버 모드로만 동작합니다.');
}

app.listen(PORT, () => {
  console.log(`\n🚀 LARS API 서버 시작! http://localhost:${PORT}`);
  console.log(`   API 키: ${process.env.ANTHROPIC_API_KEY ? '✅ 정상 로드됨' : '❌ 없음 - .env.local 확인 필요'}`);
  console.log(`   헬스체크: http://localhost:${PORT}/api/health\n`);
});
