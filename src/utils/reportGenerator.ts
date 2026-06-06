// src/utils/reportGenerator.ts
import { MATH_BLUEPRINT, ENGLISH_BLUEPRINT, type QuestionMeta } from "../data/blueprintMetadata";

export interface QuestionResult extends QuestionMeta {
  isCorrect: boolean;
}

export interface StatItem {
  name: string;
  correct: number;
  total: number;
  rate: number;
}

export interface ReportStats {
  score: number;
  correctCount: number;
  totalCount: number;
  achievementLevel: "도달" | "부분도달" | "미도달";
  difficultyStats: StatItem[];
  chapterStats: StatItem[];
  domainStats: StatItem[];
  detailedResults: QuestionResult[];
}

// Helper: Classify math behavioral domains based on metadata keywords
export function getMathBehavioralDomain(q: QuestionMeta): "계산력" | "이해력" | "추론력" | "문제 해결력" {
  const dt = q.detail_type || "";
  const it = q.intent || "";

  if (dt.includes("계산") || dt.includes("연산") || dt.includes("풀이") || dt.includes("식 정리") || it.includes("계산") || it.includes("연산")) {
    return "계산력";
  }
  if (dt.includes("이해") || dt.includes("정의") || dt.includes("성질") || dt.includes("대소") || dt.includes("판정") || it.includes("이해") || it.includes("정의") || it.includes("뜻") || it.includes("구별")) {
    return "이해력";
  }
  if (dt.includes("추론") || dt.includes("대칭이동") || dt.includes("각도") || dt.includes("성질 적용") || it.includes("추론") || it.includes("판별") || it.includes("유도") || it.includes("성질")) {
    return "추론력";
  }
  return "문제 해결력"; // Default falls back to problem solving (e.g. 활용, 실생활, 문장제)
}

export function calculateReportStats(
  grade: "middle_1" | "middle_2" | "middle_3",
  subject: "math" | "english",
  answers: { [q_idx: number]: boolean } // true if correct, false if incorrect
): ReportStats {
  const blueprint = subject === "math" ? MATH_BLUEPRINT : ENGLISH_BLUEPRINT;
  const questionsMeta: QuestionMeta[] = blueprint[grade] || [];
  
  const totalCount = questionsMeta.length || 25;
  let correctCount = 0;
  
  const detailedResults: QuestionResult[] = questionsMeta.map((q) => {
    const isCorrect = !!answers[q.q_idx];
    if (isCorrect) correctCount++;
    return { ...q, isCorrect };
  });

  const score = Math.round((correctCount / totalCount) * 100);

  // Determine achievement level
  let achievementLevel: "도달" | "부분도달" | "미도달" = "미도달";
  if (score >= 80) {
    achievementLevel = "도달";
  } else if (score >= 52) {
    achievementLevel = "부분도달";
  }

  // 1. Difficulty Stats
  const diffMap: { [key: string]: { correct: number; total: number } } = {
    "하": { correct: 0, total: 0 },
    "중": { correct: 0, total: 0 },
    "상": { correct: 0, total: 0 }, // group '상' and '최상' together for display
  };

  // 2. Chapter Stats
  const chMap: { [key: string]: { correct: number; total: number } } = {};

  // 3. Domain Stats
  const domainMap: { [key: string]: { correct: number; total: number } } = {};

  detailedResults.forEach((q) => {
    // Difficulty
    let diffKey = q.diff === "최상" ? "상" : q.diff;
    if (diffMap[diffKey]) {
      diffMap[diffKey].total++;
      if (q.isCorrect) diffMap[diffKey].correct++;
    }

    // Chapter
    if (!chMap[q.ch_name]) {
      chMap[q.ch_name] = { correct: 0, total: 0 };
    }
    chMap[q.ch_name].total++;
    if (q.isCorrect) chMap[q.ch_name].correct++;

    // Domain
    let domainName = "";
    if (subject === "math") {
      domainName = getMathBehavioralDomain(q);
    } else {
      domainName = q.ch_name; // For English, domain = 어휘, 문법, 의사소통, 실용문, 독해
    }

    if (!domainMap[domainName]) {
      domainMap[domainName] = { correct: 0, total: 0 };
    }
    domainMap[domainName].total++;
    if (q.isCorrect) domainMap[domainName].correct++;
  });

  const difficultyStats: StatItem[] = Object.keys(diffMap).map((key) => ({
    name: key + " 난이도",
    correct: diffMap[key].correct,
    total: diffMap[key].total,
    rate: diffMap[key].total > 0 ? Math.round((diffMap[key].correct / diffMap[key].total) * 100) : 0,
  }));

  const chapterStats: StatItem[] = Object.keys(chMap).map((key) => ({
    name: key,
    correct: chMap[key].correct,
    total: chMap[key].total,
    rate: chMap[key].total > 0 ? Math.round((chMap[key].correct / chMap[key].total) * 100) : 0,
  }));

  const domainStats: StatItem[] = Object.keys(domainMap).map((key) => ({
    name: key,
    correct: domainMap[key].correct,
    total: domainMap[key].total,
    rate: domainMap[key].total > 0 ? Math.round((domainMap[key].correct / domainMap[key].total) * 100) : 0,
  }));

  return {
    score,
    correctCount,
    totalCount,
    achievementLevel,
    difficultyStats,
    chapterStats,
    domainStats,
    detailedResults,
  };
}
