import React, { useRef } from 'react';

// ==========================================
// 1. TYPE DEFINITIONS & INTERFACES (App.tsx와 완전 호환되도록 수정)
// ==========================================
export interface Evaluation {
  id: string;
  studentName: string;
  grade: string | any; // App.tsx의 유니온 타입과 호환되도록 허용
  subject: string | any; // App.tsx의 유니온 타입과 호환되도록 허용
  examType: string;
  mentorName: string;
  mentorNotes: string;
  answers: { [key: string]: any } | any; // { [q_idx: number]: boolean } 과도 유연하게 호환
  date: string;
  aiResult?: {
    isOutcomeReport?: boolean;
    overallAnalysis: string;
    conceptAnalysis: string;
    coachingPrescription: string;
    actionPlan: string;
  };
}

interface DashboardScreenProps {
  evaluations: any[]; // App.tsx의 Evaluation[] 배열과 유연한 매핑을 위해 any[] 또는 해당 타입 허용
  onAddNew: () => void;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  isGeneratingAI: boolean;
  onGenerateFinalOutcome: (studentName: string, grade: any, subject: any) => Promise<void>; // grade, subject 타입을 any로 유연화하여 호환성 확보
}

// ==========================================
// 2. HELPER FUNCTIONS
// ==========================================
const getSubjectLabel = (subject: string): string => {
  const mapping: { [key: string]: string } = {
    math: '수학',
    english: '영어',
    korean: '국어',
    science: '과학',
  };
  return mapping[subject] || subject;
};

const getGradeLabel = (grade: string): string => {
  const mapping: { [key: string]: string } = {
    'm1': '중등 1학년',
    'm2': '중등 2학년',
    'm3': '중등 3학년',
    'middle_1': '중등 1학년',
    'middle_2': '중등 2학년',
    'middle_3': '중등 3학년',
    'h1': '고등 1학년',
    'h2': '고등 2학년',
    'h3': '고등 3학년',
  };
  return mapping[grade] || grade;
};

// 회차별 성적 계산 및 통계 추출
const calculateReportStats = (studentEvals: any[]) => {
  // 사전, 중간, 사후로 분류
  const preEval = studentEvals.find(e => e.examType === '사전' || e.examType === '1회차');
  const midEval = studentEvals.find(e => e.examType === '중간' || e.examType === '2회차');
  const postEval = studentEvals.find(e => e.examType === '사후' || e.examType === '3회차');

  const getScore = (evalItem?: any) => {
    if (!evalItem || !evalItem.answers) return null;
    const total = Object.keys(evalItem.answers).length;
    if (total === 0) return 0;
    
    // answers의 키값(문항)의 벨류가 참('O', '정답', true)인 문항들의 수 계산
    const correct = Object.values(evalItem.answers).filter(v => v === 'O' || v === '정답' || v === true).length;
    return Math.round((correct / total) * 100);
  };

  const preScore = getScore(preEval);
  const midScore = getScore(midEval);
  const postScore = getScore(postEval);

  // 성장도 계산 (사후 - 사전)
  let growth = 0;
  if (postScore !== null && preScore !== null) {
    growth = postScore - preScore;
  }

  return {
    preEval,
    midEval,
    postEval,
    preScore,
    midScore,
    postScore,
    growth
  };
};

