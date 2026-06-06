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
    apiKey: process.env.ANTHROPIC_API_KEY ? '✅ 설정됨' : '❌ 없음'
  });
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
