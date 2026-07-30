import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Pool } from "pg";

const rawDbUrl = process.env.DATABASE_URL;

let pool: Pool | null = null;
if (rawDbUrl) {
  try {
    pool = new Pool({
      connectionString: rawDbUrl,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
    });
  } catch (e) {
    console.error("Vercel DB Pool Init Error:", e);
  }
}

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
      11: true, 12: true, 13: true, 14: false, 15: true, 16: true, 17: false, 18: true, 19: true, 20: false,
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
      21: false, 22: true, 23: true, 24: false, 25: true
    },
    aiResult: {
      overallAnalysis: "박민건 학생은 중간 평가에서 92점을 기록하며 직전 사전 평가(88점) 대비 눈에 띄게 향상되었습니다. 특히 이전의 취약점이었던 곱셈공식 변형과 치환 인수분해 문제를 모두 완벽하게 해결하며 학습 교정의 긍정적인 성과를 보였습니다.",
      conceptAnalysis: "원의 중심각과 접선 성질이 결합된 기하 각도 문항(21번)과 통계 대푯값 계산(24번)에서 경미한 실수가 발생했습니다. 개념 누수라기보다는 기하학적 도형의 위치 관계 단서 파악과 자료 정렬 시 발생한 단순 연산 실수에 가깝습니다.",
      coachingPrescription: "1단계: 원의 접선과 반지름이 만나는 지점이 '직각(90도)'이 된다는 기본 직교 성질을 도형 위에 반드시 표시하고 시작하도록 가이드하십시오.\n2단계: 자료의 중앙값을 구할 때는 반드시 크기 순서대로 숫자를 다시 나열하여 중복이나 누락이 없는지 시각적으로 체크하도록 피드백하십시오.",
      actionPlan: "1. 기하 문제를 풀 때 '반지름'과 '직각 표시'를 붉은 펜으로 먼저 그리는 훈련하기.\n2. 자료 분석 시 항상 정렬을 수동으로 검증하는 체크리스트 1개 실천하기."
    }
  }
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method === "GET") {
    if (pool) {
      try {
        const dbRes = await pool.query("SELECT * FROM evaluations ORDER BY created_at DESC");
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
        return res.status(200).json(list);
      } catch (err) {
        console.warn("Vercel DB Query Warning:", err);
        return res.status(200).json(inMemoryEvaluations);
      }
    }
    return res.status(200).json(inMemoryEvaluations);
  }

  if (req.method === "POST") {
    const { id, studentName, grade, subject, examType, mentorName, mentorNotes, answers, date, aiResult } = req.body;
    if (pool) {
      try {
        const insertQuery = `
          INSERT INTO evaluations (id, student_name, grade, subject, exam_type, mentor_name, mentor_notes, answers, date, ai_result)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (id) DO UPDATE 
          SET student_name = EXCLUDED.student_name,
              grade = EXCLUDED.grade,
              subject = EXCLUDED.subject,
              exam_type = EXCLUDED.exam_type,
              mentor_name = EXCLUDED.mentor_name,
              mentor_notes = EXCLUDED.mentor_notes,
              answers = EXCLUDED.answers,
              date = EXCLUDED.date,
              ai_result = EXCLUDED.ai_result;
        `;
        await pool.query(insertQuery, [
          id, studentName, grade, subject, examType, mentorName, mentorNotes,
          JSON.stringify(answers), date, aiResult ? JSON.stringify(aiResult) : null
        ]);
        return res.status(201).json({ success: true });
      } catch (err) {
        console.warn("Vercel DB Insert Warning:", err);
      }
    }
    const newEval = { id, studentName, grade, subject, examType, mentorName, mentorNotes, answers, date, aiResult };
    inMemoryEvaluations.unshift(newEval);
    return res.status(201).json({ success: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
