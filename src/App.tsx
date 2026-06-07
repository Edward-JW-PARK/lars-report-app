// src/App.tsx
import React, { useState, useEffect } from "react";
import { DashboardScreen } from "./components/DashboardScreen";
import { InputScreen } from "./components/InputScreen";
import { ReportView } from "./components/ReportView";
import { OutcomeReportView } from "./components/OutcomeReportView"; // 신설할 최종 성과보고서 전용 컴포넌트
import { BookOpen, Sparkles } from "lucide-react";
import { MATH_BLUEPRINT, ENGLISH_BLUEPRINT } from "./data/blueprintMetadata";
import { calculateReportStats } from "./utils/reportGenerator";


export interface Evaluation {
  id: string;
  studentName: string;
  grade: "middle_1" | "middle_2" | "middle_3";
  subject: "math" | "english";
  examType: "사전" | "중간" | "사후";
  mentorName: string;
  mentorNotes: string;
  answers: { [q_idx: number]: boolean };
  date: string;
  aiResult?: any;
}

export const INITIAL_EVALUATIONS: Evaluation[] = [
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
      overallAnalysis: "박민건 학생은 제곱근과 실수의 대소 비교, 지수법칙의 기초 연산 등 기본 영역에서 뛰어난 직관과 높은 성취(88점)를 나타내고 있습니다.",
      conceptAnalysis: "곱셈 공식의 변형식 적용 및 복잡한 식의 치환형 인수분해에서 개념 오답이 관찰됩니다.",
      coachingPrescription: "[1단계] 대칭적 공식을 유도하게 지도하십시오.\n[2단계] 항의 식은 다른 문자로 치환하게 하십시오.",
      actionPlan: "1. 완전제곱식 유도 설명해보기.\n2. 식 설계 꼼꼼히 적기."
    }
  },
  {
    id: "eval-mingun-mid",
    studentName: "박민건",
    grade: "middle_3",
    subject: "math",
    examType: "중간",
    mentorName: "박하늘 코치",
    mentorNotes: "곱셈공식과 인수분해 영역을 보충 학습한 후 치른 시험. 식을 치환해서 푸는 형태에 자신감을 얻었으나 연립방정식 활용 실생활 문제에서 식이 다소 흔들림.",
    date: "2026.05.20",
    answers: {
      1: true, 2: true, 3: true, 4: true, 5: true, 6: true, 7: true, 8: true, 9: true, 10: true,
      11: true, 12: true, 13: true, 14: true, 15: true, 16: true, 17: true, 18: true, 19: true, 20: true,
      21: false, 22: true, 23: true, 24: false, 25: true
    },
    aiResult: {
      overallAnalysis: "박민건 학생은 중간 평가에서 92점을 기록하며 직전 사전 평가 대비 눈에 띄게 향상되었습니다.",
      conceptAnalysis: "원의 중심각과 접선 성질이 결합된 기하 각도 문항과 통계 대푯값 계산에서 경미한 실수가 발생했습니다.",
      coachingPrescription: "[1단계] 직각 성질을 도형 위에 반드시 표시하게 지도하십시오.\n[2단계] 크기 순서대로 숫자를 다시 나열하여 중복이 없게 하십시오.",
      actionPlan: "1. 원의 반지름과 직각 표시 먼저 그리기.\n2. 정렬 체크리스트 실천하기."
    }
  }
];

