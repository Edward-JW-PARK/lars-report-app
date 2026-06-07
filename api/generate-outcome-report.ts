// api/generate-outcome-report.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS Headers
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

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { studentName, grade, subject, evaluations } = req.body;

    if (!studentName || !evaluations || evaluations.length === 0) {
      return res.status(400).json({ error: "Missing required outcome parameters." });
    }

    const serializedEvals = evaluations.map((ev: any, idx: number) => {
      let wrongs = "없음";
      if (ev.wrongQuestions && ev.wrongQuestions.length > 0) {
        wrongs = ev.wrongQuestions.map((q: any) => `${q.q_idx}번(${q.ch_name})`).join(', ');
      }
      return `[${ev.examType} 평가] 점수: ${ev.score}점 | 오답: ${wrongs} | 메모: ${ev.mentorNotes}`;
    }).join('\n');

    const gradeLabel = grade === 'middle_1' ? '중학교 1학년' : grade === 'middle_2' ? '중학교 2학년' : '중학교 3학년';
    const subjectLabel = subject === 'math' ? '수학' : '영어';

    // 최종 2페이지 인쇄 여백 방어를 위한 단정형 3문장 한계 프롬프트 가동
    const systemInstruction = `당신은 대한민국 최고 권위의 교육 성과 진단 기관인 'SGS Learnway 교육사업단'의 수석 교수이자 학업 컨설턴트입니다.
학생의 누적 성취도 추이를 분석하여 품격 높은 종합 성과 의견을 기술하십시오.

**[지면 초과 방지 절대 수칙]**
1. 학부모 상담용 고품격 경어체(~하였습니다, 권장합니다)를 사용하여 정성껏 기술하십시오.
2. 모든 JSON 응답 필드의 서술형 문장은 **반드시 3문장 이내 (공백 포함 130자 내외)**의 고밀도 요약문으로 제한하십시오. 본문이 길어지면 A4 경계를 벗어납니다.
3. 사전 점수(${evaluations[0]?.score || 60}점)에서 사후 성적(${evaluations[evaluations.length - 1]?.score || 76}점)으로 변화한 향상 결과를 반드시 연계하십시오.

**[응답 JSON 필드 규격]**
{
  "overallAnalysis": "사전 단계부터 최종 사후 단계까지 일어난 학생의 정성적인 인지 변화와 학습 습관, 수업 태도에 대한 총체적 멘토 소견 (정확히 2~3문장)",
  "conceptAnalysis": "초반 취약 오개념들이 단계별 처방 교정을 받으면서 실질적으로 정답으로 수렴하게 된 흐름 추적 분석 (정확히 2~3문장)",
  "coachingPrescription": "지도 효과가 가장 컸던 교수 기법 및 가정에서 부모님이 보조해주셔야 할 맞춤형 연계 독려 솔루션 (정확히 2~3문장)",
  "actionPlan": "차기 학기 우수 성취 고착화와 심화 정복을 위해 일상에서 실천해야 하는 명확한 데일리 미션 3가지 (각각 짧은 한 문장으로 번호와 함께 개행 문자 \\n 으로만 분할 작성)"
}`;

    const prompt = `[3대 평가 통합 시계열 데이터]
- 학생명: ${studentName}
- 과정명: ${gradeLabel} ${subjectLabel}
- 3단계 종합 학업 이력:
${serializedEvals}`;

    // 2026년 공식 API 식별자명인 Claude Sonnet 4.6로 완전 교정
    const response = await anthropic.messages.create({
      model: "Claude Sonnet 4.6",
      max_tokens: 2000,
      system: systemInstruction,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
    });

    const responseText = response.content[0].type === "text" ? response.content[0].text : "";
    
    const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) || responseText.match(/({[\s\S]*})/);
    let resultJson = {};
    if (jsonMatch) {
      try {
        resultJson = JSON.parse(jsonMatch[1]);
      } catch (e) {
        console.error("JSON 파싱 에러:", e);
        resultJson = { rawText: responseText };
      }
    } else {
      resultJson = { rawText: responseText };
    }

    return res.status(200).json(resultJson);

  } catch (error: any) {
    console.error("API generate-outcome-report error:", error);
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
}
