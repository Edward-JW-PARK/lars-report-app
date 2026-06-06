// server.cjs - 독립 Express API 서버 (Anthropic Claude 연동 - 원본 데이터 100% 복원 버전)
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// .env.local 파일 수동 로드 (Windows \r 줄바꿈 호환성 패치 버전)
function loadEnvFile() {
  const envPath = path.join(__dirname, '.env.local');
  if (fs.existsSync(envPath)) {
    try {
      const content = fs.readFileSync(envPath, 'utf-8');
      // Windows(\r\n)와 Mac/Linux(\n) 줄바꿈을 모두 통합하여 안전하게 처리합니다.
      const lines = content.replace(/\r\n/g, '\n').split('\n');
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx > 0) {
          const key = trimmed.slice(0, eqIdx).trim();
          // 값 양 끝의 공백 및 따옴표("", '')를 정교하게 제거합니다.
          let val = trimmed.slice(eqIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
      console.log('✅ .env.local 로드 완료');
    } catch (err) {
      console.error('❌ .env.local 파일 읽기 에러:', err.message);
    }
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

// [수정 지점 1] SyntaxError 방지를 위해 중복 선언 가능성이 있는 pool, dbError, inMemoryEvaluations 변수를 상단에서 단 한 번만 정의합니다.
let pool = null;
let dbError = null;
let inMemoryEvaluations = [
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
    // 하단의 중복 선언 구문(let inMemoryEvaluations = [...])은 완전히 제거되어 상단 단일 변수를 그대로 활용합니다.
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

// ── 정규식 기반 알맹이 텍스트 추출 함수 ────────────────────────────────
function extractFieldByRegex(text, fieldName, nextFieldName) {
  const escapedFieldName = fieldName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  let patternStr;

  if (nextFieldName) {
    const escapedNextFieldName = nextFieldName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    patternStr = `"${escapedFieldName}"\\s*:\\s*"([\\s\\S]*?)"\\s*,\\s*"${escapedNextFieldName}"`;
  } else {
    patternStr = `"${escapedFieldName}"\\s*:\\s*"([\\s\\S]*?)"\\s*\\}?\\s*`;
  }

  const regex = new RegExp(patternStr, 'i');
  let match = text.match(regex);

  if (match) {
    return match[1];
  }

  const loosePatternStr = nextFieldName 
    ? `"${escapedFieldName}"\\s*:\\s*"([\\s\\S]*?)"?\\s*(?=,\\s*"${escapedNextFieldName}")`
    : `"${escapedFieldName}"\\s*:\\s*"([\\s\\S]*?)"\\s*(?=\\s*\\})`;
  
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

// 5. POST /api/generate-coaching-report - Claude AI 피드백 생성
app.post('/api/generate-coaching-report', async (req, res) => {
  try {
    const { studentName, grade, subject, examType, totalScore, wrongQuestions, mentorNotes } = req.body;

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
            .map((q) => `- 문항 ${q.q_idx}번 (${q.ch_name} 단원, 난이도: ${q.diff}):\n  * 성취기준: [${q.std_code}] ${q.std_desc}\n  * 오답 요인: ${q.misconception || '개념 이해 부족'}`)
            .join('\n')
        : '오답 문항이 없습니다. (100점 만점!)';

    const gradeLabel = grade === 'middle_1' ? '중학교 1학년' : grade === 'middle_2' ? '중학교 2학년' : '중학교 3학년';
    const subjectLabel = subject === 'math' ? '수학' : '영어';

    const systemInstruction = `당신은 대한민국 최고 수준의 교육 진단 전문 'SGS Learnway 학습성과 진단 엔진'입니다. 지정된 JSON 형식으로만 답변을 반환하십시오.
    {
      "overallAnalysis": "종합 분석 2~3문장.",
      "conceptAnalysis": "오개념 취약 분석 요약.",
      "coachingPrescription": "멘토용 [1단계], [2단계], [3단계] 지침.",
      "actionPlan": "학생용 미션 정리."
    }`;

    const prompt = `[평가 데이터]
    - 학생명: ${studentName} / 학년: ${gradeLabel} / 과목: ${subjectLabel} / 회차: ${examType} / 점수: ${totalScore}점
    - 틀린 문항: ${wrongQuestionsText}
    - 멘토 메모: ${mentorNotes || '없음'}`;

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 3000,
      system: systemInstruction,
      messages: [{ role: 'user', content: prompt }],
    });

    const responseText = response.content[0].type === 'text' ? response.content[0].text : '';
    let resultJson = robustJsonParse(responseText);

    return res.status(200).json(resultJson);
  } catch (error) {
    console.error('❌ API 에러:', error.message || error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// 6. GET /api/health - 헬스체크 엔드포인트
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'LARS API 서버 정상 작동 중',
    apiKey: process.env.ANTHROPIC_API_KEY ? '✅ 설정됨' : '❌ 없음',
    dbMode: pool ? '✅ PostgreSQL 연결됨' : '⚠️ 인메모리 모드'
  });
});

// 7. GET /api/db-status - DB 실제 상태 확인용 디버그 엔드포인트
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

// ── [수정 및 버그 예방] 배포 환경을 위한 React 정적 파일(dist) 통합 서빙 ────────────────────
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  
  // [수정] Express 5 / path-to-regexp v8 규격에 맞춘 명명된 와일드카드 적용 (루트 및 하위 경로 전체 매칭)
  app.get('/{*splat}', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
  console.log('📦 배포 통합 서빙 활성화: dist 폴더 정적 라우팅이 완료되었습니다.');
} else {
  console.warn('⚠️  dist 폴더가 없습니다. 로컬 개발 API 서버 모드로만 동작합니다.');
}

// [수정 완료] 레일웨이 전용 포트 및 "0.0.0.0" 호스트 바인딩 적용
app.listen(PORT, "0.0.0.0", () => {
  console.log(`\n🚀 LARS API 서버 시작! http://0.0.0.0:${PORT}`);
  console.log(`   API 키: ${process.env.ANTHROPIC_API_KEY ? '✅ 정상 로드됨' : '❌ 없음 - .env.local 확인 필요'}`);
  console.log(`   헬스체크: http://0.0.0.0:${PORT}/api/health\n`);
});
