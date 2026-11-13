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
 * - 変形は一方向。スクロール位置から求めた進捗を「これまでに到達した最大値」
 *   で下限として保持し、上へスクロールしても巻き戻らない。完了（進捗 1）
 *   したらその訪問の間は最終状態（黒背景＋recollage ロゴ）に固定される。
 * - スクロール位置からの素の進捗は、scrollY が区間の開始位置以下なら必ず 0 で、
 *   計測値が一時的に おかしくなっても（total <= 0 等）進捗が進むことはない。
 *   初回表示はスクロールしない限り進まない（最大値の初期値は 0）。
 * - 「見た」記録（sessionStorage）は、実際にスクロールイベントが起きて
 *   実効進捗が末尾に達したときだけ書く。マウント直後やリサイズの再計算では書かない。
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
  // 一方向化のための到達最大進捗。実効進捗はこれを下回らない。
  // replay のときだけ 0 に戻す。
  const maxProgress = useRef(0);
  // replay 直後の巻き戻し中は「見た」を書かないためのガード。
  // done→morph の切り替え時にブラウザがスクロール位置を区間の末尾側へ
  // 復元（スクロールアンカリングでジャンプ）することがあり、そこから
  // scrollIntoView のアニメーションが全区間をなぞって戻ってくる。
  // その通過中のスクロールイベントで誤記録・誤ラッチしないよう、
  // 進捗が開始位置付近（<= 0.02）まで戻った時点で解除する。
  // ガード中は位置から進捗を進めることもしない（表示は最大値のまま）。
  const rewindGuard = useRef(false);

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

    // ヒーロー区間の形状: ドキュメント先頭から区間開始までの距離と、
    // スクロールで進捗が 0→1 になるまでの移動量。
    // ビューポート側の高さは window.innerHeight ではなく sticky 要素自身の
    // 実高（100svh）で取る。ツールバーの出入り等で innerHeight が揺れても
    // total が縮んで進捗が水増しされることがないようにするため。
    const measure = () => {
      const el = scrollRef.current;
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      const docTop = rect.top + window.scrollY;
      const sticky = el.firstElementChild as HTMLElement | null;
      const viewH = sticky?.offsetHeight || window.innerHeight;
      const total = el.offsetHeight - viewH;
      return { docTop, total };
    };

    // fromScroll: 本物のスクロールイベント経由かどうか。
    // 「見た」記録はスクロール経由で末尾に達したときだけ書く
    // （マウント・リサイズの再計算で誤発火させない）。
    const update = (fromScroll: boolean) => {
      const g = measure();
      if (!g) return;
      // スクロール位置からの素の進捗。区間開始位置より上にいる限り必ず 0。
      // total が取れない・縮退している場合は進めない（旧実装はここで 1 に
      // 倒していたため、計測が一瞬おかしくなるだけで変形が完了し、
      // さらに「見た」まで記録されて再訪扱いになる不具合があった）。
      const p =
        g.total > 0 ? clamp01((window.scrollY - g.docTop) / g.total) : 0;

      if (rewindGuard.current) {
        // replay 直後。スクロール位置の復元ジャンプや、開始位置へ戻る
        // アニメーションの通過中の p では進捗を進めず・記録もしない。
        // 解除条件は「末尾未満」ではなく開始位置付近（<= 0.02）まで
        // 戻ったこと。通過の途中で解除すると、その通過値（例 0.97）が
        // 一方向の最大値にラッチされて再演が最終状態で固まってしまう。
        if (fromScroll && p <= 0.02) {
          rewindGuard.current = false;
        } else {
          setProgress(maxProgress.current);
          return;
        }
      }

      // 一方向: 実効進捗は到達した最大値から下げない。上スクロールで
      // 素の進捗が下がっても、表示は最大値のまま（完了後は最終状態に固定）。
      if (p > maxProgress.current) {
        maxProgress.current = p;
      }
      const effective = maxProgress.current;
      setProgress(effective);
      if (fromScroll && effective >= 0.98 && !markedSeen.current) {
        markedSeen.current = true;
        try {
          window.sessionStorage.setItem(STORAGE_KEY, "1");
        } catch {
          /* sessionStorage が使えない環境では何もしない */
        }
      }
    };

    const schedule = (fromScroll: boolean) => () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => update(fromScroll));
    };
    const onScroll = schedule(true);
    const onResize = schedule(false);

    update(false);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, [mode]);

  const replay = () => {
    try {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* 何もしない */
    }
    markedSeen.current = false;
    maxProgress.current = 0;
    rewindGuard.current = true;
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
