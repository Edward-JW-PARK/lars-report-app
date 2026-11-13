import React, { useState } from "react";
import { BookOpen, Lock } from "lucide-react";

interface AdminKeyGateProps {
  errorMessage: string;
  onSubmit: (key: string) => void;
}

// 학생 평가 데이터(개인정보)를 지키기 위한 관리자 인증 화면.
// 서버의 LARS_ADMIN_KEY 환경변수와 같은 값을 입력하면 API 호출이 통과합니다.
export const AdminKeyGate: React.FC<AdminKeyGateProps> = ({ errorMessage, onSubmit }) => {
  const [value, setValue] = useState("");
  const [localError, setLocalError] = useState("");

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const key = value.trim();
    if (!key) {
      setLocalError("관리자 키를 입력해 주세요.");
      return;
    }
    setLocalError("");
    onSubmit(key);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: "100%",
          maxWidth: "440px",
          background: "var(--card-bg)",
          border: "1px solid rgba(197, 168, 128, 0.35)",
          borderRadius: "18px",
          padding: "2rem",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", color: "var(--accent-gold)" }}>
          <BookOpen size={26} />
          <div>
            <div style={{ fontWeight: 700, fontSize: "1.05rem" }}>Learnway LARS</div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>학습성과 진단 리포트 시스템</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.5rem" }}>
          <Lock size={18} style={{ color: "var(--accent-gold)" }} />
          <strong style={{ fontSize: "1rem" }}>관리자 인증</strong>
        </div>

        <p style={{ margin: 0, fontSize: "0.88rem", lineHeight: 1.6, color: "var(--text-muted)" }}>
          학생 평가 데이터 보호를 위해 관리자 키가 필요합니다.
          <br />
          서버 환경변수 <code style={{ color: "var(--accent-gold)" }}>LARS_ADMIN_KEY</code> 와 같은 값을 입력하세요.
        </p>

        <input
          type="password"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="관리자 키"
          autoFocus
          style={{
            padding: "0.75rem 0.9rem",
            borderRadius: "10px",
            border: "1px solid rgba(197, 168, 128, 0.4)",
            background: "rgba(6, 13, 26, 0.6)",
            color: "var(--text-light)",
            fontSize: "1rem",
          }}
        />

        {(localError || errorMessage) && (
          <p style={{ margin: 0, fontSize: "0.85rem", lineHeight: 1.5, color: "#f87171" }}>{localError || errorMessage}</p>
        )}

        <button
          type="submit"
          style={{
            padding: "0.75rem",
            borderRadius: "10px",
            border: "none",
            background: "var(--accent-gold)",
            color: "#0b1524",
            fontSize: "1rem",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          인증하고 시작하기
        </button>
      </form>
    </div>
  );
};
