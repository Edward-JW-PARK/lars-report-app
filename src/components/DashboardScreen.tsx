import React, { useState } from "react";
import { Plus, Eye, Edit2, Trash2, TrendingUp, Award, FileText, Printer, Sparkles } from "lucide-react";
import { calculateReportStats } from "../utils/reportGenerator";

// ==========================================
// 1. TYPE DEFINITIONS & INTERFACES (원본 100% 동일 유지)
// ==========================================
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

// ==========================================
// 2. MAIN COMPONENT
// ==========================================
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

  // 외부 유틸리티 기반의 점수 계산 처리
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

  // ==========================================
  // 3. 성과 보고서 상세 & 프린트 뷰 (LARS 6.pdf 완벽 미러링)
  // ==========================================
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

        {/* ----------------- PAGE 1: 정량 분석 & 성취 트렌드 페이지 (LARS 6.pdf Page 1 완벽 미러링) ----------------- */}
        <div className="report-a4-page" style={{ 
          pageBreakAfter: "always", 
          breakAfter: "page", 
          width: "210mm",
          height: "296mm", 
          boxSizing: "border-box", 
          backgroundColor: "#ffffff", 
          boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)",
          padding: "18mm 18mm", 
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          fontFamily: "inherit"
        }}>
          <div>
            {/* 헤더 타이틀 */}
            <div className="report-header" style={{ borderBottom: "3px solid #1e3a8a", paddingBottom: "0.8rem", marginBottom: "1rem" }}>
              <div style={{ fontSize: "0.65rem", color: "#1e3a8a", fontWeight: "bold", letterSpacing: "1px", marginBottom: "0.2rem" }}>
                LEARNWAY SCHOOL MENTORING OUTCOME REPORT
              </div>
              <div className="report-title" style={{ fontSize: "1.6rem", fontWeight: 800, color: "#1e3a8a", lineHeight: 1.2 }}>
                Learnway 멘토링 프로젝트 최종 성과보고서
              </div>
              <div style={{ marginTop: "0.3rem", fontSize: "0.75rem", color: "#4b5563", fontWeight: 500 }}>
                프로젝트 기간 동안 일어난 학생의 학업 성취 변화 및 종합적인 코칭 성과를 요약 보고합니다.
              </div>
            </div>

            {/* 인적사항 메타 그리드 (4단 수평 배치) */}
            <div className="report-student-meta" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.8rem", marginBottom: "1.2rem" }}>
              <div className="meta-box" style={{ border: "1px solid #e5e7eb", borderRadius: "5px", padding: "0.5rem", display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: "0.65rem", color: "#6b7280", fontWeight: "bold", marginBottom: "0.15rem" }}>학생명</span>
                <span style={{ fontSize: "0.85rem", fontWeight: "bold", color: "#111827" }}>{selectedStudent}</span>
              </div>
              <div className="meta-box" style={{ border: "1px solid #e5e7eb", borderRadius: "5px", padding: "0.5rem", display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: "0.65rem", color: "#6b7280", fontWeight: "bold", marginBottom: "0.15rem" }}>과목 / 학년</span>
                <span style={{ fontSize: "0.85rem", fontWeight: "bold", color: "#111827" }}>
                  {latestEval ? `${getSubjectLabel(latestEval.subject)} / ${getGradeLabel(latestEval.grade)}` : "-"}
                </span>
              </div>
              <div className="meta-box" style={{ border: "1px solid #e5e7eb", borderRadius: "5px", padding: "0.5rem", display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: "0.65rem", color: "#6b7280", fontWeight: "bold", marginBottom: "0.15rem" }}>총 평가 횟수</span>
                <span style={{ fontSize: "0.85rem", fontWeight: "bold", color: "#111827" }}>{studentEvals.length}회 (사전/중간/사후)</span>
              </div>
              <div className="meta-box" style={{ border: "1px solid #e5e7eb", borderRadius: "5px", padding: "0.5rem", display: "flex", flexDirection: "column", backgroundColor: "#f0fdf4" }}>
                <span style={{ fontSize: "0.65rem", color: "#16a34a", fontWeight: "bold", marginBottom: "0.15rem" }}>최종 성장도</span>
                <span style={{ fontSize: "0.85rem", fontWeight: "black", color: "#15803d" }}>
                  {growth >= 0 ? `+${growth}점` : `${growth}점`}
                </span>
              </div>
            </div>

            {/* 1. 학업 성취 점수 추이 및 성장 곡선 */}
            <div className="report-section" style={{ marginBottom: "1.2rem" }}>
              <div className="section-title-container" style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.6rem" }}>
                <span style={{ backgroundColor: "#1e3a8a", color: "#fff", width: "1.1rem", height: "1.1rem", borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "0.7rem" }}>1</span>
                <span style={{ fontSize: "0.85rem", fontWeight: "bold", color: "#1e3a8a" }}>학업 성취 점수 추이 및 성장 곡선</span>
              </div>

              {/* 평가 3단계 병렬 요약 카드 (LARS 6.pdf 원본 미러링) */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.8rem", marginBottom: "1rem" }}>
                <div style={{ border: "1px solid #e2e8f0", borderRadius: "6px", padding: "0.6rem", textAlign: "center" }}>
                  <div style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: "bold", marginBottom: "0.2rem" }}>사전 평가</div>
                  <div style={{ fontSize: "1.1rem", fontWeight: "black", color: "#1e293b" }}>{preScore !== null ? `${preScore}점` : "-"}</div>
                  <div style={{ fontSize: "0.6rem", color: "#94a3b8", marginTop: "0.15rem" }}>{preEval?.date || "2026. 6. 7."}</div>
                </div>
                <div style={{ border: "1px solid #e2e8f0", borderRadius: "6px", padding: "0.6rem", textAlign: "center" }}>
                  <div style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: "bold", marginBottom: "0.2rem" }}>중간 평가</div>
                  <div style={{ fontSize: "1.1rem", fontWeight: "black", color: "#1e293b" }}>{midScore !== null ? `${midScore}점` : "-"}</div>
                  <div style={{ fontSize: "0.6rem", color: "#94a3b8", marginTop: "0.15rem" }}>{midEval?.date || "2026. 6. 7."}</div>
                </div>
                <div style={{ border: "1px solid #e2e8f0", borderRadius: "6px", padding: "0.6rem", textAlign: "center", backgroundColor: "#fef2f2", borderColor: "#fecaca" }}>
                  <div style={{ fontSize: "0.7rem", color: "#ef4444", fontWeight: "bold", marginBottom: "0.2rem" }}>사후 평가</div>
                  <div style={{ fontSize: "1.1rem", fontWeight: "black", color: "#b91c1c" }}>{postScore !== null ? `${postScore}점` : "-"}</div>
                  <div style={{ fontSize: "0.6rem", color: "#ef4444", marginTop: "0.15rem" }}>{postEval?.date || "2026. 6. 7."}</div>
                </div>
              </div>

              {/* 성장 지표 트렌드 (Trend Graph) SVG */}
              <div style={{ border: "1px solid #e2e8f0", borderRadius: "6px", padding: "0.8rem", backgroundColor: "#f8fafc" }}>
                <div style={{ fontSize: "0.7rem", color: "#334155", fontWeight: "bold", marginBottom: "0.4rem", textAlign: "center" }}>성장 지표 트렌드 (Trend Graph)</div>
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100px" }}>
                  <svg width="100%" height="90" viewBox="0 0 300 90" style={{ overflow: "visible" }}>
                    {/* 가로 보조선 및 눈금값 */}
                    <line x1="30" y1="10" x2="270" y2="10" stroke="#e2e8f0" strokeWidth="1" />
                    <text x="22" y="13" fontSize="6.5" fill="#94a3b8" textAnchor="end">100</text>

                    <line x1="30" y1="50" x2="270" y2="50" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="3,3" />
                    <text x="22" y="53" fontSize="6.5" fill="#94a3b8" textAnchor="end">50</text>

                    <line x1="30" y1="80" x2="270" y2="80" stroke="#cbd5e1" strokeWidth="1" />
                    <text x="22" y="83" fontSize="6.5" fill="#94a3b8" textAnchor="end">0</text>

                    {/* 트렌드 곡선 렌더링 (사전 -> 중간 -> 사후) */}
                    {preScore !== null && (
                      <path
                        d={
                          midScore !== null && postScore !== null
                            ? `M 50 ${80 - preScore * 0.7} L 150 ${80 - midScore * 0.7} L 250 ${80 - postScore * 0.7}`
                            : `M 50 ${80 - preScore * 0.7} L 250 ${80 - (postScore ?? midScore ?? 0) * 0.7}`
                        }
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="2"
                      />
                    )}

                    {/* 사전 노드 */}
                    {preScore !== null && (
                      <g>
                        <circle cx="50" cy={80 - preScore * 0.7} r="3" fill="#ffffff" stroke="#1e3a8a" strokeWidth="2" />
                        <text x="50" y={80 - preScore * 0.7 - 7} fontSize="7" fill="#1e3a8a" fontWeight="bold" textAnchor="middle">{preScore}점</text>
                        <text x="50" y="89" fontSize="6.5" fill="#64748b" textAnchor="middle" fontWeight="bold">사전</text>
                      </g>
                    )}

                    {/* 중간 노드 */}
                    {midScore !== null && (
                      <g>
                        <circle cx="150" cy={80 - midScore * 0.7} r="3" fill="#ffffff" stroke="#b28a50" strokeWidth="2" />
                        <text x="150" y={80 - midScore * 0.7 - 7} fontSize="7" fill="#b28a50" fontWeight="bold" textAnchor="middle">{midScore}점</text>
                        <text x="150" y="89" fontSize="6.5" fill="#64748b" textAnchor="middle" fontWeight="bold">중간</text>
                      </g>
                    )}

                    {/* 사후 노드 */}
                    {postScore !== null && (
                      <g>
                        <circle cx="250" cy={80 - postScore * 0.7} r="3" fill="#ffffff" stroke="#ef4444" strokeWidth="2" />
                        <text x="250" y={80 - postScore * 0.7 - 7} fontSize="7" fill="#ef4444" fontWeight="bold" textAnchor="middle">{postScore}점</text>
                        <text x="250" y="89" fontSize="6.5" fill="#64748b" textAnchor="middle" fontWeight="bold">사후</text>
                      </g>
                    )}
                  </svg>
                </div>
              </div>

              {/* 학습 성과 핵심 지표 분석 */}
              <div style={{ marginTop: "0.8rem", padding: "0.6rem 0.8rem", borderRadius: "5px", backgroundColor: "#fafbfc", border: "1px solid #e2e8f0", borderLeft: "4px solid #b28a50" }}>
                <div style={{ fontSize: "0.75rem", fontWeight: "bold", color: "#1e3a8a", marginBottom: "0.15rem" }}>학습 성과 핵심 지표 분석</div>
                <p style={{ fontSize: "0.7rem", color: "#4b5563", lineHeight: 1.4, margin: 0, textIndent: "0.2rem" }}>
                  {selectedStudent} 학생은 사전 평가 대비 최종 사후 평가에서 총 <strong>{growth}점의 성과 향상</strong>을 달성해 냈습니다. 체계적인 훈련과 반복적인 피드백 구조를 통하여, 오개념 영역의 복원이 가시적으로 수행되었음이 성취 지표 데이터를 통하여 객관적으로 입증됩니다.
                </p>
              </div>
            </div>

            {/* 2. 회차별 문항 성적 대조표 */}
            <div className="report-section" style={{ marginBottom: "0" }}>
              <div className="section-title-container" style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.6rem" }}>
                <span style={{ backgroundColor: "#1e3a8a", color: "#fff", width: "1.1rem", height: "1.1rem", borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "0.7rem" }}>2</span>
                <span style={{ fontSize: "0.85rem", fontWeight: "bold", color: "#1e3a8a" }}>회차별 문항 성적 대조표</span>
              </div>
              
              <table className="report-table" style={{ fontSize: "0.68rem", width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ backgroundColor: "#1e3a8a", color: "#ffffff" }}>
                    <th style={{ width: "18%", padding: "0.45rem", border: "1px solid #cbd5e1", textAlign: "center" }}>평가 회차</th>
                    <th style={{ width: "14%", padding: "0.45rem", border: "1px solid #cbd5e1", textAlign: "center" }}>환산 점수</th>
                    <th style={{ width: "16%", padding: "0.45rem", border: "1px solid #cbd5e1", textAlign: "center" }}>취득 수준</th>
                    <th style={{ width: "16%", padding: "0.45rem", border: "1px solid #cbd5e1", textAlign: "center" }}>맞은 문항 수</th>
                    <th style={{ padding: "0.45rem", border: "1px solid #cbd5e1", textIndent: "0.3rem" }}>오답 발생 문항 번호</th>
                  </tr>
                </thead>
                <tbody>
                  {studentEvals.map((e, idx) => {
                    const s = calculateReportStats(e.grade, e.subject, e.answers);
                    const wrongNums = s.detailedResults.filter(q => !q.isCorrect).map(q => q.q_idx);
                    return (
                      <tr key={idx} style={{ backgroundColor: idx % 2 === 1 ? "#f8fafc" : "#ffffff" }}>
                        <td style={{ fontWeight: "bold", padding: "0.45rem", border: "1px solid #cbd5e1", textAlign: "center" }}>{e.examType} 평가</td>
                        <td style={{ fontWeight: "bold", padding: "0.45rem", border: "1px solid #cbd5e1", textAlign: "center", color: "#1e3a8a" }}>{s.score}점</td>
                        <td style={{ padding: "0.45rem", border: "1px solid #cbd5e1", textAlign: "center" }}>
                          <span style={{ padding: "0.15rem 0.35rem", borderRadius: "3px", fontSize: "0.6rem", fontWeight: "bold", backgroundColor: s.achievementLevel === "도달" ? "#d1fae5" : "#fee2e2", color: s.achievementLevel === "도달" ? "#065f46" : "#991b1b" }}>
                            {s.achievementLevel}
                          </span>
                        </td>
                        <td style={{ padding: "0.45rem", border: "1px solid #cbd5e1", textAlign: "center", fontWeight: "600" }}>{s.correctCount} / {s.totalCount}</td>
                        <td style={{ color: "#ef4444", fontWeight: "500", padding: "0.45rem", border: "1px solid #cbd5e1", paddingLeft: "0.6rem" }}>
                          {wrongNums.length > 0 ? `${wrongNums.join(", ")}번 문항` : "오답 없음 (완전 학습)"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 하단 푸터 표식 */}
          <div className="report-footer" style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #e2e8f0", paddingTop: "0.4rem", fontSize: "0.65rem", color: "#94a3b8" }}>
            <span>ⓒ Learnway School & SGS입시전략연구소</span>
            <span>Page 1 of 2</span>
          </div>
        </div>

        {/* 인쇄 분할선 */}
        <div className="page-divider" style={{ textAlign: "center", color: "#94a3b8", fontSize: "0.7rem", margin: "1.5rem 0", borderTop: "2px dashed #cbd5e1", padding: "0.4rem 0" }}>
          페이지 경계 (인쇄 시 이 선을 기준으로 분할 인쇄됩니다)
        </div>

        {/* ----------------- PAGE 2: Claude 정성 분석 & 맞춤 처방 페이지 (LARS 6.pdf Page 2 완벽 미러링) ----------------- */}
        <div className="report-a4-page" style={{ 
          width: "210mm",
          height: "296mm", 
          boxSizing: "border-box", 
          backgroundColor: "#ffffff", 
          boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)",
          padding: "18mm 18mm", 
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between"
        }}>
          <div>
            <div className="report-header" style={{ borderBottom: "2px solid #1e3a8a", paddingBottom: "0.3rem", marginBottom: "0.8rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                <span style={{ fontSize: "0.65rem", color: "#64748b", fontWeight: "bold" }}>LEARNWAY SCHOOL MENTORING OUTCOME REPORT</span>
                <span style={{ fontSize: "0.75rem", fontWeight: "bold", color: "#1e3a8a" }}>학생명: {selectedStudent} | 최종 종합 소견보고</span>
              </div>
            </div>

            <div className="report-section" style={{ display: "flex", flexDirection: "column" }}>
              <div className="section-title-container" style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.8rem" }}>
                <span style={{ backgroundColor: "#b28a50", color: "#fff", width: "1.1rem", height: "1.1rem", borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "0.7rem" }}>3</span>
                <span style={{ fontSize: "0.85rem", fontWeight: "bold", color: "#1e3a8a" }}>SGS Learnway 최종 종합 분석 및 멘토 피드백</span>
              </div>
              
              {/* 정성 지도 소견 카드군 (1단 풀사이즈 배열) */}
              <div className="coaching-box-container" style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                
                {/* 1. 멘토 종합 지도 소견 */}
                <div className="coaching-card" style={{ borderLeft: "4px solid #b28a50", backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderLeftWidth: "4px", padding: "0.7rem 0.8rem", borderRadius: "5px" }}>
                  <div style={{ color: "#b28a50", fontWeight: "bold", fontSize: "0.75rem", marginBottom: "0.25rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                    💡 멘토 종합 지도 소견 및 관찰 변화 (장문 분석)
                  </div>
                  <div style={{ 
                    fontSize: "0.68rem", 
                    color: "#334155", 
                    lineHeight: 1.45, 
                    wordBreak: "keep-all",
                    whiteSpace: "pre-wrap",
                    textAlign: "justify"
                  }}>
                    {isGeneratingAI ? (
                      <div style={{ color: "#b28a50", fontWeight: "bold" }} className="animate-pulse">
                        Claude Sonnet 4.6이 회차별 데이터를 정합 대입하여 성과 분석 결과지를 작성하고 있습니다... (약 10초 내외 소요)
                      </div>
                    ) : hasValidOutcomeAI ? (
                      aiReportData.overallAnalysis
                    ) : (
                      `${selectedStudent} 학생의 사전/중간/사후 변화를 분석 중입니다. 우측 상단의 [AI 성과 정밀 분석] 버튼을 활성화하여 완결형 소견서를 발급받으실 수 있습니다.`
                    )}
                  </div>
                </div>

                {/* 2. 학습성장 핵심 오개념 교정 역사 */}
                <div className="coaching-card" style={{ borderLeft: "4px solid #10b981", backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderLeftWidth: "4px", padding: "0.7rem 0.8rem", borderRadius: "5px" }}>
                  <div style={{ color: "#10b981", fontWeight: "bold", fontSize: "0.75rem", marginBottom: "0.25rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                    🎯 학습성장 핵심 오개념 교정 역사
                  </div>
                  <div style={{ 
                    fontSize: "0.68rem", 
                    color: "#334155", 
                    lineHeight: 1.45, 
                    wordBreak: "keep-all",
                    whiteSpace: "pre-wrap",
                    textAlign: "justify"
                  }}>
                    {isGeneratingAI ? (
                      <div style={{ color: "#10b981", fontWeight: "bold" }} className="animate-pulse">
                        누적 문항별 변별력을 계산해 개념 소멸 과정을 추적하는 중입니다...
                      </div>
                    ) : hasValidOutcomeAI ? (
                      aiReportData.conceptAnalysis
                    ) : (
                      "성과 교정 이력 데이터가 로드되지 않았습니다."
                    )}
                  </div>
                </div>

                {/* 3. 추천 지도 노하우 및 가정 연계 지도법 */}
                <div className="coaching-card" style={{ borderLeft: "4px solid #3b82f6", backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderLeftWidth: "4px", padding: "0.7rem 0.8rem", borderRadius: "5px" }}>
                  <div style={{ color: "#3b82f6", fontWeight: "bold", fontSize: "0.75rem", marginBottom: "0.25rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                    ✏ 추천 지도 노하우 및 가정 연계 지도법
                  </div>
                  <div style={{ 
                    fontSize: "0.68rem", 
                    color: "#334155", 
                    lineHeight: 1.45, 
                    wordBreak: "keep-all",
                    whiteSpace: "pre-wrap",
                    textAlign: "justify"
                  }}>
                    {isGeneratingAI ? (
                      <div style={{ color: "#3b82f6", fontWeight: "bold" }} className="animate-pulse">
                        교수 학습 원리 및 메타인지 연계 노하우를 로드 중입니다...
                      </div>
                    ) : hasValidOutcomeAI ? (
                      aiReportData.coachingPrescription
                    ) : (
                      "가정 학습 연동 코칭 분석 데이터가 비어 있습니다."
                    )}
                  </div>
                </div>

                {/* 4. 차기 실천 액션 플랜 */}
                <div className="coaching-card" style={{ borderLeft: "4px solid #ef4444", backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderLeftWidth: "4px", padding: "0.7rem 0.8rem", borderRadius: "5px" }}>
                  <div style={{ color: "#ef4444", fontWeight: "bold", fontSize: "0.75rem", marginBottom: "0.25rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                    🔥 차기 학기 상급 연계를 위한 핵심 실천 액션 플랜
                  </div>
                  <div style={{ 
                    fontSize: "0.68rem", 
                    color: "#334155", 
                    lineHeight: 1.45, 
                    wordBreak: "keep-all",
                    whiteSpace: "pre-wrap"
                  }}>
                    {isGeneratingAI ? (
                      <div style={{ color: "#ef4444", fontWeight: "bold" }} className="animate-pulse">
                        지속 가능 오개념 자가 피드백 모델을 구성하고 있습니다...
                      </div>
                    ) : hasValidOutcomeAI ? (
                      aiReportData.actionPlan
                    ) : (
                      "지속적 자가 성장을 돕기 위한 액션 플랜 영역입니다."
                    )}
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* 최종 종결 서명 영역 */}
          <div className="report-footer" style={{ borderTop: "1px solid #e2e8f0", paddingTop: "0.4rem", fontSize: "0.65rem", color: "#94a3b8", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>ⓒ Learnway School & SGS입시전략연구소</span>
            <span style={{ fontWeight: "bold", color: "#475569" }}>최종 종결 성과보고서 | Page 2 of 2</span>
          </div>
        </div>
      </div>
    );
  }

  // ==============================================================
  // 4. 기본 대시보드 리스트 마크업 뷰 (기존 디자인 및 원형 유지)
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
                  총 <strong style={{ color: "var(--success-color)", fontSize: "1.1rem" }}>+{growth}%p</strong> 성장하였습니다!
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
