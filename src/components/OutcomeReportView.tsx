// src/components/OutcomeReportView.tsx
import React from "react";
import { ArrowLeft, Printer, CheckCircle, AlertTriangle, MessageSquare, BookOpen, TrendingUp } from "lucide-react";
import { Evaluation } from "../App";

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
    window.print();
  };

  return (
    <div className="report-workspace-container">
      {/* Floating Action Bar */}
      <div className="workspace-actions-floating">
        <button className="btn btn-secondary" onClick={onBack}>
          <ArrowLeft size={16} /> 대시보드로 이동
        </button>
        <button className="btn btn-primary" onClick={handlePrint}>
          <Printer size={16} /> 최종 성과보고서 PDF 저장 및 인쇄
        </button>
      </div>

      {/* A4 성과보고서 뷰 (3페이지 인쇄 규격) */}
      <div className="report-a4-page">
        <div className="report-header">
          <div className="report-title-badge" style={{ backgroundColor: "#8a6d3b" }}>SGS LEARNWAY 최종 성과 포트폴리오</div>
          <div className="report-title" style={{ fontSize: "1.85rem" }}>
            {studentName} 학생 멘토링 최종 성과보고서
          </div>
          
          <div className="report-student-meta">
            <div className="meta-box">
              <span className="meta-box-label">학생명</span>
              <span className="meta-box-value">{studentName}</span>
            </div>
            <div className="meta-box">
              <span className="meta-box-label">학년 / 과목</span>
              <span className="meta-box-value">{getGradeLabel(grade)} / {subject === "math" ? "수학" : "영어"}</span>
            </div>
            <div className="meta-box">
              <span className="meta-box-label">종합 성장 성과</span>
              <span className="meta-box-value" style={{ color: "var(--danger-color)", fontWeight: 800 }}>+{totalGrowth}점 성장</span>
            </div>
            <div className="meta-box">
              <span className="meta-box-label">발행기관</span>
              <span className="meta-box-value">SGS입시전략연구소</span>
            </div>
          </div>
        </div>

        {/* 1. 시계열 학업성취 성장 지표 */}
        <div className="report-section">
          <div className="section-title-container">
            <span className="section-num" style={{ backgroundColor: "#8a6d3b" }}>1</span>
            <span className="section-title">사전 · 중간 · 사후 종합 성취도 추이</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "1.5rem" }}>
            {/* 시계열 성적 테이블 */}
            <table className="report-table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th>평가 단계</th>
                  <th>평가 일자</th>
                  <th>성취 문항 수</th>
                  <th>환산 점수</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="center" style={{ fontWeight: 700 }}>사전 평가 (시작)</td>
                  <td className="center">{preEval?.date || "미측정"}</td>
                  <td className="center">{preEval ? Object.values(preEval.answers).filter(Boolean).length : 0} / 25</td>
                  <td className="center" style={{ fontWeight: 800, color: "var(--primary-navy)" }}>{preScore}점</td>
                </tr>
                <tr>
                  <td className="center" style={{ fontWeight: 700 }}>중간 평가 (과정)</td>
                  <td className="center">{midEval?.date || "미측정"}</td>
                  <td className="center">{midEval ? Object.values(midEval.answers).filter(Boolean).length : 0} / 25</td>
                  <td className="center" style={{ fontWeight: 800, color: "var(--primary-navy)" }}>{midScore}점</td>
                </tr>
                <tr>
                  <td className="center" style={{ fontWeight: 700 }}>사후 평가 (최종)</td>
                  <td className="center">{postEval?.date || "미측정"}</td>
                  <td className="center">{postEval ? Object.values(postEval.answers).filter(Boolean).length : 0} / 25</td>
                  <td className="center" style={{ fontWeight: 800, color: "var(--danger-color)", fontSize: "1.05rem" }}>{postScore}점</td>
                </tr>
              </tbody>
            </table>

            {/* 시각화 성장 차트 */}
            <div className="report-panel" style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
              <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#333", marginBottom: "0.5rem" }}>
                성취도 변화 추적 그래프
              </div>
              <svg viewBox="0 0 500 130" style={{ width: "100%", height: "120px" }}>
                {/* 배경 그리드선 */}
                <line x1="50" y1="20" x2="450" y2="20" stroke="#f1f3f5" strokeWidth="1" />
                <line x1="50" y1="65" x2="450" y2="65" stroke="#f1f3f5" strokeWidth="1" />
                <line x1="50" y1="110" x2="450" y2="110" stroke="#e9ecef" strokeWidth="1.5" />
                
                {/* 꺾은선 실선 그래프 */}
                <path 
                  d={`M 100 ${110 - (preScore * 0.9)} L 250 ${110 - (midScore * 0.9)} L 400 ${110 - (postScore * 0.9)}`} 
                  fill="none" 
                  stroke="#8a6d3b" 
                  strokeWidth="3.5" 
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* 데이터 노드 및 텍스트 */}
                <circle cx="100" cy={110 - (preScore * 0.9)} r="5" fill="#8a6d3b" />
                <text x="100" y={95 - (preScore * 0.9)} fontSize="11" fontWeight="800" textAnchor="middle" fill="#333">{preScore}점</text>
                <text x="100" y="125" fontSize="10" textAnchor="middle" fill="#666">사전</text>

                <circle cx="250" cy={110 - (midScore * 0.9)} r="5" fill="#8a6d3b" />
                <text x="250" y={95 - (midScore * 0.9)} fontSize="11" fontWeight="800" textAnchor="middle" fill="#333">{midScore}점</text>
                <text x="250" y="125" fontSize="10" textAnchor="middle" fill="#666">중간</text>

                <circle cx="400" cy={110 - (postScore * 0.9)} r="6" fill="var(--danger-color)" />
                <text x="400" y={95 - (postScore * 0.9)} fontSize="12" fontWeight="800" textAnchor="middle" fill="var(--danger-color)">{postScore}점</text>
                <text x="400" y="125" fontSize="10" textAnchor="middle" fill="#666">사후</text>
              </svg>
            </div>
          </div>
        </div>

        {/* 2. 멘토 정성 관찰 이력 대조 */}
        <div className="report-section" style={{ marginBottom: "0" }}>
          <div className="section-title-container">
            <span className="section-num" style={{ backgroundColor: "#8a6d3b" }}>2</span>
            <span className="section-title">멘토링 정성 피드백 변화 추이</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {sortedEvals.map((e, index) => (
              <div key={index} className="report-panel" style={{ padding: "0.85rem 1rem", borderLeft: "4px solid #8a6d3b" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.35rem", borderBottom: "1px dashed #eef2f6", paddingBottom: "0.25rem" }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "#8a6d3b" }}>{e.examType} 과정 코칭 노트</span>
                  <span style={{ fontSize: "0.75rem", color: "#888" }}>기록 코치: {e.mentorName || "담당 멘토"} | {e.date}</span>
                </div>
                <div style={{ fontSize: "0.8rem", color: "#444", lineHeight: "1.5", fontStyle: "italic" }}>
                  "{e.mentorNotes || "기록된 멘토 관찰 피드백이 없습니다."}"
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="report-footer" style={{ marginTop: "auto" }}>
          <span>ⓒ Learnway School & SGS입시전략연구소</span>
          <span>Page 1 of 2</span>
        </div>
      </div>

      <div className="page-divider">페이지 경계</div>

      {/* A4 성과보고서 2페이지 (AI 심층 종합 보고서 본문) */}
      <div className="report-a4-page">
        {/* Header (simplified) */}
        <div className="report-header" style={{ borderBottom: "2px solid #8a6d3b", paddingBottom: "0.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <span style={{ fontSize: "0.75rem", color: "#666", fontWeight: 600 }}>LEARNWAY SCHOOL PORTFOLIO REPORT</span>
            <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "#8a6d3b" }}>학생명: {studentName} | 최종 성과보고서 의견</span>
          </div>
        </div>

        {/* 3. 누적 성과 요약 의견 본문 */}
        <div className="report-section" style={{ marginTop: "1rem" }}>
          <div className="section-title-container">
            <span className="section-num" style={{ backgroundColor: "#8a6d3b" }}>3</span>
            <span className="section-title">SGS Learnway 최종 종합 분석 및 멘토 피드백</span>
          </div>

          <div className="coaching-box-container">
            {/* 1) 종합 성취 분석 코멘트 */}
            <div className="coaching-card full-width">
              <div className="coaching-card-title" style={{ backgroundColor: "#f8f5f0", borderLeft: "4px solid #8a6d3b", color: "#8a6d3b" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                  <TrendingUp size={14} /> 💡 멘토 종합 지도 소견 및 관찰 변화 (장문 분석)
                </div>
              </div>
              <div className="coaching-card-body" style={{ whiteSpace: "pre-wrap", lineHeight: "1.6", fontSize: "0.82rem", color: "#333" }}>
                {aiResult.overallAnalysis}
              </div>
            </div>

            {/* 2) 오개념 분석 */}
            <div className="coaching-card" style={{ width: "48%" }}>
              <div className="coaching-card-title" style={{ backgroundColor: "#f8f5f0", borderLeft: "4px solid #8a6d3b", color: "#8a6d3b" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                  <AlertTriangle size={14} /> 🎯 학습성장 핵심 오개념 교정 역사
                </div>
              </div>
              <div className="coaching-card-body" style={{ whiteSpace: "pre-wrap", lineHeight: "1.5", fontSize: "0.78rem", color: "#444" }}>
                {aiResult.conceptAnalysis}
              </div>
            </div>

            {/* 3) 멘토 코칭 가이드 */}
            <div className="coaching-card" style={{ width: "48%" }}>
              <div className="coaching-card-title" style={{ backgroundColor: "#f8f5f0", borderLeft: "4px solid #8a6d3b", color: "#8a6d3b" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                  <MessageSquare size={14} /> ✏️ 추천 지도 노하우 및 가정 동독 지도법
                </div>
              </div>
              <div className="coaching-card-body" style={{ whiteSpace: "pre-wrap", lineHeight: "1.5", fontSize: "0.78rem", color: "#444" }}>
                {aiResult.coachingPrescription}
              </div>
            </div>

            {/* 4) 학생 액션 플랜 */}
            <div className="coaching-card full-width">
              <div className="coaching-card-title" style={{ backgroundColor: "#f8f5f0", borderLeft: "4px solid #8a6d3b", color: "#8a6d3b" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                  <BookOpen size={14} /> 🔥 차기 학기 상급 연계를 위한 핵심 실천 액션 플랜
                </div>
              </div>
              <div className="coaching-card-body" style={{ whiteSpace: "pre-wrap", lineHeight: "1.6", fontSize: "0.8rem", color: "#333" }}>
                {aiResult.actionPlan}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="report-footer" style={{ marginTop: "auto" }}>
          <span>ⓒ Learnway School & SGS입시전략연구소</span>
          <span>Page 2 of 2</span>
        </div>
      </div>
    </div>
  );
};