export const App: React.FC = () => {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  
  // "outcome" 스크린 분기 추가 (최종 성과 보고서 전용 화면)
  const [currentScreen, setCurrentScreen] = useState<"list" | "input" | "report" | "outcome">("list");
  const [selectedEvalId, setSelectedEvalId] = useState<string | null>(null);
  const [editingEvalId, setEditingEvalId] = useState<string | null>(null);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  // 최종 성과보고서 전용 분석 상태값 저장소
  const [finalOutcomeResult, setFinalOutcomeResult] = useState<any | null>(null);
  const [selectedStudentMeta, setSelectedStudentMeta] = useState<{name: string, grade: string, subject: string} | null>(null);

  // 로컬 DB 실시간 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch("/api/evaluations");
        if (response.ok) {
          const data = await response.json();
          setEvaluations(data);
        }
      } catch (err) {
        console.error("❌ DB 데이터 조회 실패:", err);
      }
    };
    loadData();
  }, []);

  const activeEvaluation = evaluations.find((e) => e.id === selectedEvalId);
  const editingEvaluation = evaluations.find((e) => e.id === editingEvalId);

  // 개별 평가용 코칭 리포트 생성 함수 (2~3초 간결형)
  const generateAIReportForEval = async (targetEval: Evaluation) => {
    if (!targetEval) return;

    const blueprint = targetEval.subject === "math" ? MATH_BLUEPRINT : ENGLISH_BLUEPRINT;
    const questionsMeta = blueprint[targetEval.grade] || [];

    const wrongQuestions = questionsMeta
      .filter((q: any) => !targetEval.answers[q.q_idx])
      .map((q: any) => ({
        q_idx: q.q_idx,
        ch_name: q.ch_name,
        diff: q.diff,
        std_code: q.std_code,
        std_desc: q.std_desc,
        intent: q.intent,
        misconception: q.misconception
      }));

    const correctCount = questionsMeta.filter((q: any) => targetEval.answers[q.q_idx]).length;
    const totalScore = Math.round((correctCount / questionsMeta.length) * 100);

    setIsGeneratingAI(true);

    try {
      const response = await fetch("/api/generate-coaching-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentName: targetEval.studentName,
          grade: targetEval.grade,
          subject: targetEval.subject,
          examType: targetEval.examType,
          totalScore,
          wrongQuestions,
          mentorNotes: targetEval.mentorNotes
        }),
      });

      if (!response.ok) {
        throw new Error("AI 진단 처방 도중 에러가 발생했습니다.");
      }

      const aiData = await response.json();
      const updatedEval = { ...targetEval, aiResult: aiData };

      await fetch(`/api/evaluations/${targetEval.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedEval),
      });

      setEvaluations((prev) =>
        prev.map((e) => e.id === targetEval.id ? updatedEval : e)
      );
    } catch (e: any) {
      console.error(e);
      alert(`Claude AI 자동 분석 에러: ${e.message || e}`);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // ★ [해결 완료] 버튼 클릭 시 과거 캐시를 완전히 무시하고 실시간 AI 신규 분석을 "강제" 실행하는 올바른 코드
  const handleGenerateFinalOutcome = async (
    studentName: string, 
    grade: "middle_1" | "middle_2" | "middle_3", 
    subject: "math" | "english"
  ) => {
    // 1. 해당 학생의 모든 평가 데이터를 사전 -> 중간 -> 사후 순으로 정렬 수집
    const studentEvals = evaluations
      .filter(e => e.studentName === studentName && e.grade === grade && e.subject === subject)
      .sort((a, b) => {
        const order = { "사전": 1, "중간": 2, "사후": 3 };
        return order[a.examType] - order[b.examType];
      });

    if (studentEvals.length === 0) {
      alert("평가 기록이 없습니다.");
      return;
    }

    setSelectedStudentMeta({ name: studentName, grade, subject });
    
    // =======================================================
    // [해결 조치] 버그를 일으키던 latestEvalWithOutcomeAi 가드(return) 블록을 완전히 제거했습니다!
    // 이제 이 버튼을 누르면 언제나 서버 API를 직접 호출해 Claude Sonnet 4.6이 새로 분석합니다.
    // =======================================================

    setIsGeneratingAI(true);

    try {
      // 2. 백엔드에 3개 회차의 정량 누적 데이터와 멘토 코칭 메모를 담아 전송
      const response = await fetch("/api/generate-outcome-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentName,
          grade,
          subject,
          isOutcomeReport: true, // 시계열 종합 보고 마커 삽입
          evaluations: studentEvals.map(e => {
            const stats = calculateReportStats(e.grade, e.subject, e.answers);
            return {
              examType: e.examType,
              score: stats.score,
              wrongQuestions: stats.detailedResults.filter((q: any) => !q.isCorrect).map((q: any) => ({
                q_idx: q.q_idx,
                ch_name: q.ch_name,
                diff: q.diff,
                std_desc: q.std_desc,
                intent: q.intent,
                misconception: q.misconception
              })),
              mentorNotes: e.mentorNotes || "기록된 멘토 관찰 피드백이 없습니다.",
              date: e.date
            };
          })
        }),
      });

      if (!response.ok) {
        throw new Error("종합 최종 성과분석 AI 엔진 호출에 실패했습니다.");
      }

      const finalOutcomeData = await response.json();
      
      // 결과 객체에 최종 성과 마커 강제 주입
      const enrichedOutcomeData = {
        ...finalOutcomeData,
        isOutcomeReport: true
      };

      setFinalOutcomeResult(enrichedOutcomeData);

      // 3. 분석 보고서 결과를 사후(혹은 가장 최신) 평가의 DB 필드에 업데이트하여 영구 보존
      const latestEval = studentEvals[studentEvals.length - 1];
      const updatedEval = { ...latestEval, aiResult: enrichedOutcomeData };

      await fetch(`/api/evaluations/${latestEval.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedEval),
      });

      setEvaluations((prev) =>
        prev.map((e) => e.id === latestEval.id ? updatedEval : e)
      );

      setCurrentScreen("outcome");
    } catch (e: any) {
      console.error(e);
      alert(`종합 성과 분석보고서 발행 오류: ${e.message || e}`);
    } finally {
      setIsGeneratingAI(false);
    }
  };




  const handleSaveEvaluation = async (data: {
    studentName: string;
    grade: "middle_1" | "middle_2" | "middle_3";
    subject: "math" | "english";
    examType: "사전" | "중간" | "사후";
    mentorName: string;
    mentorNotes: string;
    answers: { [q_idx: number]: boolean };
  }) => {
    let targetEval: Evaluation;

    if (editingEvalId) {
      const editingEval = evaluations.find((e) => e.id === editingEvalId);
      const isDataChanged = !(
        editingEval &&
        editingEval.studentName === data.studentName &&
        editingEval.subject === data.subject &&
        editingEval.grade === data.grade &&
        JSON.stringify(editingEval.answers) === JSON.stringify(data.answers) &&
        editingEval.mentorNotes === data.mentorNotes
      );

      targetEval = {
        ...editingEval!,
        ...data,
        aiResult: isDataChanged ? null : editingEval!.aiResult
      };

      try {
        const res = await fetch(`/api/evaluations/${editingEvalId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(targetEval),
        });

        if (!res.ok) throw new Error("DB 수정 요청에 실패했습니다.");

        setEvaluations((prev) =>
          prev.map((e) => (e.id === editingEvalId ? targetEval : e))
        );
        setSelectedEvalId(editingEvalId);
        setEditingEvalId(null);
        setCurrentScreen("report");

        if (isDataChanged) {
          await generateAIReportForEval(targetEval);
        }
      } catch (err: any) {
        console.error(err);
        alert(`저장 중 오류 발생: ${err.message}`);
      }
    } else {
      const newId = `eval-${Date.now()}`;
      targetEval = {
        id: newId,
        ...data,
        date: new Date().toLocaleDateString("ko-KR"),
        aiResult: null
      };

      try {
        const res = await fetch("/api/evaluations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(targetEval),
        });

        if (!res.ok) throw new Error("DB 신규 저장 요청에 실패했습니다.");

        setEvaluations((prev) => [targetEval, ...prev]);
        setSelectedEvalId(newId);
        setCurrentScreen("report");
        
        await generateAIReportForEval(targetEval);
      } catch (err: any) {
        console.error(err);
        alert(`저장 중 오류 발생: ${err.message}`);
      }
    }
  };

  const handleViewReport = (id: string) => {
    setSelectedEvalId(id);
    setCurrentScreen("report");
  };

  const handleEditEvaluation = (id: string) => {
    setEditingEvalId(id);
    setCurrentScreen("input");
  };

  const handleDeleteEvaluation = async (id: string) => {
    if (window.confirm("정말로 이 평가 채점 기록을 삭제하시겠습니까?")) {
      try {
        const res = await fetch(`/api/evaluations/${id}`, {
          method: "DELETE"
        });
        if (!res.ok) throw new Error("DB 삭제 요청에 실패했습니다.");

        setEvaluations((prev) => prev.filter((e) => e.id !== id));
        if (selectedEvalId === id) setSelectedEvalId(null);
      } catch (err: any) {
        console.error(err);
        alert(`삭제 중 오류 발생: ${err.message}`);
      }
    }
  };

  const handleGenerateAIReport = async () => {
    if (activeEvaluation) {
      await generateAIReportForEval(activeEvaluation);
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="logo-group">
          <BookOpen size={32} style={{ color: "var(--accent-gold)" }} />
          <div>
            <div className="logo-title">Learnway LARS</div>
            <div className="logo-subtitle">학습성과 진단 리포트 시스템</div>
          </div>
        </div>
        
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", color: "var(--accent-gold)" }}>
          <Sparkles size={14} /> Claude 3.5 Sonnet 연동 중
        </div>
      </header>

      <main>
        {currentScreen === "list" && (
          <DashboardScreen
            evaluations={evaluations}
            onAddNew={() => {
              setEditingEvalId(null);
              setCurrentScreen("input");
            }}
            onView={handleViewReport}
            onEdit={handleEditEvaluation}
            onDelete={handleDeleteEvaluation}
            // ★ 우측 사이드바의 "성과보고서 발행" 클릭 시 트리거할 프롭스 연동
            onGenerateFinalOutcome={handleGenerateFinalOutcome} 
            isGeneratingAI={isGeneratingAI}
          />
        )}

        {currentScreen === "input" && (
          <InputScreen
            onSave={handleSaveEvaluation}
            onBack={() => {
              setEditingEvalId(null);
              setCurrentScreen("list");
            }}
            initialData={editingEvaluation}
          />
        )}

        {currentScreen === "report" && activeEvaluation && (
          <ReportView
            evaluation={activeEvaluation}
            onBack={() => {
              setSelectedEvalId(null);
              setCurrentScreen("list");
            }}
            onRegenerateAI={handleGenerateAIReport}
            isGeneratingAI={isGeneratingAI}
          />
        )}

        {/* ★ [신설 스크린] 성과보고서 발행 클릭 시 렌더링될 전용 성과 분석 뷰 */}
        {currentScreen === "outcome" && selectedStudentMeta && (
          <OutcomeReportView
            studentName={selectedStudentMeta.name}
            grade={selectedStudentMeta.grade as any}
            subject={selectedStudentMeta.subject as any}
            evaluations={evaluations.filter(e => e.studentName === selectedStudentMeta.name && e.grade === selectedStudentMeta.grade && e.subject === selectedStudentMeta.subject)}
            aiResult={finalOutcomeResult}
            onBack={() => {
              setFinalOutcomeResult(null);
              setSelectedStudentMeta(null);
              setCurrentScreen("list");
            }}
          />
        )}
      </main>
    </div>
  );
};

export default App;
