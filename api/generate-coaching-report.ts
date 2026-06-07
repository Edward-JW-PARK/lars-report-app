// api/generate-coaching-report.ts
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
    const { studentName, grade, subject, examType, totalScore, wrongQuestions, mentorNotes } = req.body;

    if (!studentName || !grade || !subject) {
      return res.status(400).json({ error: "Missing required fields: studentName, grade, subject" });
    }

    const wrongQuestionsText = wrongQuestions && wrongQuestions.length > 0 
      ? wrongQuestions.map((q: any) => 
          `- 문항 ${q.q_idx}번 (${q.ch_name} 단원, 난이도: ${q.diff}):
            * 성취기준: [${q.std_code}] ${q.std_desc}
            * 출제 의도: ${q.intent}
            * 오답 요인/오개념: ${q.misconception || '개념 이해 부족'}
          `
        ).join("\n")
      : "오답 문항이 없습니다. (100점 만점!)";

    // 지면 오버플로우 방지 및 엄격한 3문장 이내 제한 규칙 주입
    const systemInstruction = `당신은 대한민국 최고 수준의 교육 진단 및 멘토링 코칭 전문가인 'SGS Learnway 학습성과 진단 엔진'입니다.
귀하의 임무는 학생의 평가 결과를 정밀 분석하여 학부모용 고가치 요약을 작성하는 것입니다.

**[작성 핵심 수칙 - 레이아웃 보호를 위해 필수 준수]**
1. 학생의 이름(실명)을 언급하면서 품격 있고 정중한 경어체(~하였습니다, 권장합니다)로 작성하십시오.
2. 장황한 인트로 및 꾸밈말을 완전히 배제하고 즉시 본론으로 진입하십시오.
3. 모든 JSON 텍스트 필드의 분량은 **반드시 3문장 이내 (공백 포함 130자 내외)**로 콤팩트하게 압축하십시오. 분량이 길어지면 A4 인쇄 레이아웃이 파괴되어 화면 밖으로 이탈합니다.
4. 반드시 아래 지정된 JSON 형식으로만 답변을 반환하십시오. Fenced Code Block (\`\`\`json ... \`\`\`) 내에 JSON 데이터를 넣으십시오.

**[응답 JSON 필드 규격]**
{
  "overallAnalysis": "종합 성취 분석 코멘트. 학습 태도와 성취도를 정성적으로 다룬 요약 소견 (정확히 2~3문장)",
  "conceptAnalysis": "핵심 취약점 및 오개념 분석. 오답 문항의 연계 개념 결손을 분석하는 소견 (정확히 2~3문장)",
  "coachingPrescription": "멘토를 위한 맞춤형 코칭 가이드. 수업에서 즉각 적용할 수 있는 단계별 티칭 솔루션 (1단계, 2단계, 3단계로 명확하게 개행 문자 \\n 을 사용하여 구성하며, 총 3문장 이내)",
  "actionPlan": "학생을 위한 핵심 실천 요약 플랜. 일상에서 즉시 실천할 데일리 액션 플랜 2가지 (번호와 함께 개행 문자 \\n 으로 구분하여 간결하게 작성)"
}`;

    const prompt = `
[평가 데이터 및 학생 정보]
- 학생명: ${studentName}
- 학년: ${grade}
- 과목: ${subject}
- 평가 회차: ${examType}
- 100점 환산 점수: ${totalScore}점

[틀린 문항 상세 정보]
${wrongQuestionsText}

[멘토의 수기 관찰 메모]
${mentorNotes || "기재된 메모 없음"}

위 데이터를 철저히 분석하여 [응답 JSON 필드 규격]에 맞춘 고가치 핵심 문장으로 작성해 주십시오.
`;

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
        console.error("JSON 파싱 실패:", e);
        resultJson = { rawText: responseText };
      }
    } else {
      resultJson = { rawText: responseText };
    }

    return res.status(200).json(resultJson);

  } catch (error: any) {
    console.error("API generate-coaching-report error:", error);
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
}
