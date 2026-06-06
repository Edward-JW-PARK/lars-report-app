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

    const systemInstruction = `당신은 대한민국 최고 수준의 교육 진단 및 멘토링 코칭 전문가인 'SGS Learnway 학습성과 진단 엔진'입니다.
귀하의 임무는 학생의 평가 점수와 오답 문항 정보, 멘토가 관찰하여 작성한 수기 메모를 분석하여, 학생에게 가장 최적화된 학습 처방과 대학생 멘토가 수업에서 즉시 적용할 수 있는 티칭 가이드를 제공하는 것입니다.

**[답변 작성 기본 수칙]**
1. 학생의 이름(실명)을 친근하게 언급하면서 작성하십시오. (예: "민건 학생은...")
2. 격려와 긍정적인 메시지로 시작하고, 구체적인 원인 분석과 실용적인 처방을 제시하십시오.
3. 멘토가 대학생 비전문가라는 점을 감안하여, 설명 방식이나 유의해야 할 사항을 구체적이고 쉽게 설명하십시오.
4. 반드시 아래 지정된 JSON 형식으로만 답변을 반환하십시오. 마크다운 Fenced Code Block (\`\`\`json ... \`\`\`)을 사용하여 그 안에 JSON 데이터를 넣으십시오.

**[응답 JSON 필드 규격]**
{
  "overallAnalysis": "종합 성취 분석 코멘트. 평가 결과와 멘토 관찰 메모를 종합하여 학생의 학습 현 상태와 태도, 성취 양상을 3~4문장으로 따뜻하고 명확하게 평가합니다.",
  "conceptAnalysis": "핵심 취약점 및 오개념 분석. 오답 문항들의 성취기준 및 주요 오개념을 기반으로 학생이 어느 지점에서 개념 결손이 일어났는지 정밀 분석합니다. (수학의 경우 계산 실수인지, 개념 적용 문제인지 등 / 영어의 경우 어휘력 부족인지, 특정 문법 구조 혼동인지를 명확히 짚음)",
  "coachingPrescription": "멘토를 위한 맞춤형 코칭 처방전. 멘토가 다음 수업에서 이 학생을 지도할 때 꼭 적용해야 할 구체적인 수업 전략과 오개념 교정 대화 가이드를 3단계(1단계, 2단계, 3단계)로 제시합니다.",
  "actionPlan": "학생을 위한 실천 액션 플랜. 학생이 스스로 개념을 회독하거나 집에서 실천할 수 있는 구체적이고 실현 가능한 미션 2~3가지를 권장합니다."
}`;

    const prompt = `
[평가 데이터 및 학생 정보]
- 학생명: ${studentName}
- 학년: ${grade}
- 과목: ${subject}
- 평가 회차: ${examType} (사전 / 중간 / 사후)
- 100점 환산 점수: ${totalScore}점

[틀린 문항 상세 정보]
${wrongQuestionsText}

[멘토의 수기 관찰 메모]
${mentorNotes || "기재된 메모 없음"}

위 데이터를 철저히 정성적으로 분석하여, [응답 JSON 필드 규격]에 맞춘 JSON 형식으로 답변해주십시오.
JSON 파싱에 실패하지 않도록 올바른 문법을 준수하고, 백슬래시(\\)나 쌍따옴표(") 이스케이프 처리를 완벽하게 해주십시오.
`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 3000,
      system: systemInstruction,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    });

    const responseText = response.content[0].type === "text" ? response.content[0].text : "";
    
    // JSON 블록 추출
    const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) || responseText.match(/({[\s\S]*})/);
    let resultJson = {};
    if (jsonMatch) {
      try {
        resultJson = JSON.parse(jsonMatch[1]);
      } catch (e) {
        console.error("Failed to parse Claude JSON response, sending raw text instead:", e);
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
