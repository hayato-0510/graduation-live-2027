// Mock E POC: ヒーロー直下の帯で「collage の断片」を 3D で浮かせる。
// UX ガード: canvas は装飾のみ (aria-hidden / pointer-events none)、情報は置かない幕間。
// prefers-reduced-motion では静止画 1 枚だけ描く、画面外では描画を止める、DPR は 1.5 上限。
import * as THREE from "three";

const main = document.querySelector("main");
const logoUrl = main?.getAttribute("data-fes-logo");
if (main && logoUrl) init(logoUrl);

function init(url: string) {
  const started = Date.now();
  const timer = window.setInterval(() => {
    const heroStage = document.querySelector<HTMLElement>(".hero-stage");
    if (heroStage) {
      window.clearInterval(timer);
      setup(heroStage, url);
    } else if (Date.now() - started > 6000) {
      window.clearInterval(timer);
    }
  }, 200);
}

function setup(heroStage: HTMLElement, url: string) {
  if (document.querySelector("canvas.hero3d")) return;
  const heroSection = heroStage.closest("section");
  if (!heroSection) return;
  const band = document.createElement("div");
  band.className = "hero3d-band";
  band.setAttribute("aria-hidden", "true");
  band.style.cssText =
    "position:relative;height:min(430px,52vh);margin-top:12px;";
  heroSection.after(band);
  const canvas = document.createElement("canvas");
  canvas.className = "hero3d";
  canvas.style.cssText =
    "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;";
  band.appendChild(canvas);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 2, 0.1, 50);
  camera.position.set(0, 0, 6.4);

  const group = new THREE.Group();
  scene.add(group);

  // collage ロゴを 9 枚の縦スライスにして、奥行きと角度をずらして浮かせる
  const N = 9;
  const W = 5.9;
  const H = W * (1172 / 2661);
  const slices: THREE.Mesh[] = [];
  const loader = new THREE.TextureLoader();
  loader.load(url, (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    for (let i = 0; i < N; i++) {
      const t = tex.clone();
      t.needsUpdate = true;
      t.wrapS = THREE.RepeatWrapping;
      t.repeat.x = 1 / N;
      t.offset.x = i / N;
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(W / N, H),
        new THREE.MeshBasicMaterial({
          map: t,
          transparent: true,
          side: THREE.DoubleSide,
        }),
      );
      m.position.set(
        -W / 2 + (i + 0.5) * (W / N),
        0,
        Math.sin(i * 1.7) * 0.55 - 0.4,
      );
      m.rotation.y = Math.sin(i * 2.3) * 0.38;
      m.userData.seed = i * 0.9;
      slices.push(m);
      group.add(m);
    }
  });

  // 奥行きのほこり: 黄色の小さな点
  const pGeo = new THREE.BufferGeometry();
  const count = 130;
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 8.5;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 3.6;
    pos[i * 3 + 2] = -Math.random() * 2.5 - 0.5;
  }
  pGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const points = new THREE.Points(
    pGeo,
    new THREE.PointsMaterial({
      color: 0xc9a400,
      size: 0.04,
      transparent: true,
      opacity: 0.8,
    }),
  );
  scene.add(points);

  let tx = 0;
  let ty = 0;
  window.addEventListener("pointermove", (e) => {
    tx = (e.clientX / window.innerWidth - 0.5) * 2;
    ty = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  const resize = () => {
    const w = band.clientWidth;
    const h = band.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  resize();
  new ResizeObserver(resize).observe(band);

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let visible = true;
  new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(band);

  const clock = new THREE.Clock();
  const render = () => {
    const t = clock.getElapsedTime();
    group.rotation.y += (tx * 0.22 - group.rotation.y) * 0.05;
    group.rotation.x += (ty * 0.12 - group.rotation.x) * 0.05;
    for (const s of slices) {
      s.position.y = Math.sin(t * 0.7 + s.userData.seed) * 0.05;
    }
    points.rotation.y = t * 0.02;
    renderer.render(scene, camera);
  };
  if (reduced) {
    render();
    window.setTimeout(render, 600);
    window.setTimeout(render, 1600);
  } else {
    renderer.setAnimationLoop(() => {
      if (visible && !document.hidden) render();
    });
  }
}
