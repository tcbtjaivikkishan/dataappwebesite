"use client";

import React, { useState } from "react";

interface CopyablePhoneProps {
  phone?: string | null;
  showWhatsApp?: boolean;
  className?: string;
}

export function formatWhatsAppNumber(phone?: string | null): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) return `91${digits.slice(1)}`;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  if (digits.length > 10) return `91${digits.slice(-10)}`;
  return digits;
}

export default function CopyablePhone({
  phone,
  showWhatsApp = true,
  className = "",
}: CopyablePhoneProps) {
  const [copied, setCopied] = useState(false);

  if (!phone) {
    return <span style={{ color: "var(--text-muted)" }}>—</span>;
  }

  const cleanPhone = phone.trim();
  const waNumber = formatWhatsAppNumber(cleanPhone);
  const waUrl = waNumber ? `https://wa.me/${waNumber}` : null;

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(cleanPhone);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = cleanPhone;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy phone number:", err);
    }
  };

  const handleNumberClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // If text was selected by drag, do not trigger copy
    const selection = window.getSelection()?.toString();
    if (!selection) {
      handleCopy(e);
    }
  };

  return (
    <div
      className={`phone-cell-wrapper ${className}`}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <span
        className="phone-number-display"
        onClick={handleNumberClick}
        title="Click to copy number"
      >
        {cleanPhone}
      </span>

      <div className="phone-actions">
        {/* Copy button */}
        <button
          type="button"
          className={`phone-action-btn copy-btn ${copied ? "copied" : ""}`}
          onClick={handleCopy}
          title={copied ? "Copied to clipboard!" : "Copy phone number"}
          aria-label="Copy phone number"
        >
          {copied ? (
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          )}
          {copied && <span className="copy-tooltip">Copied!</span>}
        </button>

        {/* Direct WhatsApp Chat button */}
        {showWhatsApp && waUrl && (
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="phone-action-btn whatsapp-btn"
            onClick={(e) => e.stopPropagation()}
            title="Chat on WhatsApp"
            aria-label="Chat on WhatsApp"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
            </svg>
          </a>
        )}
      </div>
    </div>
  );
}
