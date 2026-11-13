import { useEffect, useRef, useState } from "react";
import "./HeroTransform.css";

/**
 * ファーストビューのロゴ変形（簡易版）。
 *
 * 高専祭の collage ロゴを起点に、スクロールに連動して
 *  (a) ロゴが横方向の帯（6分割）に裂けて各帯が横にずれる
 *  (b) 背景が紙白 → ステージブラックへ反転し、色が抜けて黄色だけ残る方向へ寄せる
 *  (c) 最後に recollage ロゴ（E2）へ切り替わって固定される
 * という流れを通すための実装。世界観シートの段階表現のうち、
 * 装飾だけ先に崩す・文字が整列し直す、といった細部は割り切っている（PR本文参照）。
 *
 * 作法:
 * - 自動再生ではなくスクロール駆動。スクロールすればそのまま下の情報へ行ける。
 * - prefers-reduced-motion の端末では変形後の静止画。
 * - 2回目以降の訪問（同一セッション）では変形済みから始める。
 *   ロゴ下のボタンで変形をもう一度見られる。
 */

const SLICES = 6;
const STORAGE_KEY = "recollage-hero-seen";

const PAPER: [number, number, number] = [248, 248, 248];
const BLACK: [number, number, number] = [8, 9, 10];

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

function mix(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

function phase(progress: number, from: number, to: number): number {
  return clamp01((progress - from) / (to - from));
}

interface Props {
  fesLogoSrc: string;
  recollageLogoSrc: string;
  dateLabel: string;
  venue: string;
}

export default function HeroTransform({
  fesLogoSrc,
  recollageLogoSrc,
  dateLabel,
  venue,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  // "morph" = 変形を見せる / "done" = 変形後の静止画（reduced-motion・再訪時）
  const [mode, setMode] = useState<"morph" | "done">("morph");
  const markedSeen = useRef(false);

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
    if (reduced || seen) {
      setMode("done");
    }
  }, []);

  useEffect(() => {
    if (mode !== "morph") return;
    let raf = 0;
    const update = () => {
      const el = scrollRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const total = el.offsetHeight - window.innerHeight;
      const p = total > 0 ? clamp01(-rect.top / total) : 1;
      setProgress(p);
      if (p >= 0.98 && !markedSeen.current) {
        markedSeen.current = true;
        try {
          window.sessionStorage.setItem(STORAGE_KEY, "1");
        } catch {
          /* sessionStorage が使えない環境では何もしない */
        }
      }
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [mode]);

  const replay = () => {
    try {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* 何もしない */
    }
    markedSeen.current = false;
    setProgress(0);
    setMode("morph");
    requestAnimationFrame(() => {
      scrollRef.current?.scrollIntoView({ block: "start" });
    });
  };

  if (mode === "done") {
    return (
      <section className="hero-static" aria-label="recollage">
        <div className="hero-stage hero-stage--final" style={{ position: "relative" }}>
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

  // 背景: 紙白 → ステージブラック（0.30〜0.78 で反転）
  const invert = phase(progress, 0.3, 0.78);
  const bg = `rgb(${mix(PAPER[0], BLACK[0], invert)}, ${mix(PAPER[1], BLACK[1], invert)}, ${mix(PAPER[2], BLACK[2], invert)})`;
  // 裂けの進行（0〜0.55）と色抜け
  const tear = phase(progress, 0, 0.55);
  const saturate = 1 - 0.9 * phase(progress, 0.35, 0.75);
  // 高専祭ロゴの退場 / recollage ロゴの登場
  const fesOpacity = 1 - phase(progress, 0.58, 0.85);
  const finalOpacity = phase(progress, 0.62, 0.92);
  const finalShift = (1 - finalOpacity) * 36;
  const metaOpacity = phase(progress, 0.8, 0.97);
  const hintOpacity = 1 - phase(progress, 0, 0.15);

  return (
    <div className="hero-scroll" ref={scrollRef} style={{ height: "240vh" }}>
      <div className="hero-sticky" style={{ background: bg }}>
        <div
          className="hero-stage hero-stage--fes"
          role="img"
          aria-label="高専祭 collage ロゴが recollage ロゴへ組み替わる"
        >
          <div style={{ opacity: fesOpacity, filter: `saturate(${saturate})` }}>
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
        <div className="hero-meta" style={{ opacity: metaOpacity, color: "#f2f2ed" }}>
          <p className="dates">{dateLabel}</p>
          <p className="venue">{venue}</p>
        </div>
        <span className="hero-scroll-hint" style={{ opacity: hintOpacity }}>
          SCROLL
        </span>
      </div>
    </div>
  );
}
