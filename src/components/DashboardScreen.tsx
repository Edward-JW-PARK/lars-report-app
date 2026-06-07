import React, { useState } from "react";
import { Plus, Eye, Edit2, Trash2, TrendingUp, Award, FileText, Printer, Sparkles } from "lucide-react";
import { calculateReportStats } from "../utils/reportGenerator";

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

interface DashboardScreenProps {
  evaluations: Evaluation[];
  onAddNew: () => void;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => Promise<void> | void;
  isGeneratingAI: boolean;
  onGenerateFinalOutcome?: (
    studentName: string,
    grade: "middle_1" | "middle_2" | "middle_3",
    subject: "math" | "english"
  ) => Promise<void>;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  evaluations,
  onAddNew,
  onView,
  onEdit,
  onDelete,
  isGeneratingAI,
  onGenerateFinalOutcome,
}) => {
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [showFinalReport, setShowFinalReport] = useState(false);

  // 고유 학생 목록 추출
  const students = Array.from(new Set(evaluations.map((e) => e.studentName)));

  // 선택된 학생의 평가 이력을 회차순으로 정렬
  const studentEvals = evaluations
    .filter((e) => e.studentName === selectedStudent)
    .sort((a, b) => {
      const order = { "사전": 1, "중간": 2, "사후": 3 };
      return order[a.examType] - order[b.examType];
    });

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

  // 사전, 중간, 사후 평가 인스턴스 검색
  const preEval = studentEvals.find((e) => e.examType === "사전");
  const midEval = studentEvals.find((e) => e.examType === "중간");
  const postEval = studentEvals.find((e) => e.examType === "사후");

  const preScore = preEval ? calculateReportStats(preEval.grade, preEval.subject, preEval.answers).score : null;
  const midScore = midEval ? calculateReportStats(midEval.grade, midEval.subject, midEval.answers).score : null;
  const postScore = postEval ? calculateReportStats(postEval.grade, postEval.subject, postEval.answers).score : null;

  let growth = 0;
  if (preScore !== null && postScore !== null) {
    growth = postScore - preScore;
  } else if (preScore !== null && midScore !== null) {
    growth = midScore - preScore;
  }

  // AI 최종 리포트 결과 바인딩용 타겟 검색 (사후 -> 중간 -> 사전 순)
  const latestEval = postEval || midEval || preEval;
  
  // 최종 성과분석 마커가 명확히 주입된 데이터만 인정
  const aiReportData = latestEval?.aiResult || {};
  const hasValidOutcomeAI = !!(aiReportData.isOutcomeReport && aiReportData.overallAnalysis && aiReportData.overallAnalysis.trim());

  const handleLaunchOutcomeReport = async () => {
    setShowFinalReport(true);
    if (!hasValidOutcomeAI && onGenerateFinalOutcome && latestEval) {
      try {
        await onGenerateFinalOutcome(latestEval.studentName, latestEval.grade, latestEval.subject);
      } catch (err) {
        console.error("AI 성과보고 생성 에러:", err);
      }
    }
  };

  const handlePrintFinalReport = () => {
    const originalOverflow = document.body.style.overflow;
    const originalHeight = document.body.style.height;
    
    document.body.style.overflow = "visible";
    document.body.style.height = "auto";
    
    setTimeout(() => {
      window.print();
      document.body.style.overflow = originalOverflow;
      document.body.style.height = originalHeight;
    }, 50);
  };

  if (showFinalReport && selectedStudent) {
    return (
      <div className="report-workspace-container" style={{ minHeight: "auto", overflow: "visible", backgroundColor: "#f1f5f9", padding: "2rem 0" }}>
        {/* 우측 상단 플로팅 액션 바 */}
        <div className="workspace-actions-floating" style={{ position: "fixed", top: "20px", right: "20px", zIndex: 1000, display: "flex", gap: "0.5rem" }}>
          <button className="btn btn-secondary" onClick={() => setShowFinalReport(false)} style={{ boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}>
            대시보드로 돌아가기
          </button>
          
          {onGenerateFinalOutcome && latestEval && (
            <button 
              className="btn btn-warning" 
              onClick={() => onGenerateFinalOutcome(latestEval.studentName, latestEval.grade, latestEval.subject)}
              disabled={isGeneratingAI}
              style={{ backgroundColor: "#d97706", borderColor: "#d97706", color: "white", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)", display: "flex", alignItems: "center", gap: "0.3rem" }}
            >
              <Sparkles size={14} /> {isGeneratingAI ? "AI 분석 생성 중..." : "AI 성과 정밀 분석"}
            </button>
          )}

          <button className="btn btn-primary" onClick={handlePrintFinalReport} style={{ backgroundColor: "#1e3a8a", borderColor: "#1e3a8a", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}>
            <Printer size={16} /> 보고서 인쇄 및 PDF 저장
          </button>
        </div>

        {/* ----------------- PAGE 1 (LARS 6.pdf 기준 정량 페이지 완벽 대응) ----------------- */}
        <div className="report-a4-page" style={{ 
          pageBreakAfter: "always", 
          breakAfter: "page", 
          width: "210mm",
          height: "296mm", 
          boxSizing: "border-box", 
          backgroundColor: "#ffffff", 
          boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)",
          padding: "16mm 18mm", 
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between"
        }}>
          <div>
            <div className="report-header" style={{ borderBottom: "4px double #1e3a8a", paddingBottom: "1rem", marginBottom: "1.2rem" }}>
              <div className="report-title-badge" style={{ display: "inline-block", backgroundColor: "#1e3a8a", color: "#ffffff", padding: "0.25rem 0.75rem", fontSize: "0.7rem", fontWeight: "bold", letterSpacing: "1px", borderRadius: "3px", marginBottom: "0.4rem" }}>
                LEARNWAY SCHOOL MENTORING OUTCOME REPORT
              </div>
              <div className="report-title" style={{ fontSize: "1.7rem", fontWeight: 800, color: "#1e3a8a" }}>
                Learnway 멘토링 프로젝트 최종 성과보고서
              </div>
              <div style={{ marginTop: "0.4rem", fontSize: "0.8rem", color: "#4b5563", fontWeight: 500 }}>
                프로젝트 기간 동안 일어난 학생의 학업 성취 변화 및 종합적인 코칭 성과를 요약 보고합니다.
              </div>

              <div className="report-student-meta" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.6rem", marginTop: "1.2rem" }}>
                <div className="meta-box" style={{ border: "1px solid #e5e7eb", borderRadius: "6px", padding: "0.4rem 0.6rem", display: "flex", flexDirection: "column", gap: "0.1rem" }}>
                  <span className="meta-box-label" style={{ fontSize: "0.65rem", color: "#6b7280", fontWeight: "600" }}>학생명</span>
                  <span className="meta-box-value" style={{ fontSize: "0.9rem", fontWeight: "bold", color: "#111827" }}>{selectedStudent}</span>
                </div>
                <div className="meta-box" style={{ border: "1px solid #e5e7eb", borderRadius: "6px", padding: "0.4rem 0.6rem", display: "flex", flexDirection: "column", gap: "0.1rem" }}>
                  <span className="meta-box-label" style={{ fontSize: "0.65rem", color: "#6b7280", fontWeight: "600" }}>과목 / 학년</span>
                  <span className="meta-box-value" style={{ fontSize: "0.9rem", fontWeight: "bold", color: "#111827" }}>
                    {latestEval ? `${getSubjectLabel(latestEval.subject)} / ${getGradeLabel(latestEval.grade)}` : "-"}
                  </span>
                </div>
                <div className="meta-box" style={{ border: "1px solid #e5e7eb", borderRadius: "6px", padding: "0.4rem 0.6rem", display: "flex", flexDirection: "column", gap: "0.1rem" }}>
                  <span className="meta-box-label" style={{ fontSize: "0.65rem", color: "#6b7280", fontWeight: "600" }}>총 평가 횟수</span>
                  <span className="meta-box-value" style={{ fontSize: "0.9rem", fontWeight: "bold", color: "#111827" }}>{studentEvals.length}회 (사전/중간/사후)</span>
                </div>
                <div className="meta-box" style={{ border: "1px solid #e5e7eb", borderRadius: "6px", padding: "0.4rem 0.6rem", display: "flex", flexDirection: "column", gap: "0.1rem" }}>
                  <span className="meta-box-label" style={{ fontSize: "0.65rem", color: "#6b7280", fontWeight: "600" }}>최종 성장도</span>
                  <span className="meta-box-value" style={{ fontSize: "0.9rem", fontWeight: "bold", color: growth >= 0 ? "#22c55e" : "#ef4444" }}>
                    {growth >= 0 ? `+${growth}점` : `${growth}점`}
                  </span>
                </div>
              </div>
            </div>

            {/* Section 1: 성적 향상 흐름 시각화 */}
            <div className="report-section" style={{ breakInside: "avoid", marginBottom: "1.2rem" }}>
              <div className="section-title-container" style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.65rem" }}>
                <span className="section-num" style={{ backgroundColor: "#1e3a8a", color: "#fff", width: "1.3rem", height: "1.3rem", borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "0.75rem" }}>1</span>
                <span className="section-title" style={{ fontSize: "0.9rem", fontWeight: "bold", color: "#1e3a8a" }}>학업 성취 점수 추이 및 성장 곡선</span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "55% 45%", gap: "1.2rem" }}>
                {/* 왼쪽 표 영역 */}
                <table className="report-table" style={{ fontSize: "0.65rem", width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#f8fafc", color: "#1e3a8a" }}>
                      <th style={{ padding: "0.4rem", border: "1px solid #cbd5e1" }}>평가 단계</th>
                      <th style={{ padding: "0.4rem", border: "1px solid #cbd5e1" }}>평가 일자</th>
                      <th style={{ padding: "0.4rem", border: "1px solid #cbd5e1" }}>성취 문항 수</th>
                      <th style={{ padding: "0.4rem", border: "1px solid #cbd5e1" }}>환산 점수</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ padding: "0.4rem", border: "1px solid #cbd5e1", textAlign: "center", fontWeight: "bold" }}>사전 평가 (시작)</td>
                      <td style={{ padding: "0.4rem", border: "1px solid #cbd5e1", textAlign: "center" }}>{preEval?.date || "-"}</td>
                      <td style={{ padding: "0.4rem", border: "1px solid #cbd5e1", textAlign: "center" }}>
                        {preEval ? `${calculateReportStats(preEval.grade, preEval.subject, preEval.answers).correctCount} / ${calculateReportStats(preEval.grade, preEval.subject, preEval.answers).totalCount}` : "-"}
                      </td>
                      <td style={{ padding: "0.4rem", border: "1px solid #cbd5e1", textAlign: "center", fontWeight: "bold" }}>{preScore !== null ? `${preScore}점` : "-"}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: "0.4rem", border: "1px solid #cbd5e1", textAlign: "center", fontWeight: "bold" }}>중간 평가 (과정)</td>
                      <td style={{ padding: "0.4rem", border: "1px solid #cbd5e1", textAlign: "center" }}>{midEval?.date || "-"}</td>
                      <td style={{ padding: "0.4rem", border: "1px solid #cbd5e1", textAlign: "center" }}>
                        {midEval ? `${calculateReportStats(midEval.grade, midEval.subject, midEval.answers).correctCount} / ${calculateReportStats(midEval.grade, midEval.subject, midEval.answers).totalCount}` : "-"}
                      </td>
                      <td style={{ padding: "0.4rem", border: "1px solid #cbd5e1", textAlign: "center", fontWeight: "bold" }}>{midScore !== null ? `${midScore}점` : "-"}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: "0.4rem", border: "1px solid #cbd5e1", textAlign: "center", fontWeight: "bold" }}>사후 평가 (최종)</td>
                      <td style={{ padding: "0.4rem", border: "1px solid #cbd5e1", textAlign: "center" }}>{postEval?.date || "-"}</td>
                      <td style={{ padding: "0.4rem", border: "1px solid #cbd5e1", textAlign: "center" }}>
                        {postEval ? `${calculateReportStats(postEval.grade, postEval.subject, postEval.answers).correctCount} / ${calculateReportStats(postEval.grade, postEval.subject, postEval.answers).totalCount}` : "-"}
                      </td>
                      <td style={{ padding: "0.4rem", border: "1px solid #cbd5e1", textAlign: "center", fontWeight: "bold", color: "#ef4444" }}>{postScore !== null ? `${postScore}점` : "-"}</td>
                    </tr>
                  </tbody>
                </table>

                {/* 오른쪽 그래프 영역 */}
                <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "0.6rem", position: "relative", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <div style={{ fontSize: "0.6rem", color: "#94a3b8", fontWeight: 700, marginBottom: "0.2rem", textAlign: "center" }}>성취도 변화 추적 그래프</div>
                  <svg width="100%" height="70" viewBox="0 0 200 70" style={{ overflow: "visible" }}>
                    <line x1="20" y1="60" x2="180" y2="60" stroke="#e2e8f0" strokeDasharray="2,2" />
                    <line x1="20" y1="35" x2="180" y2="35" stroke="#e2e8f0" strokeDasharray="2,2" />
                    <line x1="20" y1="10" x2="180" y2="10" stroke="#e2e8f0" strokeDasharray="2,2" />

                    {/* 트렌드 선 */}
                    {preScore !== null && (
                      <path
                        d={
                          midScore !== null && postScore !== null
                            ? `M 30 ${60 - preScore * 0.5} L 100 ${60 - midScore * 0.5} L 170 ${60 - postScore * 0.5}`
                            : `M 30 ${60 - preScore * 0.5} L 170 ${60 - (postScore ?? midScore ?? 0) * 0.5}`
                        }
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="1.5"
                      />
                    )}

                    {/* 사전 포인트 */}
                    {preScore !== null && (
                      <g>
                        <circle cx="30" cy={60 - preScore * 0.5} r="2.5" fill="#fff" stroke="#1e3a8a" strokeWidth="1.5" />
                        <text x="30" y={52 - preScore * 0.5} fontSize="5" fill="#333" fontWeight="bold" textAnchor="middle">{preScore}점</text>
                        <text x="30" y="67" fontSize="5" fill="#64748b" textAnchor="middle">사전</text>
                      </g>
                    )}

                    {/* 중간 포인트 */}
                    {midScore !== null && (
                      <g>
                        <circle cx="100" cy={60 - midScore * 0.5} r="2.5" fill="#fff" stroke="#b28a50" strokeWidth="1.5" />
                        <text x="100" y={52 - midScore * 0.5} fontSize="5" fill="#333" fontWeight="bold" textAnchor="middle">{midScore}점</text>
                        <text x="100" y="67" fontSize="5" fill="#64748b" textAnchor="middle">중간</text>
                      </g>
                    )}

                    {/* 사후 포인트 */}
                    {postScore !== null && (
                      <g>
                        <circle cx="170" cy={60 - postScore * 0.5} r="2.5" fill="#fff" stroke="#ef4444" strokeWidth="1.5" />
                        <text x="170" y={52 - postScore * 0.5} fontSize="5" fill="#ef4444" fontWeight="bold" textAnchor="middle">{postScore}점</text>
                        <text x="170" y="67" fontSize="5" fill="#64748b" textAnchor="middle">사후</text>
                      </g>
                    )}
                  </svg>
                </div>
              </div>

              <div className="report-panel" style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "1rem", padding: "0.8rem", borderLeft: "5px solid #b28a50", backgroundColor: "#fafbfc", border: "1px solid #e2e8f0", borderLeftWidth: "5px", marginTop: "1rem" }}>
                <TrendingUp size={24} style={{ color: "#b28a50", flexShrink: 0 }} />
                <div>
                  <h4 style={{ fontSize: "0.8rem", fontWeight: 700, color: "#1e3a8a", marginBottom: "0.1rem" }}>
                    학습 성과 핵심 지표 분석
                  </h4>
                  <p style={{ fontSize: "0.75rem", color: "#4b5563", lineHeight: 1.4, margin: 0 }}>
                    {selectedStudent} 학생은 사전 평가 대비 최종 사후 평가에서 총 <strong>{growth}점의 성과 향상</strong>을 달성해 냈습니다.
                    체계적인 훈련과 반복적인 피드백 구조를 통하여, 오개념 영역의 복원이 가시적으로 수행되었음이 성취 지표 데이터를 통하여 객관적으로 입증됩니다.
                  </p>
                </div>
              </div>
            </div>

            {/* Section 2: 회차별 문항 성적 대조표 */}
            <div className="report-section" style={{ marginBottom: "0", breakInside: "avoid" }}>
              <div className="section-title-container" style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.65rem" }}>
                <span className="section-num" style={{ backgroundColor: "#1e3a8a", color: "#fff", width: "1.3rem", height: "1.3rem", borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "0.75rem" }}>2</span>
                <span className="section-title" style={{ fontSize: "0.9rem", fontWeight: "bold", color: "#1e3a8a" }}>회차별 문항 성적 대조표</span>
              </div>
              
              <table className="report-table" style={{ fontSize: "0.72rem", width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ backgroundColor: "#1e3a8a", color: "#ffffff" }}>
                    <th style={{ width: "20%", padding: "0.5rem", border: "1px solid #cbd5e1" }}>평가 회차</th>
                    <th style={{ width: "15%", padding: "0.5rem", border: "1px solid #cbd5e1" }}>환산 점수</th>
                    <th style={{ width: "20%", padding: "0.5rem", border: "1px solid #cbd5e1" }}>취득 수준</th>
                    <th style={{ width: "15%", padding: "0.5rem", border: "1px solid #cbd5e1" }}>맞은 문항 수</th>
                    <th style={{ padding: "0.5rem", border: "1px solid #cbd5e1" }}>오답 발생 문항 번호</th>
                  </tr>
                </thead>
                <tbody>
                  {studentEvals.map((e, idx) => {
                    const s = calculateReportStats(e.grade, e.subject, e.answers);
                    const wrongNums = s.detailedResults.filter(q => !q.isCorrect).map(q => q.q_idx);
                    return (
                      <tr key={idx} style={{ backgroundColor: idx % 2 === 1 ? "#f8fafc" : "#ffffff" }}>
                        <td className="center" style={{ fontWeight: 700, padding: "0.5rem", border: "1px solid #cbd5e1", textAlign: "center" }}>{e.examType} 평가</td>
                        <td className="center" style={{ fontWeight: 600, padding: "0.5rem", border: "1px solid #cbd5e1", textAlign: "center", color: "#1e3a8a" }}>{s.score}점</td>
                        <td className="center" style={{ padding: "0.5rem", border: "1px solid #cbd5e1", textAlign: "center" }}>
                          <span style={{ padding: "0.15rem 0.4rem", borderRadius: "4px", fontSize: "0.65rem", fontWeight: "bold", backgroundColor: s.achievementLevel === "도달" ? "#d1fae5" : "#fee2e2", color: s.achievementLevel === "도달" ? "#065f46" : "#991b1b" }}>
                            {s.achievementLevel}
                          </span>
                        </td>
                        <td className="center" style={{ padding: "0.5rem", border: "1px solid #cbd5e1", textAlign: "center" }}>{s.correctCount} / {s.totalCount}</td>
                        <td style={{ color: "#ef4444", fontSize: "0.72rem", padding: "0.5rem", border: "1px solid #cbd5e1" }}>
                          {wrongNums.length > 0 ? `${wrongNums.join(", ")}번 문항` : "오답 없음 (완전 학습)"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="report-footer" style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #e2e8f0", paddingTop: "0.4rem", fontSize: "0.65rem", color: "#94a3b8" }}>
            <span>ⓒ Learnway School & SGS입시전략연구소</span>
            <span>Page 1 of 2</span>
          </div>
        </div>

        <div className="page-divider" style={{ textAlign: "center", color: "#94a3b8", fontSize: "0.75rem", margin: "1.5rem 0", borderTop: "2px dashed #cbd5e1", padding: "0.5rem 0" }}>
          페이지 경계 (인쇄 시 이 선을 기준으로 분할 인쇄됩니다)
        </div>

        {/* ----------------- PAGE 2: Claude Sonnet 4.6 정성 분석 및 솔루션 ----------------- */}
        <div className="report-a4-page" style={{ 
          width: "210mm",
          height: "296mm", 
          boxSizing: "border-box", 
          backgroundColor: "#ffffff", 
          boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)",
          padding: "16mm 18mm", 
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between"
        }}>
          <div>
            <div className="report-header" style={{ borderBottom: "2px solid #1e3a8a", paddingBottom: "0.4rem", marginBottom: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                <span style={{ fontSize: "0.65rem", color: "#64748b", fontWeight: 600 }}>LEARNWAY SCHOOL PORTFOLIO REPORT</span>
                <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#1e3a8a" }}>학생명: {selectedStudent} | 최종 성과보고서 의견</span>
              </div>
            </div>

            <div className="report-section" style={{ display: "flex", flexDirection: "column" }}>
              <div className="section-title-container" style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.8rem" }}>
                <span className="section-num" style={{ backgroundColor: "#b28a50", color: "#fff", width: "1.3rem", height: "1.3rem", borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "0.75rem" }}>3</span>
                <span className="section-title" style={{ fontSize: "0.9rem", fontWeight: "bold", color: "#1e3a8a" }}>SGS Learnway 최종 종합 분석 및 멘토 피드백</span>
              </div>
              
              <div className="coaching-box-container" style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                
                {/* 1. 지도 소견 카드 */}
                <div className="coaching-card full-width" style={{ borderLeft: "4px solid #b28a50", backgroundColor: "#fff", border: "1px solid #e2e8f0", borderLeftWidth: "4px", padding: "0.7rem 0.8rem", borderRadius: "6px", breakInside: "avoid" }}>
                  <div className="coaching-card-title" style={{ color: "#b28a50", fontWeight: "bold", fontSize: "0.75rem", marginBottom: "0.25rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                    💡 멘토 종합 지도 소견 및 관찰 변화 (장문 분석)
                  </div>
                  <div className="coaching-card-body" style={{ 
                    fontSize: "0.72rem", 
                    color: "#334155", 
                    lineHeight: 1.4, 
                    wordBreak: "keep-all",
                    whiteSpace: "pre-wrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    display: "-webkit-box",
                    WebkitLineClamp: 7,
                    WebkitBoxOrient: "vertical"
                  }}>
                    {isGeneratingAI ? (
                      <div style={{ color: "#b28a50", fontWeight: "600" }} className="animate-pulse">
                        Claude Sonnet 4.6이 사전/중간/사후 성취도 데이터를 대조 분석하여 상담용 종합 소견을 기술 중입니다... (약 10초 내외 소요)
                      </div>
                    ) : hasValidOutcomeAI ? (
                      aiReportData.overallAnalysis
                    ) : (
                      "사전 분석 데이터를 찾을 수 없습니다. 우측 상단의 [AI 성과 정밀 분석] 버튼을 클릭해 소견서 생성을 활성화해 주십시오."
                    )}
                  </div>
                </div>

                {/* 2. 학습성장 핵심 오개념 교정 역사 */}
                <div className="coaching-card full-width" style={{ borderLeft: "4px solid #10b981", backgroundColor: "#fff", border: "1px solid #e2e8f0", borderLeftWidth: "4px", padding: "0.7rem 0.8rem", borderRadius: "6px", breakInside: "avoid" }}>
                  <div className="coaching-card-title" style={{ color: "#10b981", fontWeight: "bold", fontSize: "0.75rem", marginBottom: "0.25rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                    🎯 학습성장 핵심 오개념 교정 역사
                  </div>
                  <div className="coaching-card-body" style={{ 
                    fontSize: "0.72rem", 
                    color: "#334155", 
                    lineHeight: 1.4, 
                    wordBreak: "keep-all",
                    whiteSpace: "pre-wrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    display: "-webkit-box",
                    WebkitLineClamp: 7,
                    WebkitBoxOrient: "vertical"
                  }}>
                    {isGeneratingAI ? (
                      <div style={{ color: "#10b981", fontWeight: "600" }} className="animate-pulse">
                        누적 정량 통계를 바탕으로 시계열 흐름을 복원하고 있습니다...
                      </div>
                    ) : hasValidOutcomeAI ? (
                      aiReportData.conceptAnalysis
                    ) : (
                      "성과 분석 결과를 기다리고 있습니다. 실시간 생성 처리가 완료되면 이 항목에 피드백이 정교하게 채워집니다."
                    )}
                  </div>
                </div>

                {/* 3. 추천 지도 노하우 및 가정 연계 지도법 */}
                <div className="coaching-card full-width" style={{ borderLeft: "4px solid #3b82f6", backgroundColor: "#fff", border: "1px solid #e2e8f0", borderLeftWidth: "4px", padding: "0.7rem 0.8rem", borderRadius: "6px", breakInside: "avoid" }}>
                  <div className="coaching-card-title" style={{ color: "#3b82f6", fontWeight: "bold", fontSize: "0.75rem", marginBottom: "0.25rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                    ✏ 추천 지도 노하우 및 가정 연계 지도법
                  </div>
                  <div className="coaching-card-body" style={{ 
                    fontSize: "0.72rem", 
                    color: "#334155", 
                    lineHeight: 1.4, 
                    wordBreak: "keep-all",
                    whiteSpace: "pre-wrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    display: "-webkit-box",
                    WebkitLineClamp: 7,
                    WebkitBoxOrient: "vertical"
                  }}>
                    {isGeneratingAI ? (
                      <div style={{ color: "#3b82f6", fontWeight: "600" }} className="animate-pulse">
                        가정과 교실이 연계된 맞춤형 티칭 솔루션을 정식 컴파일하고 있습니다...
                      </div>
                    ) : hasValidOutcomeAI ? (
                      aiReportData.coachingPrescription
                    ) : (
                      "가정 학습 및 연계 피드백 연계 지도 설계 가이드가 준비 중입니다."
                    )}
                  </div>
                </div>

                {/* 4. 실천 액션 플랜 */}
                <div className="coaching-card full-width" style={{ borderLeft: "4px solid #ef4444", backgroundColor: "#fff", border: "1px solid #e2e8f0", borderLeftWidth: "4px", padding: "0.7rem 0.8rem", borderRadius: "6px", breakInside: "avoid" }}>
                  <div className="coaching-card-title" style={{ color: "#ef4444", fontWeight: "bold", fontSize: "0.75rem", marginBottom: "0.25rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                    📋 차기 학기 상급 연계를 위한 핵심 실천 액션 플랜
                  </div>
                  <div className="coaching-card-body" style={{ 
                    fontSize: "0.72rem", 
                    color: "#334155", 
                    lineHeight: 1.4, 
                    wordBreak: "keep-all",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    display: "-webkit-box",
                    WebkitLineClamp: 5,
                    WebkitBoxOrient: "vertical"
                  }}>
                    {isGeneratingAI ? (
                      <div style={{ color: "#ef4444", fontWeight: "600" }} className="animate-pulse">
                        차기 학습 전략 목표 로드맵을 구성하는 중입니다...
                      </div>
                    ) : hasValidOutcomeAI ? (
                      aiReportData.actionPlan.split('\n').map((line: string, lIdx: number) => (
                        <div key={lIdx} style={{ marginBottom: "0.1rem" }}>{line}</div>
                      ))
                    ) : (
                      "지속 발전을 보장하기 위한 액션 플랜 가이드 항목입니다."
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="report-footer" style={{ borderTop: "1px solid #e2e8f0", paddingTop: "0.3rem", fontSize: "0.65rem", color: "#94a3b8", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>ⓒ Learnway School & SGS입시전략연구소</span>
            <span style={{ fontWeight: "bold", color: "#333" }}>최종 종결 성과보고서 | Page 2 of 2</span>
          </div>
        </div>
      </div>
    );
  }

  // ==============================================================
  // 5. 기본 대시보드 리스트 마크업 뷰 (원형 보존)
  // ==============================================================
  return (
    <div className="dashboard-grid">
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1.3rem", color: "var(--accent-gold)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <FileText size={20} /> 학습 진단 평가 리스트
          </h2>
          <button className="btn btn-primary" onClick={onAddNew}>
            <Plus size={16} /> 신규 평가 등록
          </button>
        </div>

        {evaluations.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)", border: "1px dashed var(--border-color)", borderRadius: "8px" }}>
            등록된 학습 진단 평가가 없습니다. <br />
            오른쪽 상단의 [신규 평가 등록] 버튼을 눌러 첫 채점 데이터 입력을 시작하십시오!
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th style={{ whiteSpace: "nowrap" }}>학생 이름</th>
                  <th style={{ whiteSpace: "nowrap" }}>과목</th>
                  <th style={{ whiteSpace: "nowrap" }}>학년</th>
                  <th>
                    <div style={{ whiteSpace: "nowrap" }}>평가</div>
                    <div style={{ whiteSpace: "nowrap" }}>회차</div>
                  </th>
                  <th>
                    <div style={{ whiteSpace: "nowrap" }}>평가</div>
                    <div style={{ whiteSpace: "nowrap" }}>점수</div>
                  </th>
                  <th>
                    <div style={{ whiteSpace: "nowrap" }}>AI</div>
                    <div style={{ whiteSpace: "nowrap" }}>분석</div>
                  </th>
                  <th style={{ whiteSpace: "nowrap" }}>평가 일자</th>
                  <th style={{ textAlign: "right", whiteSpace: "nowrap" }}>작업</th>
                </tr>
              </thead>
              <tbody>
                {evaluations.map((item) => {
                  const stats = calculateReportStats(item.grade, item.subject, item.answers);
                  const hasAI = !!(item.aiResult && item.aiResult.overallAnalysis && item.aiResult.overallAnalysis.trim());
                  return (
                    <tr key={item.id}>
                      <td style={{ fontWeight: 600, color: "white", whiteSpace: "nowrap" }}>{item.studentName}</td>
                      <td>{getSubjectLabel(item.subject)}</td>
                      <td>
                        <div style={{ whiteSpace: "nowrap" }}>중학교</div>
                        <div style={{ whiteSpace: "nowrap" }}>
                          {item.grade === "middle_1" ? "1학년" : item.grade === "middle_2" ? "2학년" : "3학년"}
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${
                          item.examType === "사전" ? "badge-diff-하" : item.examType === "중간" ? "badge-diff-중" : "badge-diff-상"
                        }`} style={{ display: "inline-block", textAlign: "center" }}>
                          <div style={{ whiteSpace: "nowrap" }}>{item.examType}</div>
                          <div style={{ whiteSpace: "nowrap" }}>평가</div>
                        </span>
                      </td>
                      <td style={{ fontWeight: 700, color: "var(--accent-gold)", fontSize: "1.05rem" }}>{stats.score}점</td>
                      <td>
                        {hasAI ? (
                          <span className="badge" style={{ backgroundColor: "rgba(46, 204, 113, 0.15)", color: "#2ecc71", border: "1px solid rgba(46, 204, 113, 0.3)", display: "inline-block", textAlign: "center" }}>
                            <div style={{ whiteSpace: "nowrap" }}>분석</div>
                            <div style={{ whiteSpace: "nowrap" }}>완료</div>
                          </span>
                        ) : (
                          <span className="badge" style={{ backgroundColor: "rgba(231, 76, 60, 0.15)", color: "#e74c3c", border: "1px solid rgba(231, 76, 60, 0.3)", display: "inline-block", textAlign: "center" }}>
                            <div style={{ whiteSpace: "nowrap" }}>미생성</div>
                          </span>
                        )}
                      </td>
                      <td style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>{item.date}</td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "0.4rem" }}>
                          <button
                            className="btn btn-secondary"
                            style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem" }}
                            title="리포트 조회"
                            onClick={() => onView(item.id)}
                          >
                            <Eye size={12} />
                          </button>
                          <button
                            className="btn btn-secondary"
                            style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem" }}
                            title="수정"
                            onClick={() => onEdit(item.id)}
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            className="btn btn-danger"
                            style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem" }}
                            title="삭제"
                            onClick={() => onDelete(item.id)}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <h2 style={{ fontSize: "1.3rem", color: "var(--accent-gold)", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <TrendingUp size={20} /> 사전·중간·사후 변화 리포트
        </h2>
        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1.5rem" }}>
          학생을 선택하여 회차별 학습 성장도와 종합 피드백을 한눈에 조회하고 최종 성과보고서를 발행하세요.
        </p>

        <div className="form-group" style={{ marginBottom: "1.5rem" }}>
          <label>분석할 학생 선택</label>
          <select value={selectedStudent} onChange={(e) => setSelectedStudent(e.target.value)}>
            <option value="">-- 학생 선택 --</option>
            {students.map((name, idx) => (
              <option key={idx} value={name}>{name}</option>
            ))}
          </select>
        </div>

        {selectedStudent ? (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ fontSize: "1rem", color: "white" }}>{selectedStudent} 학생 성취 이력 ({studentEvals.length}개)</h3>
              {studentEvals.length >= 2 && (
                <button 
                  className="btn btn-primary" 
                  style={{ padding: "0.35rem 0.75rem", fontSize: "0.78rem" }} 
                  onClick={handleLaunchOutcomeReport}
                  disabled={isGeneratingAI}
                >
                  <Award size={13} /> {isGeneratingAI ? "AI 분석 중..." : "성과보고서 발행"}
                </button>
              )}
            </div>

            <div className="trend-card-list">
              {studentEvals.map((e, idx) => {
                const s = calculateReportStats(e.grade, e.subject, e.answers);
                return (
                  <div key={idx} className="trend-card-item">
                    <div className="trend-item-left">
                      <span style={{ fontSize: "0.8rem", color: "var(--accent-gold)", fontWeight: 600 }}>{e.examType} 평가</span>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{e.date} | {getSubjectLabel(e.subject)}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                      <span className="badge badge-chapter" style={{ fontSize: "0.7rem" }}>{s.achievementLevel}</span>
                      <span className="trend-item-score">{s.score}점</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {studentEvals.length >= 2 ? (
              <div style={{ marginTop: "1.5rem", padding: "1rem", borderRadius: "8px", backgroundColor: "rgba(197, 168, 128, 0.1)", border: "1px solid rgba(197, 168, 128, 0.2)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--accent-gold)", fontWeight: 700, fontSize: "0.95rem", marginBottom: "0.3rem" }}>
                  <TrendingUp size={16} /> 멘토링 학습성장 실적
                </div>
                <div style={{ fontSize: "0.85rem", color: "var(--text-light)" }}>
                  사전 성적 <strong>{preScore}점</strong>에서 사후/중간 성적 <strong>{postScore !== null ? postScore : midScore}점</strong>으로 <br />
                  총 <strong style={{ color: "var(--success-color)", fontSize: "1.1rem" }}>+{growth}점</strong> 성장하였습니다!
                </div>
              </div>
            ) : (
              <div style={{ marginTop: "1.5rem", fontSize: "0.8rem", color: "var(--text-muted)", textAlign: "center", padding: "1rem", border: "1px dashed rgba(255,255,255,0.05)", borderRadius: "8px" }}>
                성과보고서를 발행하려면 최소 2개 회차(예: 사전 및 사후) 이상의 평가 정보가 등록되어야 합니다.
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "3rem 1rem", border: "1px dashed rgba(255, 255, 255, 0.05)", borderRadius: "8px", color: "var(--text-muted)", textAlign: "center", fontSize: "0.85rem" }}>
            학생을 선택하시면 회차별 점수 변화 그래프와 성장도를 추적할 수 있습니다.
          </div>
        )}
      </div>
    </div>
  );
};
