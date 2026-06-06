// src/components/InputScreen.tsx
import React, { useState, useEffect } from "react";
import { MATH_BLUEPRINT, ENGLISH_BLUEPRINT, type QuestionMeta } from "../data/blueprintMetadata";
import { ArrowLeft, Save, Check, X } from "lucide-react";

interface InputScreenProps {
  onSave: (data: {
    studentName: string;
    grade: "middle_1" | "middle_2" | "middle_3";
    subject: "math" | "english";
    examType: "사전" | "중간" | "사후";
    mentorName: string;
    mentorNotes: string;
    answers: { [q_idx: number]: boolean };
  }) => void;
  onBack: () => void;
  initialData?: any;
}

export const InputScreen: React.FC<InputScreenProps> = ({ onSave, onBack, initialData }) => {
  const [studentName, setStudentName] = useState("");
  const [grade, setGrade] = useState<"middle_1" | "middle_2" | "middle_3">("middle_1");
  const [subject, setSubject] = useState<"math" | "english">("math");
  const [examType, setExamType] = useState<"사전" | "중간" | "사후">("사전");
  const [mentorName, setMentorName] = useState("");
  const [mentorNotes, setMentorNotes] = useState("");
  const [answers, setAnswers] = useState<{ [q_idx: number]: boolean }>({});

  // Get matching blueprint questions
  const blueprint = subject === "math" ? MATH_BLUEPRINT : ENGLISH_BLUEPRINT;
  const questions: QuestionMeta[] = blueprint[grade] || [];

  // Reset or set answers when grade/subject changes
  useEffect(() => {
    const initialAnswers: { [q_idx: number]: boolean } = {};
    questions.forEach((q) => {
      // If editing existing, keep those. Otherwise default to true (O)
      if (initialData && initialData.grade === grade && initialData.subject === subject) {
        initialAnswers[q.q_idx] = initialData.answers[q.q_idx] !== undefined ? initialData.answers[q.q_idx] : true;
      } else {
        initialAnswers[q.q_idx] = true; // Default all correct (O) for convenience
      }
    });
    setAnswers(initialAnswers);
  }, [grade, subject, questions.length]);

  // Load initial editing data if available
  useEffect(() => {
    if (initialData) {
      setStudentName(initialData.studentName || "");
      setGrade(initialData.grade || "middle_1");
      setSubject(initialData.subject || "math");
      setExamType(initialData.examType || "사전");
      setMentorName(initialData.mentorName || "");
      setMentorNotes(initialData.mentorNotes || "");
      setAnswers(initialData.answers || {});
    }
  }, [initialData]);

  const handleToggleAnswer = (q_idx: number, isCorrect: boolean) => {
    setAnswers((prev) => ({
      ...prev,
      [q_idx]: isCorrect,
    }));
  };

  const handleSetAll = (isCorrect: boolean) => {
    const newAnswers: { [q_idx: number]: boolean } = {};
    questions.forEach((q) => {
      newAnswers[q.q_idx] = isCorrect;
    });
    setAnswers(newAnswers);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim()) {
      alert("학생 이름을 입력해 주세요.");
      return;
    }
    onSave({
      studentName,
      grade,
      subject,
      examType,
      mentorName,
      mentorNotes,
      answers,
    });
  };

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.5rem", color: "var(--accent-gold)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          ✏️ {initialData ? "평가 수정" : "신규 평가 데이터 등록"}
        </h2>
        <button className="btn btn-secondary" onClick={onBack}>
          <ArrowLeft size={16} /> 대시보드 리스트
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Student metadata */}
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="studentName">학생 이름 *</label>
            <input
              type="text"
              id="studentName"
              placeholder="예: 박민건"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="grade">대상 학년</label>
            <select id="grade" value={grade} onChange={(e) => setGrade(e.target.value as any)}>
              <option value="middle_1">중학교 1학년</option>
              <option value="middle_2">중학교 2학년</option>
              <option value="middle_3">중학교 3학년</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="subject">평가 과목</label>
            <select id="subject" value={subject} onChange={(e) => setSubject(e.target.value as any)}>
              <option value="math">수학 (Math)</option>
              <option value="english">영어 (English)</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="examType">평가 회차</label>
            <select id="examType" value={examType} onChange={(e) => setExamType(e.target.value as any)}>
              <option value="사전">사전 평가</option>
              <option value="중간">중간 평가</option>
              <option value="사후">사후 평가</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="mentorName">담당 멘토 이름</label>
            <input
              type="text"
              id="mentorName"
              placeholder="예: 김상우 멘토"
              value={mentorName}
              onChange={(e) => setMentorName(e.target.value)}
            />
          </div>
        </div>

        {/* Mentor notes */}
        <div className="form-group" style={{ marginBottom: "2rem" }}>
          <label htmlFor="mentorNotes">📝 멘토 관찰 메모 (학습 성향 및 행동 관찰)</label>
          <textarea
            id="mentorNotes"
            rows={3}
            placeholder="학생의 성향, 오답 시 행동 특징, 특별 지도 사항 등을 적어주세요. 이 메모는 Claude AI 분석 가이드에 반영됩니다."
            value={mentorNotes}
            onChange={(e) => setMentorNotes(e.target.value)}
          ></textarea>
        </div>

        {/* Question O/X inputs */}
        <div className="questions-section">
          <div className="questions-header">
            <h3 style={{ fontSize: "1.2rem", color: "var(--text-light)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              📊 문항별 채점 입력 (총 {questions.length}문항)
            </h3>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}
                onClick={() => handleSetAll(true)}
              >
                모두 O (맞음)
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}
                onClick={() => handleSetAll(false)}
              >
                모두 X (틀림)
              </button>
            </div>
          </div>

          <div className="question-grid">
            {questions.map((q) => {
              const isCorrect = answers[q.q_idx] !== undefined ? answers[q.q_idx] : true;
              return (
                <div key={q.q_idx} className={`question-card ${isCorrect ? "correct" : "incorrect"}`}>
                  <div className="q-meta-info">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span className="q-num-label">Q {q.q_idx}</span>
                      <div className="q-badge-row">
                        <span className={`badge badge-diff-${q.diff}`}>{q.diff}</span>
                        <span className="badge badge-chapter">{q.ch_name}</span>
                      </div>
                    </div>
                    <div className="q-title-desc" title={q.detail_type}>
                      {q.detail_type}
                    </div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={q.std_desc}>
                      [{q.std_code}] {q.std_desc}
                    </div>
                  </div>

                  <div className="ox-btn-group">
                    <button
                      type="button"
                      className={`ox-btn ox-btn-o ${isCorrect ? "active" : ""}`}
                      onClick={() => handleToggleAnswer(q.q_idx, true)}
                    >
                      <Check size={14} style={{ display: "inline", marginRight: "2px" }} /> O
                    </button>
                    <button
                      type="button"
                      className={`ox-btn ox-btn-x ${!isCorrect ? "active" : ""}`}
                      onClick={() => handleToggleAnswer(q.q_idx, false)}
                    >
                      <X size={14} style={{ display: "inline", marginRight: "2px" }} /> X
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end", borderTop: "1px solid var(--border-color)", paddingTop: "1.5rem" }}>
          <button type="button" className="btn btn-secondary" onClick={onBack}>
            취소
          </button>
          <button type="submit" className="btn btn-primary">
            <Save size={16} /> 평가 결과 저장 및 리포트 조회
          </button>
        </div>
      </form>
    </div>
  );
};
