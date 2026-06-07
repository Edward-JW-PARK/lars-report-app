// src/components/DashboardScreen.tsx
import React, { useState } from "react";
import { Plus, Eye, Edit2, Trash2, TrendingUp, Award, FileText, Printer } from "lucide-react";
import { calculateReportStats } from "../utils/reportGenerator";

interface Evaluation {
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
  onDelete: (id: string) => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  evaluations,
  onAddNew,
  onView,
  onEdit,
  onDelete,
}) => {
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [showFinalReport, setShowFinalReport] = useState(false);

  // Get unique list of students
  const students = Array.from(new Set(evaluations.map((e) => e.studentName)));

  // If a student is selected, find all their evaluations
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

  // Calculate student growth metrics
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

// 1. handlePrintFinalReport 함수 업그레이드 (기존 대시보드 내부 함수 대체)
const handlePrintFinalReport = () => {
  // 브라우저 인쇄 엔진이 높이를 제대로 인식할 수 있도록 임시 가드 적용
  const originalOverflow = document.body.style.overflow;
  const originalHeight = document.body.style.height;
  
  document.body.style.overflow = "visible";
  document.body.style.height = "auto";
  
  // 렌더링 동기화를 위한 미세 지연 후 인쇄 창 트리거
  setTimeout(() => {
    window.print();
    // 인쇄 완료 후 원래 스타일로 안전 복구
    document.body.style.overflow = originalOverflow;
    document.body.style.height = originalHeight;
  }, 50);
};


  // Printable Final Report Component (A4 2페이지 인쇄 보장 + 입체적 SVG 성장 그래프 포함 버전)
  if (showFinalReport && selectedStudent) {
    // 실시간 성적 수치 기반 SVG 그래프 좌표 계산
    const scores = [
      { label: "사전", score: preScore || 0, date: preEval?.date || "" },
      { label: "중간", score: midScore || 0, date: midEval?.date || "" },
      { label: "사후", score: postScore || 0, date: postEval?.date || "" }
    ];

    // SVG 차트 좌표 설정 (가로 500, 세로 120 기준)
    const paddingX = 60;
    const chartWidth = 380;
    
    const getX = (idx: number) => paddingX + (chartWidth / 2) * idx;
    const getY = (score: number) => {
      // 0점~100점을 Y축 110~10 영역으로 환산
      return 110 - (score * 1);
    };

    const hasMid = midScore !== null;
    const pointsPath = hasMid 
      ? `M ${getX(0)} ${getY(scores[0].score)} L ${getX(1)} ${getY(scores[1].score)} L ${getX(2)} ${getY(scores[2].score)}`
      : `M ${getX(0)} ${getY(scores[0].score)} L ${getX(2)} ${getY(scores[2].score)}`;

    return (
      <div className="report-workspace-container" style={{ minHeight: "auto", overflow: "visible", backgroundColor: "#f1f5f9", padding: "2rem 0" }}>
        {/* 액션 컨트롤 툴바 (인쇄 시 자동 숨김) */}
        <div className="workspace-actions-floating" style={{ position: "fixed", top: "20px", right: "20px", zIndex: 1000, display: "flex", gap: "0.5rem" }}>
          <button className="btn btn-secondary" onClick={() => setShowFinalReport(false)} style={{ boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}>
            대시보드로 돌아가기
          </button>
          <button className="btn btn-primary" onClick={handlePrintFinalReport} style={{ backgroundColor: "#1e3a8a", borderColor: "#1e3a8a", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}>
            <Printer size={16} /> 보고서 인쇄 및 PDF 저장
          </button>
        </div>

        {/* ============================================================== */}
        {/* OUTCOME PAGE 1: 1페이지 (성장 곡선 및 정량적 추이 대조)          */}
        {/* ============================================================== */}
        <div className="report-a4-page" style={{ 
          pageBreakAfter: "always", 
          breakAfter: "page", 
          height: "296mm", 
          boxSizing: "border-box", 
          backgroundColor: "#ffffff", 
          boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)",
          padding: "20mm",
          display: "flex",
          flexDirection: "column"
        }}>
          {/* 아카데믹 스타일 상단 더블 보더 헤더 */}
          <div className="report-header" style={{ borderBottom: "4px double #1e3a8a", paddingBottom: "1.2rem", marginBottom: "1.5rem" }}>
            <div className="report-title-badge" style={{ display: "inline-block", backgroundColor: "#1e3a8a", color: "#ffffff", padding: "0.25rem 0.75rem", fontSize: "0.7rem", fontWeight: "bold", letterSpacing: "1px", borderRadius: "3px", marginBottom: "0.5rem" }}>
              LEARNWAY SCHOOL MENTORING OUTCOME REPORT
            </div>
            <div className="report-title" style={{ fontSize: "1.8rem", fontWeight: 800, color: "#1e3a8a" }}>
              Learnway 멘토링 프로젝트 최종 성과보고서
            </div>
            <div style={{ marginTop: "0.5rem", fontSize: "0.85rem", color: "#4b5563", fontWeight: 500 }}>
              프로젝트 기간 동안 일어난 학생의 학업 성취 변화 및 종합적인 코칭 성과를 요약 보고합니다.
            </div>

            {/* 메타 인디케이터 그리드 */}
            <div className="report-student-meta" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.75rem", marginTop: "1.5rem" }}>
              <div className="meta-box" style={{ border: "1px solid #e5e7eb", borderRadius: "6px", padding: "0.5rem 0.75rem", display: "flex", flexDirection: "column", gap: "0.15rem" }}>
                <span className="meta-box-label" style={{ fontSize: "0.7rem", color: "#6b7280", fontWeight: "600" }}>학생명</span>
                <span className="meta-box-value" style={{ fontSize: "0.95rem", fontWeight: "bold", color: "#111827" }}>{selectedStudent}</span>
              </div>
              <div className="meta-box" style={{ border: "1px solid #e5e7eb", borderRadius: "6px", padding: "0.5rem 0.75rem", display: "flex", flexDirection: "column", gap: "0.15rem" }}>
                <span className="meta-box-label" style={{ fontSize: "0.7rem", color: "#6b7280", fontWeight: "600" }}>과목 / 학년</span>
                <span className="meta-box-value" style={{ fontSize: "0.95rem", fontWeight: "bold", color: "#111827" }}>
                  {studentEvals[0] ? `${getSubjectLabel(studentEvals[0].subject)} / ${getGradeLabel(studentEvals[0].grade)}` : "-"}
                </span>
              </div>
              <div className="meta-box" style={{ border: "1px solid #e5e7eb", borderRadius: "6px", padding: "0.5rem 0.75rem", display: "flex", flexDirection: "column", gap: "0.15rem" }}>
                <span className="meta-box-label" style={{ fontSize: "0.7rem", color: "#6b7280", fontWeight: "600" }}>총 평가 횟수</span>
                <span className="meta-box-value" style={{ fontSize: "0.95rem", fontWeight: "bold", color: "#111827" }}>{studentEvals.length}회 (사전/중간/사후)</span>
              </div>
              <div className="meta-box" style={{ border: "1px solid #e5e7eb", borderRadius: "6px", padding: "0.5rem 0.75rem", display: "flex", flexDirection: "column", gap: "0.15rem" }}>
                <span className="meta-box-label" style={{ fontSize: "0.7rem", color: "#6b7280", fontWeight: "600" }}>최종 성장도</span>
                <span className="meta-box-value" style={{ fontSize: "0.95rem", fontWeight: "bold", color: growth >= 0 ? "#22c55e" : "#ef4444" }}>
                  {growth >= 0 ? `+${growth}점` : `${growth}점`}
                </span>
              </div>
            </div>
          </div>

          {/* Section 1: 성적 향상 시각화 및 입체 성장 곡선 */}
          <div className="report-section" style={{ breakInside: "avoid", marginBottom: "1.5rem" }}>
            <div className="section-title-container" style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.85rem" }}>
              <span className="section-num" style={{ backgroundColor: "#1e3a8a", color: "#fff", width: "1.5rem", height: "1.5rem", borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "0.8rem" }}>1</span>
              <span className="section-title" style={{ fontSize: "1rem", fontWeight: "bold", color: "#1e3a8a" }}>학업 성취 점수 추이 및 성장 곡선</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "1rem" }}>
              <div className="report-panel" style={{ textAlign: "center", padding: "0.75rem", backgroundColor: "#f8fafc", borderRadius: "8px", borderTop: "4px solid #94a3b8" }}>
                <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>사전 평가</span>
                <span style={{ display: "block", fontSize: "1.8rem", fontWeight: 800, color: "#475569", margin: "0.2rem 0" }}>{preScore !== null ? `${preScore}점` : "미응시"}</span>
                <span style={{ fontSize: "0.65rem", color: "#94a3b8" }}>{preEval?.date || "-"}</span>
              </div>
              <div className="report-panel" style={{ textAlign: "center", padding: "0.75rem", backgroundColor: "#f8fafc", borderRadius: "8px", borderTop: "4px solid #b28a50" }}>
                <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>중간 평가</span>
                <span style={{ display: "block", fontSize: "1.8rem", fontWeight: 800, color: "#b28a50", margin: "0.2rem 0" }}>{midScore !== null ? `${midScore}점` : "미응시"}</span>
                <span style={{ fontSize: "0.65rem", color: "#94a3b8" }}>{midEval?.date || "-"}</span>
              </div>
              <div className="report-panel" style={{ textAlign: "center", padding: "0.75rem", backgroundColor: "#f8fafc", borderRadius: "8px", borderTop: "4px solid #1e3a8a" }}>
                <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>사후 평가</span>
                <span style={{ display: "block", fontSize: "1.8rem", fontWeight: 800, color: "#1e3a8a", margin: "0.2rem 0" }}>{postScore !== null ? `${postScore}점` : "미응시"}</span>
                <span style={{ fontSize: "0.65rem", color: "#94a3b8" }}>{postEval?.date || "-"}</span>
              </div>
            </div>

            {/* 고해상도 인라인 SVG 성장선 곡선 그래프 */}
            <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "1rem", marginBottom: "1rem", position: "relative" }}>
              <div style={{ position: "absolute", top: "8px", left: "12px", fontSize: "0.65rem", color: "#94a3b8", fontWeight: 600 }}>성장 지표 트렌드 (Trend Graph)</div>
              <svg 
  width="100%" 
  height="100%" 
  viewBox="0 0 500 200" // 500:200 비율의 고유 좌표 공간 선언 (숫자만 작성!)
  preserveAspectRatio="none" // 왜곡 없이 채우기 위해 설정 가능
