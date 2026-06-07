import React from "react";
import { ArrowLeft, Printer, AlertTriangle, MessageSquare, BookOpen } from "lucide-react";
import type { Evaluation } from "../App"; // pure Type 임포트 유지
import { calculateReportStats } from "../utils/reportGenerator"; // 누락된 유틸리티 임포트 추가

interface OutcomeReportViewProps {
  studentName: string;
  grade: "middle_1" | "middle_2" | "middle_3";
  subject: "math" | "english";
  evaluations: Evaluation[];
  aiResult: {
    overallAnalysis: string;
    conceptAnalysis: string;
    coachingPrescription: string;
    actionPlan: string;
  };
  onBack: () => void;
}

export const OutcomeReportView: React.FC<OutcomeReportViewProps> = ({
  studentName,
  grade,
  subject,
  evaluations,
  aiResult,
  onBack
}) => {
  // 사전 -> 중간 -> 사후 순으로 기록 정렬
  const sortedEvals = [...evaluations].sort((a, b) => {
    const order = { "사전": 1, "중간": 2, "사후": 3 };
    return order[a.examType] - order[b.examType];
  });

  const getGradeLabel = (g: string) => {
    if (g === "middle_1") return "중학교 1학년";
    if (g === "middle_2") return "중학교 2학년";
    return "중학교 3학년";
  };

  const calculateScore = (answers: { [q_idx: number]: boolean }) => {
    const correctCount = Object.values(answers).filter(Boolean).length;
    return Math.round((correctCount / 25) * 100);
  };

  const preEval = sortedEvals.find(e => e.examType === "사전");
  const midEval = sortedEvals.find(e => e.examType === "중간");
  const postEval = sortedEvals.find(e => e.examType === "사후");

  const preScore = preEval ? calculateScore(preEval.answers) : 0;
  const midScore = midEval ? calculateScore(midEval.answers) : 0;
  const postScore = postEval ? calculateScore(postEval.answers) : 0;
  const totalGrowth = postScore - preScore;

  const handlePrint = () => {
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

  return (
    <div className="report-workspace-container" style={{ minHeight: "auto", overflow: "visible", backgroundColor: "#f1f5f9", padding: "2rem 0" }}>
      
      {/* Floating Action Bar */}
      <div className="workspace-actions-floating" style={{ position: "fixed", top: "20px", right: "20px", zIndex: 1000, display: "flex", gap: "0.5rem" }}>
        <button className="btn btn-secondary" onClick={onBack} style={{ boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}>
          <ArrowLeft size={16} /> 대시보드로 이동
        </button>
        <button className="btn btn-primary" onClick={handlePrint} style={{ backgroundColor: "#1e3a8a", borderColor: "#1e3a8a", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}>
          <Printer size={16} /> 최종 성과보고서 PDF 저장 및 인쇄
        </button>
      </div>

      {/* ----------------- PAGE 1: 정량 지표 & 대조표 (LARS 6.pdf 스펙 완벽 구현) ----------------- */}
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
        justifyContent: "space-between"
      }}>
        <div>
          <div className="report-header" style={{ borderBottom: "4px double #1e3a8a", paddingBottom: "1rem", marginBottom: "1.2rem" }}>
            <div className="report-title-badge" style={{ display: "inline-block", backgroundColor: "#1e3a8a", color: "#ffffff", padding: "0.25rem 0.75rem", fontSize: "0.7rem", fontWeight: "bold", letterSpacing: "1px", borderRadius: "3px", marginBottom: "0.4rem" }}>
              LEARNWAY SCHOOL MENTORING OUTCOME REPORT
            </div>
            <div className="report-title" style={{ fontSize: "1.7rem", fontWeight: 800, color: "#1e3a8a" }}>
              {studentName} 학생 멘토링 최종 성과보고서
            </div>
            <div style={{ marginTop: "0.4rem", fontSize: "0.8rem", color: "#4b5563", fontWeight: 500 }}>
              프로젝트 기간 동안 일어난 학생의 학업 성취 변화 및 종합적인 코칭 성과를 요약 보고합니다.
            </div>

            <div className="report-student-meta" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.6rem", marginTop: "1.2rem" }}>
              <div className="meta-box" style={{ border: "1px solid #e5e7eb", borderRadius: "6px", padding: "0.4rem 0.6rem", display: "flex", flexDirection: "column", gap: "0.1rem" }}>
                <span className="meta-box-label" style={{ fontSize: "0.65rem", color: "#6b7280", fontWeight: "600" }}>학생명</span>
                <span className="meta-box-value" style={{ fontSize: "0.9rem", fontWeight: "bold", color: "#111827" }}>{studentName}</span>
              </div>
              <div className="meta-box" style={{ border: "1px solid #e5e7eb", borderRadius: "6px", padding: "0.4rem 0.6rem", display: "flex", flexDirection: "column", gap: "0.1rem" }}>
                <span className="meta-box-label" style={{ fontSize: "0.65rem", color: "#6b7280", fontWeight: "600" }}>과목 / 학년</span>
                <span className="meta-box-value" style={{ fontSize: "0.9rem", fontWeight: "bold", color: "#111827" }}>
                  {subject === "math" ? "수학" : "영어"} / {getGradeLabel(grade)}
                </span>
              </div>
              <div className="meta-box" style={{ border: "1px solid #e5e7eb", borderRadius: "6px", padding: "0.4rem 0.6rem", display: "flex", flexDirection: "column", gap: "0.1rem" }}>
                <span className="meta-box-label" style={{ fontSize: "0.65rem", color: "#6b7280", fontWeight: "600" }}>총 평가 횟수</span>
                <span className="meta-box-value" style={{ fontSize: "0.9rem", fontWeight: "bold", color: "#111827" }}>{sortedEvals.length}회 (사전/중간/사후)</span>
              </div>
              <div className="meta-box" style={{ border: "1px solid #e5e7eb", borderRadius: "6px", padding: "0.4rem 0.6rem", display: "flex", flexDirection: "column", gap: "0.1rem", backgroundColor: "#f0fdf4" }}>
                <span className="meta-box-label" style={{ fontSize: "0.65rem", color: "#16a34a", fontWeight: "600" }}>최종 성장도</span>
                <span className="meta-box-value" style={{ fontSize: "0.9rem", fontWeight: "black", color: "#15803d" }}>
                  {totalGrowth >= 0 ? `+${totalGrowth}점` : `${totalGrowth}점`}
                </span>
              </div>
            </div>
          </div>

          {/* 1. 학업 성취 점수 추이 및 성장 곡선 */}
          <div className="report-section" style={{ breakInside: "avoid", marginBottom: "1.2rem" }}>
            <div className="section-title-container" style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.65rem" }}>
              <span className="section-num" style={{ backgroundColor: "#1e3a8a", color: "#fff", width: "1.3rem", height: "1.3rem", borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "0.75rem" }}>1</span>
              <span className="section-title" style={{ fontSize: "0.9rem", fontWeight: "bold", color: "#1e3a8a" }}>학업 성취 점수 추이 및 성장 곡선</span>
            </div>

            {/* 평가 3단계 병렬 요약 카드 (LARS 6.pdf 원형) */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "1rem" }}>
              <div style={{ border: "1px solid #cbd5e1", borderRadius: "6px", padding: "0.6rem", textAlign: "center" }}>
                <div style={{ fontSize: "0.75rem", color: "#475569", fontWeight: "bold" }}>사전 평가</div>
                <div style={{ fontSize: "1.2rem", fontWeight: "black", color: "#1e293b", margin: "0.2rem 0" }}>{preScore}점</div>
                <div style={{ fontSize: "0.65rem", color: "#94a3b8" }}>{preEval?.date || "2026. 6. 7."}</div>
              </div>
              <div style={{ border: "1px solid #cbd5e1", borderRadius: "6px", padding: "0.6rem", textAlign: "center" }}>
                <div style={{ fontSize: "0.75rem", color: "#475569", fontWeight: "bold" }}>중간 평가</div>
                <div style={{ fontSize: "1.2rem", fontWeight: "black", color: "#1e293b", margin: "0.2rem 0" }}>{midScore}점</div>
                <div style={{ fontSize: "0.65rem", color: "#94a3b8" }}>{midEval?.date || "2026. 6. 7."}</div>
              </div>
              <div style={{ border: "1px solid #fecaca", borderRadius: "6px", padding: "0.6rem", textAlign: "center", backgroundColor: "#fef2f2" }}>
                <div style={{ fontSize: "0.75rem", color: "#dc2626", fontWeight: "bold" }}>사후 평가</div>
                <div style={{ fontSize: "1.2rem", fontWeight: "black", color: "#b91c1c", margin: "0.2rem 0" }}>{postScore}점</div>
                <div style={{ fontSize: "0.65rem", color: "#dc2626" }}>{postEval?.date || "2026. 6. 7."}</div>
              </div>
            </div>

            {/* 성장도 그래프 영역 */}
            <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "0.8rem", position: "relative" }}>
              <div style={{ fontSize: "0.7rem", color: "#334155", fontWeight: "bold", marginBottom: "0.4rem", textAlign: "center" }}>성장 지표 트렌드 (Trend Graph)</div>
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                <svg width="100%" height="90" viewBox="0 0 300 90" style={{ overflow: "visible" }}>
                  <line x1="30" y1="10" x2="270" y2="10" stroke="#e2e8f0" strokeWidth="1" />
                  <text x="22" y="13" fontSize="6.5" fill="#94a3b8" textAnchor="end">100</text>
                  <line x1="30" y1="50" x2="270" y2="50" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="3,3" />
                  <text x="22" y="53" fontSize="6.5" fill="#94a3b8" textAnchor="end">50</text>
                  <line x1="30" y1="80" x2="270" y2="80" stroke="#cbd5e1" strokeWidth="1" />
                  <text x="22" y="83" fontSize="6.5" fill="#94a3b8" textAnchor="end">0</text>

                  <path
                    d={`M 50 ${80 - preScore * 0.7} L 150 ${80 - midScore * 0.7} L 250 ${80 - postScore * 0.7}`}
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="2"
                  />

                  <g>
                    <circle cx="50" cy={80 - preScore * 0.7} r="3" fill="#ffffff" stroke="#1e3a8a" strokeWidth="2" />
                    <text x="50" y={80 - preScore * 0.7 - 7} fontSize="7" fill="#1e3a8a" fontWeight="bold" textAnchor="middle">{preScore}점</text>
                    <text x="50" y="89" fontSize="6.5" fill="#64748b" textAnchor="middle" fontWeight="bold">사전</text>
                  </g>

                  <g>
                    <circle cx="150" cy={80 - midScore * 0.7} r="3" fill="#ffffff" stroke="#b28a50" strokeWidth="2" />
                    <text x="150" y={80 - midScore * 0.7 - 7} fontSize="7" fill="#b28a50" fontWeight="bold" textAnchor="middle">{midScore}점</text>
                    <text x="150" y="89" fontSize="6.5" fill="#64748b" textAnchor="middle" fontWeight="bold">중간</text>
                  </g>

                  <g>
                    <circle cx="250" cy={80 - postScore * 0.7} r="3" fill="#ffffff" stroke="#ef4444" strokeWidth="2" />
                    <text x="250" y={80 - postScore * 0.7 - 7} fontSize="7" fill="#ef4444" fontWeight="bold" textAnchor="middle">{postScore}점</text>
                    <text x="250" y="89" fontSize="6.5" fill="#64748b" textAnchor="middle" fontWeight="bold">사후</text>
                  </g>
                </svg>
              </div>
            </div>

            {/* 학습 성과 핵심 지표 요약 문구 */}
            <div style={{ marginTop: "1rem", padding: "0.6rem 0.8rem", borderRadius: "5px", backgroundColor: "#fafbfc", border: "1px solid #e2e8f0", borderLeft: "5px solid #b28a50" }}>
              <div style={{ fontSize: "0.75rem", fontWeight: "bold", color: "#1e3a8a", marginBottom: "0.15rem" }}>학습 성과 핵심 지표 분석</div>
              <p style={{ fontSize: "0.7rem", color: "#4b5563", lineHeight: 1.45, margin: 0, textIndent: "0.2rem" }}>
                {studentName} 학생은 사전 평가 대비 최종 사후 평가에서 총 <strong>{totalGrowth}점의 성과 향상</strong>을 달성해 냈습니다. 체계적인 훈련과 반복적인 피드백 구조를 통하여, 오개념 영역의 복원이 가시적으로 수행되었음이 성취 지표 데이터를 통하여 객관적으로 입증됩니다.
              </p>
            </div>
          </div>

          {/* 2. 회차별 문항 성적 대조표 */}
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
                {sortedEvals.map((e, idx) => {
                  const s = calculateReportStats(e.grade, e.subject, e.answers);
                  const wrongNums = s.detailedResults.filter((q: any) => !q.isCorrect).map((q: any) => q.q_idx);
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

      {/* ----------------- PAGE 2: Claude 정성 종합 분석 1단 수직 배열 포맷 ----------------- */}
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
              <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#1e3a8a" }}>학생명: {studentName} | 최종 종합 소견보고</span>
            </div>
          </div>

          <div className="report-section" style={{ display: "flex", flexDirection: "column" }}>
            <div className="section-title-container" style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.8rem" }}>
              <span className="section-num" style={{ backgroundColor: "#b28a50", color: "#fff", width: "1.3rem", height: "1.3rem", borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "0.75rem" }}>3</span>
              <span className="section-title" style={{ fontSize: "0.9rem", fontWeight: "bold", color: "#1e3a8a" }}>SGS Learnway 최종 종합 분석 및 멘토 피드백</span>
            </div>
            
            <div className="coaching-box-container" style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              
              {/* 1. 지도 소견 카드 (Full-Width) */}
              <div className="coaching-card full-width" style={{ borderLeft: "4px solid #b28a50", backgroundColor: "#fff", border: "1px solid #e2e8f0", borderLeftWidth: "4px", padding: "0.7rem 0.8rem", borderRadius: "6px" }}>
                <div className="coaching-card-title" style={{ color: "#b28a50", fontWeight: "bold", fontSize: "0.75rem", marginBottom: "0.25rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                  💡 멘토 종합 지도 소견 및 관찰 변화 (장문 분석)
                </div>
                <div className="coaching-card-body" style={{ 
                  fontSize: "0.68rem", 
                  color: "#334155", 
                  lineHeight: 1.45, 
                  wordBreak: "keep-all",
                  whiteSpace: "pre-wrap",
                  textAlign: "justify"
                }}>
                  {aiResult.overallAnalysis}
                </div>
              </div>

              {/* 2. 학습성장 핵심 오개념 교정 역사 (Full-Width) */}
              <div className="coaching-card full-width" style={{ borderLeft: "4px solid #10b981", backgroundColor: "#fff", border: "1px solid #e2e8f0", borderLeftWidth: "4px", padding: "0.7rem 0.8rem", borderRadius: "6px" }}>
                <div className="coaching-card-title" style={{ color: "#10b981", fontWeight: "bold", fontSize: "0.75rem", marginBottom: "0.25rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                  <AlertTriangle size={14} /> 🎯 학습성장 핵심 오개념 교정 역사
                </div>
                <div className="coaching-card-body" style={{ 
                  fontSize: "0.68rem", 
                  color: "#334155", 
                  lineHeight: 1.45, 
                  wordBreak: "keep-all",
                  whiteSpace: "pre-wrap",
                  textAlign: "justify"
                }}>
                  {aiResult.conceptAnalysis}
                </div>
              </div>

              {/* 3. 추천 지도 노하우 및 가정 연계 지도법 (Full-Width) */}
              <div className="coaching-card full-width" style={{ borderLeft: "4px solid #3b82f6", backgroundColor: "#fff", border: "1px solid #e2e8f0", borderLeftWidth: "4px", padding: "0.7rem 0.8rem", borderRadius: "6px" }}>
                <div className="coaching-card-title" style={{ color: "#3b82f6", fontWeight: "bold", fontSize: "0.75rem", marginBottom: "0.25rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                  <MessageSquare size={14} /> ✏️ 추천 지도 노하우 및 가정 연계 지도법
                </div>
                <div className="coaching-card-body" style={{ 
                  fontSize: "0.68rem", 
                  color: "#334155", 
                  lineHeight: 1.45, 
                  wordBreak: "keep-all",
                  whiteSpace: "pre-wrap",
                  textAlign: "justify"
                }}>
                  {aiResult.coachingPrescription}
                </div>
              </div>

              {/* 4. 실천 액션 플랜 (Full-Width) */}
              <div className="coaching-card full-width" style={{ borderLeft: "4px solid #ef4444", backgroundColor: "#fff", border: "1px solid #e2e8f0", borderLeftWidth: "4px", padding: "0.7rem 0.8rem", borderRadius: "6px" }}>
                <div className="coaching-card-title" style={{ color: "#ef4444", fontWeight: "bold", fontSize: "0.75rem", marginBottom: "0.25rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                  <BookOpen size={14} /> 🔥 차기 학기 상급 연계를 위한 핵심 실천 액션 플랜
                </div>
                <div className="coaching-card-body" style={{ 
                  fontSize: "0.68rem", 
                  color: "#334155", 
                  lineHeight: 1.45, 
                  wordBreak: "keep-all",
                  whiteSpace: "pre-wrap"
                }}>
                  {aiResult.actionPlan}
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
};
