// src/components/ReportView.tsx
import React from "react";
import { calculateReportStats, getMathBehavioralDomain } from "../utils/reportGenerator";
import { ArrowLeft, Printer, RefreshCw, CheckCircle, AlertTriangle, MessageSquare, BookOpen } from "lucide-react";

interface ClaudeReportData {
  overallAnalysis?: string;
  conceptAnalysis?: string;
  coachingPrescription?: string;
  actionPlan?: string;
  rawText?: string;
}

interface ReportViewProps {
  evaluation: {
    id: string;
    studentName: string;
    grade: "middle_1" | "middle_2" | "middle_3";
    subject: "math" | "english";
    examType: "사전" | "중간" | "사후";
    mentorName: string;
    mentorNotes: string;
    answers: { [q_idx: number]: boolean };
    date: string;
    aiResult?: ClaudeReportData | null;
  };
  onBack: () => void;
  onRegenerateAI: () => Promise<void>;
  isGeneratingAI: boolean;
}

export const ReportView: React.FC<ReportViewProps> = ({
  evaluation,
  onBack,
  onRegenerateAI,
  isGeneratingAI
}) => {
  const stats = calculateReportStats(evaluation.grade, evaluation.subject, evaluation.answers);

  const getGradeLabel = (g: string) => {
    switch (g) {
      case "middle_1": return "중학교 1학년";
      case "middle_2": return "중학교 2학년";
      case "middle_3": return "중학교 3학년";
      default: return g;
    }
  };

  const getSubjectLabel = (s: string) => {
    return s === "math" ? "수학" : "영어";
  };

  const getLevelColorClass = (level: string) => {
    if (level === "도달") return "level-도달";
    if (level === "부분도달") return "level-부분도달";
    return "level-미도달";
  };

  const getLevelDescription = (level: string, sub: string) => {
    if (sub === "math") {
      if (level === "도달") {
        return "해당 단원의 수학개념, 원리, 법칙을 깊이 이해하고 있으며 응용/심화 문제를 안정적으로 해결할 수 있는 단계입니다.";
      } else if (level === "부분도달") {
        return "기본적인 수학 개념은 이해하고 있으나, 복잡한 식의 연산이나 개념 적용형 문제에서 오답이 발생하는 보완 단계입니다.";
      } else {
        return "선수학습 결손이 크거나 기본 공식 및 개념의 이해도가 낮아, 기초 개념 재학습 및 연산 훈련이 시급한 단계입니다.";
      }
    } else {
      if (level === "도달") {
        return "중학 어휘와 어법, 독해의 맥락을 유기적으로 완벽하게 파악하며 논리적 흐름에 따른 고난도 추론까지 가능한 완성형 단계입니다.";
      } else if (level === "부분도달") {
        return "기본 어휘 및 실용문 정보 파악은 양호하지만, 5형식 문법 구조나 추론형 빈칸 어휘 쓰기에서 막힘이 발생하는 발전 단계입니다.";
      } else {
        return "초등 어휘 및 문장 구조의 결손으로 인해 직독직해가 어렵고 기본적인 의사소통 구문도 혼동하는 기초 보충 단계입니다.";
      }
    }
  };

  const handlePrint = () => {
    const originalOverflow = document.body.style.overflow;
    const originalHeight = document.body.style.height;
    
    // 강제 차단 속성을 완전히 해제하여 인쇄 엔진에게 넘김
    document.body.style.overflow = "visible";
    document.body.style.height = "auto";
    
    setTimeout(() => {
      window.print();
      document.body.style.overflow = originalOverflow;
      document.body.style.height = originalHeight;
    }, 100);
  };

  const aiData: ClaudeReportData = evaluation.aiResult || {};
  const hasAIData = !!(aiData && aiData.overallAnalysis && aiData.overallAnalysis.trim());

  return (
    <div className="report-workspace-container">
      {/* Floating control action bar (Hidden on print) */}
      <div className="workspace-actions-floating">
        <button className="btn btn-secondary" onClick={onBack}>
          <ArrowLeft size={16} /> 대시보드로 이동
        </button>
        <button className="btn btn-secondary" onClick={onRegenerateAI} disabled={isGeneratingAI}>
          <RefreshCw size={16} className={isGeneratingAI ? "spinner" : ""} />
          {isGeneratingAI ? "AI 분석 생성 중..." : "AI 코칭 피드백 갱신"}
        </button>
        <button className="btn btn-primary" onClick={handlePrint}>
          <Printer size={16} /> PDF 저장 및 인쇄
        </button>
      </div>

      {/* ============================================================== */}
      {/* A4 PAGE 1: Evaluation Summary, Scores, Sub-Analyses (A4 Size)   */}
      {/* ============================================================== */}
      <div className="report-a4-page">
        {/* Page Header */}
        <div className="report-header">
          <div className="report-title-badge">LEARNWAY SCHOOL ASSESSMENT REPORT</div>
          <div className="report-title">
            Learnway 학습성과 진단 리포트 ({evaluation.examType} 평가)
          </div>
          
          <div className="report-student-meta">
            <div className="meta-box">
              <span className="meta-box-label">학생명</span>
              <span className="meta-box-value">{evaluation.studentName}</span>
            </div>
            <div className="meta-box">
              <span className="meta-box-label">학년 / 과목</span>
              <span className="meta-box-value">{getGradeLabel(evaluation.grade)} / {getSubjectLabel(evaluation.subject)}</span>
            </div>
            <div className="meta-box">
              <span className="meta-box-label">평가일자</span>
              <span className="meta-box-value">{evaluation.date}</span>
            </div>
            <div className="meta-box">
              <span className="meta-box-label">담당 멘토</span>
              <span className="meta-box-value">{evaluation.mentorName || "담당 멘토"}</span>
            </div>
          </div>
        </div>

        {/* Section 1: 종합 성적 대시보드 */}
        <div className="report-section">
          <div className="section-title-container">
            <span className="section-num">1</span>
            <span className="section-title">종합 평가 결과</span>
          </div>
          <div className="score-dashboard-grid">
            <div className="report-panel" style={{ alignItems: "center" }}>
              <div style={{ fontSize: "0.8rem", color: "#666", fontWeight: 600 }}>100점 환산 점수</div>
              <div className="score-main-value">{stats.score}점</div>
              <div className="score-total-count">({stats.correctCount} / {stats.totalCount} 문항 맞춤)</div>
            </div>
            <div className="report-panel" style={{ alignItems: "center" }}>
              <div style={{ fontSize: "0.8rem", color: "#666", fontWeight: 600 }}>나의 성취 수준</div>
              <div className={`achievement-level-box ${getLevelColorClass(stats.achievementLevel)}`}>
                {stats.achievementLevel}
              </div>
            </div>
            <div className="report-panel" style={{ justifyContent: "center" }}>
              <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#333", marginBottom: "0.25rem" }}>성취수준 판정 가이드</div>
              <div style={{ fontSize: "0.75rem", color: "#555", lineHeight: 1.4 }}>
                {getLevelDescription(stats.achievementLevel, evaluation.subject)}
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: 난이도별 / 단원별 세부 분석 */}
        <div className="report-section">
          <div className="section-title-container">
            <span className="section-num">2</span>
            <span className="section-title">난이도 및 단원별 성취도 분석</span>
          </div>
          <div className="domain-unit-grid">
            {/* 난이도별 분석 */}
            <div className="report-panel">
              <h4 style={{ fontSize: "0.85rem", color: "var(--primary-navy)", marginBottom: "0.75rem", borderBottom: "1px solid #eee", paddingBottom: "0.25rem" }}>난이도별 성취도</h4>
              <div className="progress-list">
                {stats.difficultyStats.map((item, idx) => (
                  <div className="progress-row" key={idx}>
                    <div className="progress-label-row">
                      <span>{item.name}</span>
                      <span>{item.correct}/{item.total}문항 ({item.rate}%)</span>
                    </div>
                    <div className="progress-bar-bg">
                      <div className="progress-bar-fill" style={{ width: `${item.rate}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 단원별 분석 */}
            <div className="report-panel">
              <h4 style={{ fontSize: "0.85rem", color: "var(--primary-navy)", marginBottom: "0.75rem", borderBottom: "1px solid #eee", paddingBottom: "0.25rem" }}>단원별 성취도</h4>
              <div className="progress-list">
                {stats.chapterStats.map((item, idx) => (
                  <div className="progress-row" key={idx}>
                    <div className="progress-label-row">
                      <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '140px' }}>{item.name}</span>
                      <span>{item.correct}/{item.total} ({item.rate}%)</span>
                    </div>
                    <div className="progress-bar-bg">
                      <div className="progress-bar-fill gold" style={{ width: `${item.rate}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: 영역별 역량 분석 */}
        <div className="report-section" style={{ marginBottom: "0" }}>
          <div className="section-title-container">
            <span className="section-num">3</span>
            <span className="section-title">{evaluation.subject === "math" ? "수학 행동영역별 분석" : "영어 평가 영역별 분석"}</span>
          </div>
          <div className="report-panel">
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${stats.domainStats.length}, 1fr)`, gap: "1rem" }}>
              {stats.domainStats.map((item, idx) => (
                <div key={idx} style={{ display: "flex", flexDirection: "column", alignItems: "center", border: "1px solid #eef2f6", padding: "0.75rem", borderRadius: "6px", backgroundColor: "#fff" }}>
                  <span style={{ fontSize: "0.8rem", color: "#666", fontWeight: 500, marginBottom: "0.35rem" }}>{item.name}</span>
                  <div style={{ position: "relative", width: "55px", height: "55px", display: "inline-flex", alignItems: "center", borderRadius: "50%", background: `conic-gradient(var(--primary-navy) ${item.rate * 3.6}deg, #eaeff2 0deg)`, justifyContent: "center" }}>
                    <div style={{ position: "absolute", width: "45px", height: "45px", backgroundColor: "white", borderRadius: "50%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--primary-navy)" }}>{item.rate}%</span>
                    </div>
                  </div>
                  <span style={{ fontSize: "0.7rem", color: "#888", marginTop: "0.4rem" }}>{item.correct} / {item.total} 문항</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="report-footer">
          <span>ⓒ Learnway School & SGS입시전략연구소</span>
          <span>Page 1 of 3</span>
        </div>
      </div>

      <div className="page-divider">페이지 경계 (출력 시 다음 페이지로 인쇄됩니다)</div>

      {/* ============================================================== */}
      {/* A4 PAGE 2: Detailed items                                      */}
      {/* ============================================================== */}
      <div className="report-a4-page">
        {/* Header (simplified) */}
        <div className="report-header" style={{ borderBottom: "2px solid var(--primary-navy)", paddingBottom: "0.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <span style={{ fontSize: "0.75rem", color: "#666", fontWeight: 600 }}>LEARNWAY SCHOOL ASSESSMENT REPORT</span>
            <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--primary-navy)" }}>학생명: {evaluation.studentName} | {getSubjectLabel(evaluation.subject)}</span>
          </div>
        </div>

        {/* Section 4: 문항별 상세 분석 (자동 페이지 흐름 허용 구조) */}
        <div className="report-section" style={{ height: "auto", overflow: "visible" }}>
          <div className="section-title-container">
            <span className="section-num">4</span>
            <span className="section-title">문항별 상세 오답 분석</span>
          </div>
          
          <table className="report-table" style={{ tableLayout: "fixed", width: "100%" }}>
            <thead>
              <tr>
                <th style={{ width: "8%" }}>번호</th>
                <th style={{ width: "26%" }}>내용 요소</th>
                <th style={{ width: "14%" }}>영역</th>
                <th style={{ width: "10%" }}>난이도</th>
                <th style={{ width: "10%" }}>정오</th>
                <th style={{ width: "32%" }}>출제 의도 / 주요 오개념</th>
              </tr>
            </thead>
            <tbody>
              {stats.detailedResults.map((q, idx) => (
                <tr key={idx} style={{ pageBreakInside: "avoid", breakInside: "avoid" }}>
                  <td className="center" style={{ fontWeight: 600, padding: "0.5rem 0.2rem" }}>{q.q_idx}</td>
                  <td style={{ padding: "0.5rem", wordBreak: "break-all" }}>{q.detail_type}</td>
                  <td style={{ padding: "0.5rem", wordBreak: "break-all" }}>
                    {evaluation.subject === "math" ? getMathBehavioralDomain(q) : q.ch_name}
                  </td>
                  <td className="center" style={{ padding: "0.5rem 0.2rem" }}>{q.diff}</td>
                  <td className="center" style={{ fontWeight: 800, color: q.isCorrect ? "var(--success-color)" : "var(--danger-color)", padding: "0.5rem 0.2rem" }}>
                    {q.isCorrect ? "O" : "X"}
                  </td>
                  <td style={{ fontSize: "0.72rem", color: "#555", padding: "0.5rem", wordBreak: "break-all" }}>
                    {!q.isCorrect && q.misconception ? (
                      <div style={{ lineHeight: "1.3" }}>
                        <strong>[오개념]</strong> {q.misconception}
                      </div>
                    ) : (
                      <div style={{ lineHeight: "1.3" }}>{q.intent}</div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="report-footer" style={{ marginTop: "20px" }}>
          <span>ⓒ Learnway School & SGS입시전략연구소</span>
          <span>Page 2 of 3</span>
        </div>
      </div>

      <div className="page-divider">페이지 경계 (출력 시 다음 페이지로 인쇄됩니다)</div>

      {/* ============================================================== */}
      {/* A4 PAGE 3: Claude AI prescription & Mentor notes               */}
      {/* ============================================================== */}
      <div className="report-a4-page">
        {/* Header (simplified) */}
        <div className="report-header" style={{ borderBottom: "2px solid var(--primary-navy)", paddingBottom: "0.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <span style={{ fontSize: "0.75rem", color: "#666", fontWeight: 600 }}>LEARNWAY SCHOOL ASSESSMENT REPORT</span>
            <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--primary-navy)" }}>학생명: {evaluation.studentName} | {getSubjectLabel(evaluation.subject)}</span>
          </div>
        </div>

        {/* Section 5: Claude AI 코칭 피드백 및 처방전 */}
        <div className="report-section">
          <div className="section-title-container">
            <span className="section-num">5</span>
            <span className="section-title">Claude AI 맞춤형 학습 처방</span>
          </div>
          
          {isGeneratingAI ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "2rem", border: "1px dashed #ccc", borderRadius: "6px", backgroundColor: "#fafbfc" }}>
              <div className="spinner" style={{ marginBottom: "1rem" }}></div>
              <span style={{ fontSize: "0.85rem", color: "#666" }}>Claude AI가 평가 데이터와 오답 문항을 정밀 심사하고 있습니다...</span>
            </div>
          ) : hasAIData ? (
            <div className="coaching-box-container">
              {/* 종합 분석 */}
              <div className="coaching-card full-width">
                <div className="coaching-card-title">
                  <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                    <CheckCircle size={14} /> 종합 성취 분석 코멘트
                  </div>
                </div>
                <div className="coaching-card-body">{aiData.overallAnalysis}</div>
              </div>

              {/* 오개념 분석 */}
              <div className="coaching-card">
                <div className="coaching-card-title">
                  <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                    <AlertTriangle size={14} /> 취약점 및 오개념 처방
                  </div>
                </div>
                <div className="coaching-card-body">{aiData.conceptAnalysis}</div>
              </div>

              {/* 멘토 코칭 가이드 */}
              <div className="coaching-card">
                <div className="coaching-card-title">
                  <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                    <MessageSquare size={14} /> 멘토 코칭 가이드 (티칭 팁)
                  </div>
                </div>
                <div className="coaching-card-body">{aiData.coachingPrescription}</div>
              </div>

              {/* 학생 액션 플랜 */}
              <div className="coaching-card full-width">
                <div className="coaching-card-title">
                  <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                    <BookOpen size={14} /> 실천 액션 플랜 (학생용 미션)
                  </div>
                </div>
                <div className="coaching-card-body">{aiData.actionPlan}</div>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "3rem 1.5rem", border: "1px dashed #ccc", borderRadius: "6px", backgroundColor: "#fafbfc" }}>
              <span style={{ fontSize: "0.85rem", color: "#666", marginBottom: "0.75rem" }}>아직 AI 피드백이 생성되지 않았습니다.</span>
              <button className="btn btn-primary" onClick={onRegenerateAI}>
                <RefreshCw size={14} /> AI 분석 생성하기
              </button>
            </div>
          )}
        </div>

        {/* Section 6: 멘토 관찰 메모 (Mentor Notes) */}
        {evaluation.mentorNotes && (
          <div className="report-section" style={{ marginBottom: "0" }}>
            <div className="mentor-notes-report-box">
              <div className="mentor-notes-report-box-title">
                ✏️ 담당 멘토 ({evaluation.mentorName || "멘토"})의 관찰 학습 메모
              </div>
              <div className="mentor-notes-report-box-body">
                "{evaluation.mentorNotes}"
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="report-footer" style={{ marginTop: "auto" }}>
          <span>ⓒ Learnway School & SGS입시전략연구소</span>
          <span>Page 3 of 3</span>
        </div>
      </div>
    </div>
  );
};
