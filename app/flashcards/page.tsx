"use client";

import { useState, useEffect } from "react";
import styles from "./flashcards.module.css";

interface Word {
  id: number;
  fr: string;
  en: string;
  type: string;
  gender: string | null;
  features: string;
  key_forms: string;
  example: string;
  cefr: string;
  trap: string;
}

interface GradeResult {
  score?: number;
  corrected?: string;
  used_target_word?: boolean;
  mistakes?: Array<{ original: string; issue: string }>;
  encouragement?: string;
}

const TYPE_COLORS: Record<string, string> = {
  noun: "noun",
  verb: "verb",
  adjective: "adjective",
  adverb: "adverb",
  preposition: "preposition",
  conjunction: "conjunction",
  expression: "expression",
  pronoun: "pronoun",
  determiner: "determiner",
  number: "number",
  other: "other",
};

export default function FlashcardsPage() {
  const [allWords, setAllWords] = useState<Word[]>([]);
  const [filtered, setFiltered] = useState<Word[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");

  const [questionInput, setQuestionInput] = useState("");
  const [sentenceInput, setSentenceInput] = useState("");
  const [questionResponse, setQuestionResponse] = useState("");
  const [sentenceResponse, setSentenceResponse] = useState<GradeResult | null>(
    null
  );
  const [questionLoading, setQuestionLoading] = useState(false);
  const [sentenceLoading, setSentenceLoading] = useState(false);

  // Load vocabulary
  useEffect(() => {
    fetch("/data/vocabulary.json")
      .then((res) => res.json())
      .then((data) => {
        setAllWords(data);
        setFiltered(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load vocabulary:", err);
        setLoading(false);
      });
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if (e.key === "ArrowLeft") navigate(-1);
      if (e.key === "ArrowRight") navigate(1);
      if (e.key === " ") {
        e.preventDefault();
        setIsFlipped(!isFlipped);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isFlipped]);

  const buildFilters = () => {
    const typeOrder = [
      "all",
      "verb",
      "noun",
      "adjective",
      "adverb",
      "preposition",
      "conjunction",
      "expression",
      "pronoun",
      "determiner",
      "number",
      "other",
    ];
    const present = new Set(allWords.map((w) => w.type));
    const types = typeOrder.filter((t) => t === "all" || present.has(t));
    const cefrs = [...new Set(allWords.map((w) => w.cefr))].sort();
    return [...types, ...cefrs];
  };

  const applyFilter = (filter: string) => {
    setActiveFilter(filter);
    setCurrentIndex(0);
    setIsFlipped(false);

    if (filter === "all") {
      setFiltered(allWords);
    } else if (["A1", "A2", "B1", "B2"].includes(filter)) {
      setFiltered(allWords.filter((w) => w.cefr === filter));
    } else {
      setFiltered(allWords.filter((w) => w.type === filter));
    }
  };

  const navigate = (dir: number) => {
    const n = currentIndex + dir;
    if (n < 0 || n >= filtered.length) return;
    setCurrentIndex(n);
    setIsFlipped(false);
    setQuestionInput("");
    setQuestionResponse("");
    setSentenceInput("");
    setSentenceResponse(null);
  };

  const shuffle = () => {
    const shuffled = [...filtered];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setFiltered(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  const submitQuestion = async () => {
    if (!questionInput.trim()) return;

    setQuestionLoading(true);
    setQuestionResponse("");

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: questionInput,
          word: word,
        }),
      });

      const data = await res.json();
      setQuestionResponse(data.response || "No response");
    } catch (err) {
      setQuestionResponse("Error: " + String(err));
    } finally {
      setQuestionLoading(false);
    }
  };

  const submitSentence = async () => {
    if (!sentenceInput.trim()) return;

    setSentenceLoading(true);
    setSentenceResponse(null);

    try {
      const res = await fetch("/api/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sentence: sentenceInput,
          word: word,
        }),
      });

      const data = await res.json();

      let parsed: GradeResult = {};
      try {
        if (typeof data.response === "string") {
          parsed = JSON.parse(data.response);
        } else {
          parsed = data.response;
        }
      } catch (e) {
        parsed = { encouragement: data.response || "No response" };
      }

      setSentenceResponse(parsed);
    } catch (err) {
      setSentenceResponse({
        encouragement: "Error: " + String(err),
      });
    } finally {
      setSentenceLoading(false);
    }
  };

  const renderGradeResult = (result: GradeResult) => {
    if (result.used_target_word === false) {
      return (
        <div style={{ color: "#c27b5a", fontWeight: 500 }}>
          You have not used the target word, try again.
        </div>
      );
    }

    const score = result.score ?? 0;
    const scoreClass =
      score >= 8
        ? styles.scoreHigh
        : score >= 5
          ? styles.scoreMid
          : styles.scoreLow;

    return (
      <div>
        <div className={styles.scoreRow}>
          <span className={`${styles.scoreBadge} ${scoreClass}`}>
            {score}/10
          </span>
        </div>

        {score < 8 && result.corrected && (
          <div className={styles.corrected}>
            <strong>Correction:</strong> {result.corrected}
          </div>
        )}

        {result.mistakes && result.mistakes.length > 0 && (
          <ul className={styles.mistakeList}>
            {result.mistakes.map((m, i) => (
              <li key={i} className={styles.mistakeItem}>
                <strong>{m.original}</strong> — {m.issue}
              </li>
            ))}
          </ul>
        )}

        {result.encouragement && (
          <div className={styles.encouragement}>{result.encouragement}</div>
        )}
      </div>
    );
  };

  if (loading)
    return (
      <div className={styles.container}>
        <div style={{ padding: "2rem" }}>Loading words…</div>
      </div>
    );
  if (filtered.length === 0)
    return (
      <div className={styles.container}>
        <div style={{ padding: "2rem" }}>No words found</div>
      </div>
    );

  const word = filtered[currentIndex];
  const typeKey = (word.type || "other").toLowerCase();
  const accentColor = `var(--${TYPE_COLORS[typeKey] || "other"})`;
  const pct =
    filtered.length > 1 ? (currentIndex / (filtered.length - 1)) * 100 : 100;

  return (
    <div className={styles.container}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=DM+Sans:wght@300;400;500&family=DM+Mono&display=swap"
        rel="stylesheet"
      />

      {/* Header */}
      <header className={styles.header}>
        <div className={styles.logo}>
          Français <span className={styles.logoAccent}>Tutor</span>
        </div>
        <div className={styles.progressWrap}>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className={styles.progressLabel}>
            {currentIndex + 1} / {filtered.length}
          </span>
        </div>
      </header>

      {/* Filter bar */}
      <div className={styles.filterBar}>
        {buildFilters().map((f) => (
          <button
            key={f}
            className={`${styles.filterBtn} ${
              activeFilter === f ? styles.active : ""
            }`}
            onClick={() => applyFilter(f)}
          >
            {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Main content */}
      <main className={styles.main}>
        {/* Card */}
        <div className={styles.cardScene}>
          <div
            className={`${styles.cardInner} ${isFlipped ? styles.flipped : ""}`}
            onClick={() => setIsFlipped(!isFlipped)}
            style={
              {
                "--accent": accentColor,
              } as React.CSSProperties & { "--accent": string }
            }
          >
            {/* Front */}
            <div className={styles.cardFace}>
              <div className={styles.wordRow}>
                <h1 className={styles.wordFr}>{word.fr}</h1>
                <div className={styles.badgeGroup}>
                  <span className={`${styles.badge} ${styles.badgeType}`}>
                    {word.type}
                  </span>
                  {word.gender && word.gender !== "null" && (
                    <span className={`${styles.badge} ${styles.badgeGender}`}>
                      {word.gender}
                    </span>
                  )}
                  <span className={`${styles.badge} ${styles.badgeCefr}`}>
                    {word.cefr}
                  </span>
                </div>
              </div>

              <div className={styles.wordEn}>{word.en}</div>

              <div className={styles.keyForms}>{word.key_forms}</div>

              <div className={styles.exampleSentence}>{word.example}</div>

              <div className={styles.trapBox}>
                <span className={styles.trapIcon}>⚠</span>
                <span>{word.trap}</span>
              </div>

              <div className={styles.featuresRow}>{word.features}</div>

              <div className={styles.flipHint}>
                Click to flip &nbsp;·&nbsp; <kbd>Space</kbd>
              </div>
            </div>

            {/* Back */}
            <div className={`${styles.cardFace} ${styles.cardBack}`}>
              {/* Question panel */}
              <div
                className={styles.qaPanel}
                onClick={(e) => e.stopPropagation()}
              >
                <label className={styles.panelLabel}>
                  Ask a question
                  <span className={styles.panelTag}>Haiku</span>
                </label>
                <div className={styles.qaInputRow}>
                  <input
                    type="text"
                    className={styles.qaInput}
                    value={questionInput}
                    onChange={(e) => setQuestionInput(e.target.value)}
                    placeholder="e.g. When do I use this instead of…"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") submitQuestion();
                    }}
                  />
                  <button
                    className={styles.btnAsk}
                    onClick={submitQuestion}
                    disabled={questionLoading}
                  >
                    {questionLoading ? "…" : "Ask"}
                  </button>
                </div>
                {questionResponse && (
                  <div className={styles.qaAnswer}>{questionResponse}</div>
                )}
              </div>

              {/* Sentence panel */}
              <div
                className={styles.sentencePanel}
                onClick={(e) => e.stopPropagation()}
              >
                <label className={styles.panelLabel}>
                  Write a sentence
                  <span className={styles.panelTag}>Sonnet</span>
                </label>
                <textarea
                  className={styles.sentenceInput}
                  value={sentenceInput}
                  onChange={(e) => setSentenceInput(e.target.value)}
                  placeholder="Écris une phrase en français…"
                  rows={2}
                />
                <button
                  className={styles.btnGrade}
                  onClick={submitSentence}
                  disabled={sentenceLoading}
                >
                  {sentenceLoading ? "…" : "Grade"}
                </button>
                {sentenceResponse && (
                  <div className={styles.gradeResult}>
                    {renderGradeResult(sentenceResponse)}
                  </div>
                )}
              </div>

              <div className={styles.flipHint}>
                Click to flip back &nbsp;·&nbsp; <kbd>Space</kbd>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Navigation */}
      <div className={styles.navControls}>
        <button
          className={styles.navBtn}
          onClick={() => navigate(-1)}
          disabled={currentIndex === 0}
        >
          ← Prev
        </button>
        <div className={styles.navSpacer} />
        <button
          className={`${styles.navBtn} ${styles.btnShuffle}`}
          onClick={shuffle}
        >
          Shuffle
        </button>
        <div className={styles.navSpacer} />
        <button
          className={styles.navBtn}
          onClick={() => navigate(1)}
          disabled={currentIndex === filtered.length - 1}
        >
          Next →
        </button>
      </div>

      {/* Keyboard hint */}
      <div className={styles.kbHint}>
        <kbd>←</kbd> prev &nbsp; <kbd>→</kbd> next &nbsp; <kbd>Space</kbd> flip
      </div>
    </div>
  );
}
