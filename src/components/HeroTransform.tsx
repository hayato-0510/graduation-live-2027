import { useEffect, useRef, useState } from "react";
import "./HeroTransform.css";

/**
 * ファーストビューのロゴ変形（タップ駆動版）。
 *
 * 通常は高専祭の collage ロゴが静止して表示される。ロゴを
 * タップ／クリックした人だけ、帯に裂けて recollage ロゴへ
 * 組み替わるアニメーション（約1.9秒）が再生される。
 * 気づいた人だけ変わる、隠し要素としての位置づけ。
 *
 * - 変形は一方向。完了したらそのセッションの間は最終状態に
 *   固定される（sessionStorage）。ロゴ下のボタンで再演できる。
 * - 開催の約1.5週間前（2027-02-24）以降は、最初から
 *   recollage ロゴを常時表示する。
 * - prefers-reduced-motion の端末では変形後の静止画。
 */

const SLICES = 6;
const STORAGE_KEY = "recollage-hero-seen";
const LIVE_LOGO_DATE = "2027-02-24T00:00:00+09:00";
const DURATION = 1900;

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

function phase(progress: number, from: number, to: number): number {
  return clamp01((progress - from) / (to - from));
}

function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

interface Props {
  fesLogoSrc: string;
  recollageLogoSrc: string;
  dateLabel: string;
  venue: string;
}

type Mode = "fes" | "anim" | "done";

export default function HeroTransform({
  fesLogoSrc,
  recollageLogoSrc,
  dateLabel,
  venue,
}: Props) {
  const [mode, setMode] = useState<Mode>("fes");
  const [progress, setProgress] = useState(0);
  const rafRef = useRef(0);

  useEffect(() => {
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    let seen = false;
    try {
      seen = window.sessionStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      seen = false;
    }
    const livePeriod = new Date() >= new Date(LIVE_LOGO_DATE);
    if (reduced || seen || livePeriod) {
      setProgress(1);
      setMode("done");
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const play = () => {
    if (mode === "anim") return;
    setMode("anim");
    setProgress(0);
    const start = performance.now();
    const tick = (now: number) => {
      const t = clamp01((now - start) / DURATION);
      setProgress(easeInOut(t));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setProgress(1);
        setMode("done");
        try {
          window.sessionStorage.setItem(STORAGE_KEY, "1");
        } catch {
          /* sessionStorage が使えない環境では何もしない */
        }
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  const replay = () => {
    try {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* 何もしない */
    }
    play();
  };

  if (mode === "done") {
    return (
      <section className="hero-static" aria-label="recollage">
        <div
          className="hero-stage hero-stage--final"
          style={{ position: "relative" }}
        >
          <div className="hero-final-logo" style={{ opacity: 1 }}>
            <img src={recollageLogoSrc} alt="recollage" />
          </div>
        </div>
        <div className="hero-meta" style={{ opacity: 1 }}>
          <p className="dates">{dateLabel}</p>
          <p className="venue">{venue}</p>
          <button type="button" className="hero-replay" onClick={replay}>
            ロゴの変形をもう一度見る
          </button>
        </div>
      </section>
    );
  }

  // 裂けの進行（0〜0.55）と色抜け
  const tear = phase(progress, 0, 0.55);
  const saturate = 1 - 0.9 * phase(progress, 0.35, 0.75);
  // 高専祭ロゴの退場 / recollage ロゴの登場
  const fesOpacity = 1 - phase(progress, 0.58, 0.85);
  const finalOpacity = phase(progress, 0.62, 0.92);
  const finalShift = (1 - finalOpacity) * 36;
  const metaOpacity = phase(progress, 0.8, 0.97);

  return (
    <section className="hero-static" aria-label="recollage">
      <div
        className="hero-stage hero-stage--fes"
        role="button"
        tabIndex={0}
        aria-label="ロゴをタップすると変形します"
        onClick={play}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            play();
          }
        }}
        style={{ cursor: mode === "fes" ? "pointer" : "default" }}
      >
        {/* height:100% が無いとラッパーの高さが 0 になり、%指定の
            スライスと画像が全部潰れて collage ロゴが描画されない */}
        <div
          style={{
            opacity: fesOpacity,
            filter: `saturate(${saturate})`,
            height: "100%",
          }}
        >
          {Array.from({ length: SLICES }, (_, i) => {
            const dir = i % 2 === 0 ? -1 : 1;
            const mag = 16 + ((i * 37) % 44);
            const shift = dir * mag * tear;
            return (
              <div
                key={i}
                className="hero-slice"
                style={{
                  height: `${100 / SLICES}%`,
                  transform: `translateX(${shift}px)`,
                }}
              >
                <img
                  src={fesLogoSrc}
                  alt=""
                  style={{ top: `${-i * 100}%` }}
                  draggable={false}
                />
              </div>
            );
          })}
        </div>
        <div
          className="hero-final-logo"
          style={{
            opacity: finalOpacity,
            transform: `translateX(${finalShift}px)`,
            aspectRatio: "1835 / 760",
            top: "12%",
            bottom: "12%",
          }}
        >
          <img src={recollageLogoSrc} alt="" draggable={false} />
        </div>
      </div>
      <div
        className="hero-meta"
        style={{ opacity: metaOpacity, color: "#211D15" }}
      >
        <p className="dates">{dateLabel}</p>
        <p className="venue">{venue}</p>
      </div>
    </section>
  );
}
