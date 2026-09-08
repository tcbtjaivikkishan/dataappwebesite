"use client";

import { useState, useRef, useEffect } from "react";

interface RemarkCellProps {
  userId: string;
  initialRemark?: string;
  assignee?: string;
  onSaved?: (remark: string) => void;
}

const QUICK_PRESETS = [
  "Callback",
  "Interested",
  "Next crop",
];

export default function RemarkCell({
  userId,
  initialRemark = "",
  assignee,
  onSaved,
}: RemarkCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [remark, setRemark] = useState(initialRemark);
  const [draft, setDraft] = useState(initialRemark);
  const [saving, setSaving] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync when initialRemark changes from props
  useEffect(() => {
    setRemark(initialRemark || "");
    setDraft(initialRemark || "");
  }, [initialRemark]);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  // Close editing when clicking outside
  useEffect(() => {
    if (!isEditing) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsEditing(false);
        setDraft(remark);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isEditing, remark]);

  const handleSave = async (textToSave = draft) => {
    const trimmed = textToSave.trim();
    setSaving(true);
    try {
      const res = await fetch("/api/users/contacted", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          remark: trimmed,
          assignee,
        }),
      });
      if (!res.ok) throw new Error("Failed to save remark");
      setRemark(trimmed);
      setDraft(trimmed);
      setIsEditing(false);
      setSavedFeedback(true);
      setTimeout(() => setSavedFeedback(false), 1800);
      onSaved?.(trimmed);
    } catch (err) {
      console.error("Failed to save remark:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsEditing(false);
      setDraft(remark);
    }
  };

  return (
    <div
      className="remark-cell"
      ref={containerRef}
      onClick={(e) => e.stopPropagation()}
    >
      {isEditing ? (
        <div className="remark-edit-container">
          <div className="remark-input-row">
            <input
              ref={inputRef}
              type="text"
              className="remark-input"
              value={draft}
              placeholder="Short remark..."
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={saving}
              maxLength={80}
            />
            <button
              type="button"
              className="remark-btn-save"
              disabled={saving}
              onClick={() => handleSave()}
            >
              {saving ? "..." : "Save"}
            </button>
            <button
              type="button"
              className="remark-btn-cancel"
              disabled={saving}
              onClick={() => {
                setIsEditing(false);
                setDraft(remark);
              }}
              title="Cancel (Esc)"
            >
              ✕
            </button>
          </div>
          <div className="remark-chips">
            {QUICK_PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                className="remark-chip"
                onClick={() => {
                  setDraft(p);
                  handleSave(p);
                }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      ) : remark ? (
        <div
          className="remark-display"
          onClick={() => {
            setDraft(remark);
            setIsEditing(true);
          }}
          title={`${remark} (Click to edit)`}
        >
          <span className="remark-text">{remark}</span>
          <span className="remark-edit-icon" title="Edit remark">✏️</span>
          {savedFeedback && <span className="remark-saved-badge">✓</span>}
        </div>
      ) : (
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <button
            type="button"
            className="remark-empty-btn"
            onClick={() => {
              setDraft("");
              setIsEditing(true);
            }}
          >
            <span>+</span> Remark
          </button>
          {savedFeedback && <span className="remark-saved-badge">✓</span>}
        </div>
      )}
    </div>
  );
}