// ==========================================
// 3. MAIN COMPONENT
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
  // 화면 모드 상태: 'list' (대시보드 목록) 또는 'outcome' (최종 성과결과 리포트 상세 인쇄 뷰)
  const [viewMode, setViewMode] = React.useState<'list' | 'outcome'>('list');
  const [selectedGroup, setSelectedGroup] = React.useState<{ studentName: string; grade: any; subject: any } | null>(null);

  const printAreaRef = useRef<HTMLDivElement>(null);

  // 학생별 그룹화 처리 (이름, 학년, 과목 기준)
  const groupedEvaluations = React.useMemo(() => {
    const groups: { [key: string]: any[] } = {};
    evaluations.forEach((item) => {
      const key = `${item.studentName}_${item.grade}_${item.subject}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });
    return groups;
  }, [evaluations]);

  // 성과보고서 발행을 트리거하는 함수
  const handleLaunchOutcomeReport = async (studentName: string, grade: any, subject: any) => {
    setSelectedGroup({ studentName, grade, subject });
    const key = `${studentName}_${grade}_${subject}`;
    const groupEvals = groupedEvaluations[key] || [];
    
    // 가장 최신 회차의 AI 성과보고서 데이터 유무 판별
    const sorted = [...groupEvals].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const latestEval = sorted[0];
    const hasValidOutcomeAI = latestEval?.aiResult?.isOutcomeReport && latestEval?.aiResult?.overallAnalysis;

    if (!hasValidOutcomeAI) {
      // 분석 데이터가 없거나 무효한 경우 새로 생성 호출
      try {
        await onGenerateFinalOutcome(studentName, grade, subject);
      } catch (err) {
        console.error("AI 성과 정밀 분석 생성 중 오류 발생:", err);
      }
    }
    setViewMode('outcome');
  };

  // 인쇄 처리 함수
  const handlePrintFinalReport = () => {
    const printContent = printAreaRef.current?.innerHTML;
    if (!printContent) return;

    const originalBody = document.body.innerHTML;
    const originalStyle = document.body.style.cssText;

    document.body.innerHTML = `
      <style>
        @media print {
          body {
            margin: 0;
            padding: 0;
            background: #fff;
          }
          .a4-page {
            width: 210mm;
            height: 296mm;
            page-break-after: always;
            box-sizing: border-box;
            padding: 20mm 15mm !important;
            margin: 0 auto !important;
            box-shadow: none !important;
            border: none !important;
            position: relative;
            overflow: hidden;
          }
          .no-print {
            display: none !important;
          }
        }
      </style>
      <div style="background-color: #f3f4f6; padding: 20px 0;" class="no-print">
        <div style="max-width: 800px; margin: 0 auto; text-align: center;">
          <p style="margin-bottom: 10px; font-weight: bold; color: #1f2937;">PDF 인쇄 설정 안내</p>
          <p style="font-size: 13px; color: #4b5563; line-height: 1.5;">
            배경 그래픽 인쇄를 <strong>[켬/활성화]</strong> 해주시고, 머리글/바닥글 옵션은 <strong>[해제]</strong> 해주셔야 템플릿의 색상과 여백이 온전히 인쇄됩니다.
          </p>
        </div>
      </div>
      <div>${printContent}</div>
    `;

    window.print();
    // 원래 상태로 즉시 복구
    document.body.innerHTML = originalBody;
    document.body.style.cssText = originalStyle;
    window.location.reload(); 
  };

  if (viewMode === 'outcome' && selectedGroup) {
    const { studentName, grade, subject } = selectedGroup;
    const key = `${studentName}_${grade}_${subject}`;
    const groupEvals = groupedEvaluations[key] || [];

    // 회차별 데이터 분석 바인딩
    const {
      preEval,
      midEval,
      postEval,
      preScore,
      midScore,
      postScore,
      growth
    } = calculateReportStats(groupEvals);

    const sorted = [...groupEvals].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const latestEval = sorted[0];
    const aiResult = latestEval?.aiResult;

    return (
      <div className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8">
        {/* 상단 컨트롤 바 */}
        <div className="max-w-[210mm] mx-auto mb-6 flex justify-between items-center bg-white p-4 rounded-lg shadow-sm">
          <button
            onClick={() => setViewMode('list')}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm font-medium transition"
          >
            ← 대시보드 목록으로
          </button>
          <div className="flex gap-2">
            {!aiResult?.isOutcomeReport && (
              <button
                onClick={() => handleLaunchOutcomeReport(studentName, grade, subject)}
                disabled={isGeneratingAI}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-sm font-medium transition disabled:bg-indigo-300"
              >
                {isGeneratingAI ? 'AI 성과 분석중...' : '🔄 AI 성과 재분석 실행'}
              </button>
            )}
            <button
              onClick={handlePrintFinalReport}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-sm font-medium transition"
            >
              🖨 리포트 PDF 출력 / 인쇄
            </button>
          </div>
        </div>

        {/* =========================================================================
            최종 성과결과 리포트 출력 뷰 영역 (A4 규격 강제 매칭 2페이지)
            ========================================================================= */}
        <div ref={printAreaRef} className="flex flex-col items-center gap-8">
          
          {/* ----------------------------------------------------
              PAGE 1: 성취 추이 및 회차별 성적 대조표 (LARS 6.pdf 형식)
              ---------------------------------------------------- */}
          <div className="a4-page bg-white shadow-lg border border-gray-200" style={{ width: '210mm', height: '296mm', padding: '20mm 15mm', boxSizing: 'border-box', position: 'relative' }}>
            
            {/* 상단 헤더 영역 */}
            <div className="flex justify-between items-start border-b-2 border-indigo-900 pb-4 mb-6">
              <div>
                <span className="bg-indigo-900 text-white text-xs px-2 py-1 rounded font-bold mr-2">SGS LEARNWAY</span>
                <h1 className="text-2xl font-black text-gray-950 inline-block align-middle">학습성과 진단 종합 리포트</h1>
                <p className="text-xs text-gray-500 mt-1">Learnway Achievement Analysis Report System (LARS)</p>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-indigo-950 block bg-indigo-50 px-2 py-1 rounded">최종 성장 리포트</span>
                <span className="text-xs text-gray-400 block mt-1">발행일: {latestEval?.date || '-'}</span>
              </div>
            </div>

            {/* 학생 인적 정보 카드 */}
            <div className="grid grid-cols-4 gap-4 bg-gray-50 p-4 rounded-lg mb-6 border border-gray-200">
              <div className="text-center border-r border-gray-200">
                <span className="text-xs text-gray-400 block">학생명</span>
                <span className="font-bold text-gray-800 text-sm">{studentName}</span>
              </div>
              <div className="text-center border-r border-gray-200">
                <span className="text-xs text-gray-400 block">대상 학년</span>
                <span className="font-bold text-gray-800 text-sm">{getGradeLabel(grade)}</span>
              </div>
              <div className="text-center border-r border-gray-200">
                <span className="text-xs text-gray-400 block">진단 과목</span>
                <span className="font-bold text-gray-800 text-sm">{getSubjectLabel(subject)}</span>
              </div>
              <div className="text-center">
                <span className="text-xs text-indigo-500 font-bold block">학습 성장도</span>
                <span className="font-black text-indigo-600 text-sm">+{growth} %p</span>
              </div>
            </div>

            {/* ① 학업 성취 점수 추이 및 성장 곡선 */}
            <div className="mb-6">
              <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center">
                <span className="w-1.5 h-3.5 bg-indigo-900 rounded-sm mr-2 inline-block"></span>
                ① 학업 성취 점수 추이 및 성장 곡선
              </h3>
              <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col items-center">
                
                {/* SVG 성장 곡선 그래프 */}
                <div className="w-full max-w-[400px] h-[150px] relative mb-3">
                  <svg viewBox="0 0 300 120" className="w-full h-full">
                    {/* 격자선 */}
                    <line x1="20" y1="10" x2="280" y2="10" stroke="#f0f0f0" strokeWidth="1" />
                    <line x1="20" y1="50" x2="280" y2="50" stroke="#f0f0f0" strokeWidth="1" />
                    <line x1="20" y1="90" x2="280" y2="90" stroke="#e0e0e0" strokeWidth="1" strokeDasharray="3,3" />
                    <line x1="20" y1="110" x2="280" y2="110" stroke="#ccc" strokeWidth="1" />

                    {/* 축 가이드 텍스트 */}
                    <text x="12" y="15" fill="#aaa" fontSize="6" textAnchor="end">100</text>
                    <text x="12" y="55" fill="#aaa" fontSize="6" textAnchor="end">50</text>
                    <text x="12" y="113" fill="#aaa" fontSize="6" textAnchor="end">0</text>

                    {/* 회차 표기 */}
                    <text x="50" y="118" fill="#666" fontSize="7" textAnchor="middle" fontWeight="bold">사전 (1회차)</text>
                    <text x="150" y="118" fill="#666" fontSize="7" textAnchor="middle" fontWeight="bold">중간 (2회차)</text>
                    <text x="250" y="118" fill="#666" fontSize="7" textAnchor="middle" fontWeight="bold">사후 (3회차)</text>

                    {/* 라인 렌더링 */}
                    {preScore !== null && postScore !== null && (
                      <line
                        x1="50"
                        y1={110 - (preScore / 100) * 100}
                        x2="250"
                        y2={110 - (postScore / 100) * 100}
                        stroke="#6366f1"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                    )}
                    {preScore !== null && midScore !== null && (
                      <line
                        x1="50"
                        y1={110 - (preScore / 100) * 100}
                        x2="150"
                        y2={110 - (midScore / 100) * 100}
                        stroke="#818cf8"
                        strokeWidth="2.5"
                      />
                    )}
                    {midScore !== null && postScore !== null && (
                      <line
                        x1="150"
                        y1={110 - (midScore / 100) * 100}
                        x2="250"
                        y2={110 - (postScore / 100) * 100}
                        stroke="#4f46e5"
                        strokeWidth="2.5"
                      />
                    )}

                    {/* 사전 데이터 포인트 */}
                    {preScore !== null && (
                      <g>
                        <circle cx="50" cy={110 - (preScore / 100) * 100} r="5" fill="#818cf8" stroke="#fff" strokeWidth="1.5" />
                        <text x="50" y={110 - (preScore / 100) * 100 - 8} fill="#4f46e5" fontSize="8" fontWeight="black" textAnchor="middle">{preScore}점</text>
                      </g>
                    )}

                    {/* 중간 데이터 포인트 */}
                    {midScore !== null && (
                      <g>
                        <circle cx="150" cy={110 - (midScore / 100) * 100} r="5" fill="#4f46e5" stroke="#fff" strokeWidth="1.5" />
                        <text x="150" y={110 - (midScore / 100) * 100 - 8} fill="#4338ca" fontSize="8" fontWeight="black" textAnchor="middle">{midScore}점</text>
                      </g>
                    )}

                    {/* 사후 데이터 포인트 */}
                    {postScore !== null && (
                      <g>
                        <circle cx="250" cy={110 - (postScore / 100) * 100} r="5" fill="#312e81" stroke="#fff" strokeWidth="1.5" />
                        <text x="250" y={110 - (postScore / 100) * 100 - 8} fill="#1e1b4b" fontSize="8" fontWeight="black" textAnchor="middle">{postScore}점</text>
                      </g>
                    )}
                  </svg>
                </div>

                <div className="w-full grid grid-cols-3 gap-2 text-center bg-indigo-50/50 p-2.5 rounded border border-indigo-100">
                  <div>
                    <span className="text-[10px] text-gray-500 block">사전 평가 성적</span>
                    <span className="text-sm font-extrabold text-gray-700">{preScore !== null ? `${preScore}점` : '미응시'}</span>
                  </div>
                  <div className="border-x border-indigo-100">
                    <span className="text-[10px] text-gray-500 block">중간 평가 성적</span>
                    <span className="text-sm font-extrabold text-gray-700">{midScore !== null ? `${midScore}점` : '미응시'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-indigo-500 block">사후 평가 성적</span>
                    <span className="text-sm font-extrabold text-indigo-900">{postScore !== null ? `${postScore}점` : '미응시'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ② 회차별 문항 성적 대조표 */}
            <div className="mb-4">
              <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center">
                <span className="w-1.5 h-3.5 bg-indigo-900 rounded-sm mr-2 inline-block"></span>
                ② 회차별 문항 성적 대조표
              </h3>
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200 text-xs">
                  <thead className="bg-indigo-900 text-white text-center">
                    <tr>
                      <th className="py-2 px-1 font-bold border-r border-indigo-800">평가 구분</th>
                      {Array.from({ length: 15 }, (_, i) => (
                        <th key={i} className="py-2 px-0.5 border-r border-indigo-800 font-bold">{i + 1}번</th>
                      ))}
                      <th className="py-2 px-1 font-bold">득점 / 총점</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 text-center font-medium">
                    {/* 사전 평가 행 */}
                    <tr className="bg-white">
                      <td className="py-2 font-bold text-gray-700 border-r border-gray-200">사전 (1회차)</td>
                      {Array.from({ length: 15 }, (_, i) => {
                        const ans = preEval?.answers?.[`q${i + 1}`] ?? preEval?.answers?.[i + 1];
                        const isO = ans === 'O' || ans === '정답' || ans === true;
                        return (
                          <td key={i} className={`py-2 border-r border-gray-100 font-extrabold ${isO ? 'text-blue-600' : 'text-red-500'}`}>
                            {ans !== undefined ? (isO ? 'O' : 'X') : '-'}
                          </td>
                        );
                      })}
                      <td className="py-2 font-bold text-gray-800">
                        {preEval ? `${Object.values(preEval.answers).filter(v => v === 'O' || v === '정답' || v === true).length} / ${Object.keys(preEval.answers).length}` : '-'}
                      </td>
                    </tr>
                    {/* 중간 평가 행 */}
                    <tr className="bg-gray-50/50">
                      <td className="py-2 font-bold text-gray-700 border-r border-gray-200">중간 (2회차)</td>
                      {Array.from({ length: 15 }, (_, i) => {
                        const ans = midEval?.answers?.[`q${i + 1}`] ?? midEval?.answers?.[i + 1];
                        const isO = ans === 'O' || ans === '정답' || ans === true;
                        return (
                          <td key={i} className={`py-2 border-r border-gray-100 font-extrabold ${isO ? 'text-blue-600' : 'text-red-500'}`}>
                            {ans !== undefined ? (isO ? 'O' : 'X') : '-'}
                          </td>
                        );
                      })}
                      <td className="py-2 font-bold text-gray-800">
                        {midEval ? `${Object.values(midEval.answers).filter(v => v === 'O' || v === '정답' || v === true).length} / ${Object.keys(midEval.answers).length}` : '-'}
                      </td>
                    </tr>
                    {/* 사후 평가 행 */}
                    <tr className="bg-white">
                      <td className="py-2 font-bold text-indigo-900 border-r border-gray-200">사후 (3회차)</td>
                      {Array.from({ length: 15 }, (_, i) => {
                        const ans = postEval?.answers?.[`q${i + 1}`] ?? postEval?.answers?.[i + 1];
                        const isO = ans === 'O' || ans === '정답' || ans === true;
                        return (
                          <td key={i} className={`py-2 border-r border-gray-100 font-extrabold ${isO ? 'text-blue-600' : 'text-red-500'}`}>
                            {ans !== undefined ? (isO ? 'O' : 'X') : '-'}
                          </td>
                        );
                      })}
                      <td className="py-2 font-black text-indigo-900">
                        {postEval ? `${Object.values(postEval.answers).filter(v => v === 'O' || v === '정답' || v === true).length} / ${Object.keys(postEval.answers).length}` : '-'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 페이지 1 하단 푸터 표식 */}
            <div className="absolute bottom-6 left-15 right-15 flex justify-between items-center text-[10px] text-gray-400 border-t border-gray-100 pt-2" style={{ left: '15mm', right: '15mm' }}>
              <span>SGS Learnway Academy Analysis System</span>
              <span className="font-bold">PAGE 1 / 2</span>
            </div>

          </div>

          {/* ----------------------------------------------------
              PAGE 2: AI 성과 정밀 분석 및 멘토 추천 처방 (LARS 6.pdf 형식)
              ---------------------------------------------------- */}
          <div className="a4-page bg-white shadow-lg border border-gray-200" style={{ width: '210mm', height: '296mm', padding: '20mm 15mm', boxSizing: 'border-box', position: 'relative' }}>
            
            {/* 상단 미니 헤더 */}
            <div className="flex justify-between items-center border-b border-indigo-900 pb-2 mb-4">
              <span className="text-xs font-black text-indigo-900">LEARNWAY LARS 종합 분석</span>
              <span className="text-[10px] text-gray-400">발행 대상: {studentName} 학생</span>
            </div>

            <div className="mb-4">
              <h2 className="text-base font-black text-indigo-950 flex items-center">
                <span className="w-2 h-4 bg-indigo-900 rounded-sm mr-2"></span>
                ③ 시계열 누적 성과 종합 피드백
              </h2>
              <p className="text-[11px] text-gray-500 mt-0.5">3회차 누적 진단 빅데이터와 인공지능이 분석한 성과 분석 및 추천 지도 로드맵입니다.</p>
            </div>

            {/* 정성 분석 카드 영역 (1단 세로 수직 배열 통합) */}
            <div className="space-y-4">
              
              {/* Card 1: 💡 멘토 종합 지도 소견 */}
              <div className="bg-gradient-to-r from-indigo-50/70 to-blue-50/30 p-4 rounded-lg border border-indigo-100/80">
                <h4 className="text-xs font-bold text-indigo-950 mb-2 flex items-center">
                  <span className="mr-1.5 text-sm">💡</span> 멘토 종합 지도 소견
                </h4>
                <p className="text-[11px] text-gray-700 leading-relaxed text-justify whitespace-pre-line" style={{ maxHeight: '110px', overflowY: 'hidden' }}>
                  {aiResult?.overallAnalysis || "학습 성과를 분석하고 있습니다. AI 정밀 분석 버튼을 눌러 결과보고서를 자동 생성하세요."}
                </p>
              </div>

              {/* Card 2: 🎯 학습성장 핵심 오개념 교정 역사 */}
              <div className="bg-gradient-to-r from-emerald-50/70 to-teal-50/30 p-4 rounded-lg border border-emerald-100/80">
                <h4 className="text-xs font-bold text-emerald-950 mb-2 flex items-center">
                  <span className="mr-1.5 text-sm">🎯</span> 학습성장 핵심 오개념 교정 역사
                </h4>
                <p className="text-[11px] text-gray-700 leading-relaxed text-justify whitespace-pre-line" style={{ maxHeight: '110px', overflowY: 'hidden' }}>
                  {aiResult?.conceptAnalysis || "성장 과정의 핵심 개념 진단 이력을 대입 중입니다."}
                </p>
              </div>

              {/* Card 3: ✏ 추천 지도 노하우 및 가정 연계 지도법 */}
              <div className="bg-gradient-to-r from-amber-50/70 to-orange-50/30 p-4 rounded-lg border border-amber-100/80">
                <h4 className="text-xs font-bold text-amber-950 mb-2 flex items-center">
                  <span className="mr-1.5 text-sm">✏</span> 추천 지도 노하우 및 가정 연계 지도법
                </h4>
                <p className="text-[11px] text-gray-700 leading-relaxed text-justify whitespace-pre-line" style={{ maxHeight: '110px', overflowY: 'hidden' }}>
                  {aiResult?.coachingPrescription || "개선 맞춤 처방 및 학부모 가이드를 연동 중입니다."}
                </p>
              </div>

              {/* Card 4: 📋 실천 액션 플랜 */}
              <div className="bg-gradient-to-r from-purple-50/70 to-fuchsia-50/30 p-4 rounded-lg border border-purple-100/80">
                <h4 className="text-xs font-bold text-purple-950 mb-2 flex items-center">
                  <span className="mr-1.5 text-sm">📋</span> 실천 액션 플랜
                </h4>
                <p className="text-[11px] text-gray-700 leading-relaxed text-justify whitespace-pre-line" style={{ maxHeight: '110px', overflowY: 'hidden' }}>
                  {aiResult?.actionPlan || "행동 교정 실천 플랜을 수립하고 있습니다."}
                </p>
              </div>

            </div>

            {/* 하단 서명 및 기관 표기 영역 */}
            <div className="mt-8 pt-4 border-t border-gray-100 flex justify-between items-center">
              <div>
                <p className="text-[10px] text-gray-400">Student Achievement Diagnosis System</p>
                <p className="text-xs font-bold text-indigo-950 mt-1">SGS 스카이 교육사업부 & Learnway 연구소 개발팀</p>
              </div>
              <div className="text-right flex items-center gap-2">
                <div className="text-right">
                  <span className="text-[9px] text-gray-400 block">진단 책임 지도 멘토</span>
                  <span className="text-xs font-black text-gray-800">{latestEval?.mentorName || '대표 멘토'} (인)</span>
                </div>
                <div className="w-10 h-10 border border-indigo-200 rounded-full flex items-center justify-center bg-indigo-50 font-bold text-[10px] text-indigo-900">
                  직인
                </div>
              </div>
            </div>

            {/* 페이지 2 하단 푸터 표식 */}
            <div className="absolute bottom-6 left-15 right-15 flex justify-between items-center text-[10px] text-gray-400 border-t border-gray-100 pt-2" style={{ left: '15mm', right: '15mm' }}>
              <span>SGS Learnway Academy Analysis System</span>
              <span className="font-bold">PAGE 2 / 2</span>
            </div>

          </div>

        </div>
      </div>
    );
  }

  // ==========================================
  // 4. DEFAULT COMPONENT: LIST VIEW (대시보드 목록)
  // ==========================================
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-extrabold text-gray-900">SGS Learnway 평가 관리 및 AI 성과보고서 대시보드</h2>
          <p className="text-xs text-gray-500 mt-1">학생별로 회차 누적 평가 성적 추이를 모니터링하고 최종 학습성과 진단 종합 리포트를 발행할 수 있습니다.</p>
        </div>
        <button
          onClick={onAddNew}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-sm font-semibold transition"
        >
          ➕ 새 진단 평가 등록
        </button>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left font-bold text-gray-700">대상 학생 정보</th>
              <th className="px-6 py-3 text-left font-bold text-gray-700">진단 과목</th>
              <th className="px-6 py-3 text-left font-bold text-gray-700">누적 회차수</th>
              <th className="px-6 py-3 text-left font-bold text-gray-700">성장도 점수 변화</th>
              <th className="px-6 py-3 text-center font-bold text-gray-700">최종 종합 분석</th>
              <th className="px-6 py-3 text-center font-bold text-gray-700">관리 / 상세 행동</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {Object.keys(groupedEvaluations).length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-gray-400">
                  등록된 평가 내역이 없습니다. 새 진단 평가를 먼저 등록해 주세요.
                </td>
              </tr>
            ) : (
              Object.entries(groupedEvaluations).map(([key, list]) => {
                const firstItem = list[0];
                const { preScore, midScore, postScore, growth } = calculateReportStats(list);
                
                // 최신 데이터 기준 정렬
                const sorted = [...list].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                const latestEval = sorted[0];
                const hasValidOutcomeAI = latestEval?.aiResult?.isOutcomeReport && latestEval?.aiResult?.overallAnalysis;

                return (
                  <tr key={key} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900">{firstItem.studentName}</div>
                      <div className="text-xs text-gray-500">{getGradeLabel(firstItem.grade)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-indigo-50 text-indigo-800 text-xs font-bold px-2.5 py-1 rounded">
                        {getSubjectLabel(firstItem.subject)}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-semibold text-gray-700">
                      총 {list.length}회차 등록됨
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-gray-600">
                        {preScore !== null ? `${preScore}점` : '-'} → {midScore !== null ? `${midScore}점` : '-'} → {postScore !== null ? `${postScore}점` : '-'}
                      </div>
                      <div className="text-xs font-black text-indigo-600 mt-0.5">
                        성장도: +{growth} %p
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleLaunchOutcomeReport(firstItem.studentName, firstItem.grade, firstItem.subject)}
                        disabled={isGeneratingAI}
                        className={`px-3 py-1.5 rounded text-xs font-bold transition ${
                          hasValidOutcomeAI 
                          ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800' 
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                        }`}
                      >
                        {hasValidOutcomeAI ? '✅ 종합 리포트 보기' : (isGeneratingAI ? '⚡ 분석 생성중...' : '📈 AI 성과 정밀분석')}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center gap-1.5">
                        <button
                          onClick={() => onView(latestEval.id)}
                          className="px-2.5 py-1 text-xs border border-gray-300 text-gray-700 rounded hover:bg-gray-100"
                        >
                          조회
                        </button>
                        <button
                          onClick={() => onEdit(latestEval.id)}
                          className="px-2.5 py-1 text-xs border border-blue-300 text-blue-700 rounded hover:bg-blue-50"
                        >
                          수정
                        </button>
                        <button
                          onClick={() => onDelete(latestEval.id)}
                          className="px-2.5 py-1 text-xs border border-red-300 text-red-700 rounded hover:bg-red-50"
                        >
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