>
                {/* 수평 가이드 라인 (0점, 50점, 100점) */}
                <line x1="40" y1="110" x2="460" y2="110" stroke="#e2e8f0" strokeDasharray="3,3" />
                <line x1="40" y1="60" x2="460" y2="60" stroke="#e2e8f0" strokeDasharray="3,3" />
                <line x1="40" y1="10" x2="460" y2="10" stroke="#e2e8f0" strokeDasharray="3,3" />
                
                <text x="15" y="113" fontSize="8" fill="#94a3b8" fontWeight="bold">0</text>
                <text x="15" y="63" fontSize="8" fill="#94a3b8" fontWeight="bold">50</text>
                <text x="15" y="13" fontSize="8" fill="#94a3b8" fontWeight="bold">100</text>

                {/* 성적 추이 그래프 선 */}
                <path d={pointsPath} fill="none" stroke="#1e3a8a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                
                {/* 각 구간 포인트 노드 데이터 마킹 */}
                {scores.map((s, idx) => {
                  if (idx === 1 && !hasMid) return null;
                  const circleX = getX(idx);
                  const circleY = getY(s.score);
                  return (
                    <g key={idx}>
                      <circle cx={circleX} cy={circleY} r="5" fill="#fff" stroke="#1e3a8a" strokeWidth="3" />
                      <rect x={circleX - 18} y={circleY - 22} width="36" height="14" rx="3" fill="#1e3a8a" />
                      <text x={circleX} y={circleY - 12} fontSize="8" fill="#fff" fontWeight="bold" textAnchor="middle">{s.score}점</text>
                      <text x={circleX} y="125" fontSize="8" fill="#64748b" fontWeight="bold" textAnchor="middle">{s.label}</text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* 지표 상세 요약 분석 */}
            <div className="report-panel" style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "1.2rem", padding: "1rem", borderLeft: "5px solid #b28a50", backgroundColor: "#fafbfc", border: "1px solid #e2e8f0", borderLeftWidth: "5px" }}>
              <TrendingUp size={28} style={{ color: "#b28a50", flexShrink: 0 }} />
              <div>
                <h4 style={{ fontSize: "0.85rem", fontWeight: 700, color: "#1e3a8a", marginBottom: "0.15rem" }}>
                  학습 성과 핵심 지표 분석
                </h4>
                <p style={{ fontSize: "0.78rem", color: "#4b5563", lineHeight: 1.4, margin: 0 }}>
                  {selectedStudent} 학생은 사전 평가 대비 사후 평가에서 <strong>{growth}점 향상</strong>된 우수한 학업 성취 성장을 기록했습니다. 
                  기본 연산 오류가 명확하게 감소하였고, 실시간 피드백을 통해 주요 오개념을 자가 교정할 수 있는 자기주도적 성장이 정량적으로 증명되었습니다.
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: 회차별 문항 성적 대조표 */}
          <div className="report-section" style={{ marginBottom: "0", breakInside: "avoid" }}>
            <div className="section-title-container" style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.85rem" }}>
              <span className="section-num" style={{ backgroundColor: "#1e3a8a", color: "#fff", width: "1.5rem", height: "1.5rem", borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "0.8rem" }}>2</span>
              <span className="section-title" style={{ fontSize: "1rem", fontWeight: "bold", color: "#1e3a8a" }}>회차별 문항 성적 대조표</span>
            </div>
            
            <table className="report-table" style={{ fontSize: "0.75rem", width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ backgroundColor: "#1e3a8a", color: "#ffffff" }}>
                  <th style={{ width: "20%", padding: "0.6rem", border: "1px solid #cbd5e1" }}>평가 회차</th>
                  <th style={{ width: "15%", padding: "0.6rem", border: "1px solid #cbd5e1" }}>환산 점수</th>
                  <th style={{ width: "20%", padding: "0.6rem", border: "1px solid #cbd5e1" }}>취득 수준</th>
                  <th style={{ width: "15%", padding: "0.6rem", border: "1px solid #cbd5e1" }}>맞은 문항 수</th>
                  <th style={{ padding: "0.6rem", border: "1px solid #cbd5e1" }}>오답 발생 문항 번호</th>
                </tr>
              </thead>
              <tbody>
                {studentEvals.map((e, idx) => {
                  const s = calculateReportStats(e.grade, e.subject, e.answers);
                  const wrongNums = s.detailedResults.filter(q => !q.isCorrect).map(q => q.q_idx);
                  return (
                    <tr key={idx} style={{ backgroundColor: idx % 2 === 1 ? "#f8fafc" : "#ffffff" }}>
                      <td className="center" style={{ fontWeight: 700, padding: "0.6rem", border: "1px solid #cbd5e1", textAlign: "center" }}>{e.examType} 평가</td>
                      <td className="center" style={{ fontWeight: 600, padding: "0.6rem", border: "1px solid #cbd5e1", textAlign: "center", color: "#1e3a8a" }}>{s.score}점</td>
                      <td className="center" style={{ padding: "0.6rem", border: "1px solid #cbd5e1", textAlign: "center" }}>
                        <span style={{ padding: "0.2rem 0.5rem", borderRadius: "4px", fontSize: "0.7rem", fontWeight: "bold", backgroundColor: s.achievementLevel === "도달" ? "#d1fae5" : "#fee2e2", color: s.achievementLevel === "도달" ? "#065f46" : "#991b1b" }}>
                          {s.achievementLevel}
                        </span>
                      </td>
                      <td className="center" style={{ padding: "0.6rem", border: "1px solid #cbd5e1", textAlign: "center" }}>{s.correctCount} / {s.totalCount}</td>
                      <td style={{ color: "#ef4444", fontSize: "0.75rem", padding: "0.6rem", border: "1px solid #cbd5e1" }}>
                        {wrongNums.length > 0 ? `${wrongNums.join(", ")}번 문항` : "오답 없음 (완전 학습)"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer (1페이지용) */}
          <div className="report-footer" style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", borderTop: "1px solid #e2e8f0", paddingTop: "0.5rem", fontSize: "0.7rem", color: "#94a3b8" }}>
            <span>ⓒ Learnway School & SGS입시전략연구소</span>
            <span>Page 1 of 2</span>
          </div>
        </div>

        <div className="page-divider" style={{ textAlign: "center", color: "#94a3b8", fontSize: "0.75rem", margin: "1.5rem 0", borderTop: "2px dashed #cbd5e1", padding: "0.5rem 0" }}>
          페이지 경계 (인쇄 시 이 선을 기준으로 분할 인쇄됩니다)
        </div>

        {/* ============================================================== */}
        {/* OUTCOME PAGE 2: 2페이지 (멘토링 종합 소견 및 정성적 분석)        */}
        {/* ============================================================== */}
        <div className="report-a4-page" style={{ 
          height: "296mm", 
          boxSizing: "border-box", 
          backgroundColor: "#ffffff", 
          boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)",
          padding: "20mm",
          display: "flex",
          flexDirection: "column"
        }}>
          <div className="report-header" style={{ borderBottom: "2px solid #1e3a8a", paddingBottom: "0.5rem", marginBottom: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
              <span style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 600 }}>LEARNWAY SCHOOL MENTORING OUTCOME REPORT</span>
              <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#1e3a8a" }}>학생명: {selectedStudent} | 최종 종합 소견보고</span>
            </div>
          </div>

          {/* Section 3: 멘토링 종결 종합 의견 */}
          <div className="report-section" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <div className="section-title-container" style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.2rem" }}>
              <span className="section-num" style={{ backgroundColor: "#1e3a8a", color: "#fff", width: "1.5rem", height: "1.5rem", borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "0.8rem" }}>3</span>
              <span className="section-title" style={{ fontSize: "1rem", fontWeight: "bold", color: "#1e3a8a" }}>멘토링 최종 성과 요약 의견</span>
            </div>
            
            <div className="coaching-box-container" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              {/* 지도 소견 */}
              <div className="coaching-card full-width" style={{ borderLeft: "4px solid #b28a50", backgroundColor: "#fff", border: "1px solid #e2e8f0", borderLeftWidth: "4px", padding: "1rem", borderRadius: "6px", breakInside: "avoid" }}>
                <div className="coaching-card-title" style={{ color: "#b28a50", fontWeight: "bold", fontSize: "0.85rem", marginBottom: "0.4rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                  💡 멘토 종합 지도 소견 및 관찰 변화
                </div>
                <div className="coaching-card-body" style={{ fontSize: "0.78rem", color: "#334155", lineHeight: 1.6 }}>
                  {postEval?.mentorNotes ? (
                    `사후 평가 멘토 관찰: "${postEval.mentorNotes}"`
                  ) : midEval?.mentorNotes ? (
                    `중간 평가 멘토 관찰: "${midEval.mentorNotes}"`
                  ) : (
                    "프로젝트 시작 시점의 취약점을 보완하기 위해 멘토가 학생과 집중적으로 개념 훈련 및 오답 점검을 진행하였습니다. 학생의 전반적인 개념 적용률과 문제 해결 태도가 매우 긍정적으로 개선되었습니다."
                  )}
                </div>
              </div>

              {/* 학습성장 분야 */}
              <div className="coaching-card full-width" style={{ borderLeft: "4px solid #10b981", backgroundColor: "#fff", border: "1px solid #e2e8f0", borderLeftWidth: "4px", padding: "1rem", borderRadius: "6px", breakInside: "avoid" }}>
                <div className="coaching-card-title" style={{ color: "#10b981", fontWeight: "bold", fontSize: "0.85rem", marginBottom: "0.4rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                  🎯 학습성장 핵심 분야
                </div>
                <div className="coaching-card-body" style={{ fontSize: "0.78rem", color: "#334155", lineHeight: 1.6 }}>
                  사전 평가에서 빈번하게 오답이 발생했던 단원의 기초 성취기준 도달률이 평균 40% 이상 크게 상승하였습니다. 
                  주요 오개념을 실시간 밀착 피드백을 통해 교정하여 유사 유형의 연계 문항 정답률이 대폭 올라갔습니다.
                </div>
              </div>

              {/* 연계 제안 */}
              <div className="coaching-card full-width" style={{ borderLeft: "4px solid #ef4444", backgroundColor: "#fff", border: "1px solid #e2e8f0", borderLeftWidth: "4px", padding: "1rem", borderRadius: "6px", breakInside: "avoid" }}>
                <div className="coaching-card-title" style={{ color: "#ef4444", fontWeight: "bold", fontSize: "0.85rem", marginBottom: "0.4rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                  🔥 추후 연계 학습 제안
                </div>
                <div className="coaching-card-body" style={{ fontSize: "0.78rem", color: "#334155", lineHeight: 1.6 }}>
                  성장률은 매우 우수하나, 심화형 추론 문항에서는 여전히 유형에 따른 혼란 양상을 보입니다. 
                  성공적인 차기 학습 흐름을 위해 심화 유형 3개 이상 집중 적용 훈련 및 역순 추론 오답 역추적 학습법을 지속할 것을 강력히 권장합니다.
                </div>
              </div>
            </div>
          </div>

          {/* Footer (2페이지용) */}
          <div className="report-footer" style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", borderTop: "1px solid #e2e8f0", paddingTop: "0.5rem", fontSize: "0.7rem", color: "#94a3b8" }}>
            <span>ⓒ Learnway School & SGS입시전략연구소</span>
            <span style={{ fontWeight: "bold", color: "#333" }}>최종 종결 성과보고서 | Page 2 of 2</span>
          </div>
        </div>
      </div>
    );
  }



  return (
    <div className="dashboard-grid">
      {/* Past evaluations table */}
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

      {/* Side tracker for Pre/Mid/Post progression */}
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
                <button className="btn btn-primary" style={{ padding: "0.35rem 0.75rem", fontSize: "0.78rem" }} onClick={() => setShowFinalReport(true)}>
                  <Award size={13} /> 성과보고서 발행
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
