# graduation-live-2027

卒業ライブ（2027-03-06 Sat – 03-07 Sun、サウンドステージ）公式サイトのリポジトリ。

現在は立ち上げ段階。タイトルは recollage を本線に検討中（高専祭テーマ「collage」とリンクさせつつ、今年の高専祭サイトのOP演出とは被らせない方針）。

本番: https://graduation-live-2027.pages.dev/ （Cloudflare Pages）

## 技術スタック（案）

今年の高専祭サイト（Astro + React + Motion）と揃える。理由と検討メモは [docs/stack.md](docs/stack.md)。

- Astro + TypeScript（静的サイト生成）
- インタラクティブな部分だけ React アイランド（OPアニメーション、タイムテーブルの絞り込みなど）
- アニメーション: Motion（＋基本は CSS アニメーション）
- スタイル: 素の CSS + デザイントークン（CSS変数）
- データ: バンド情報・タイムテーブルは `src/data/` の JSON で管理し、コンポーネントに直書きしない
- パッケージ管理: npm / Node 24（高専祭サイトと同一）
- ホスティング: Cloudflare Pages（Git連携、2026-11-13 移行完了）

## イベント概要（確定分）

- 日程: 2027-03-06（土）– 03-07（日）
- 会場: サウンドステージ（1日11組まで × 2日 = 最大22組、¥85,000/日、20分演奏 + 15分転換）
- 出演: 確定21組（詳細は主催側の管理メモ参照、このリポジトリには載せない）

## 開発ルール（CI/CD）

- **main への直接 push / 直接マージは禁止**。変更は必ずブランチを切って Pull Request 経由で入れる（ブランチ保護で強制）。
- CI（`.github/workflows/ci.yml`）: push / PR で `astro check` と `astro build` を自動実行。CI が通らない PR はマージできない。
- CD: Cloudflare Pages の Git 連携。main へのマージで本番（graduation-live-2027.pages.dev）へ自動デプロイされ、他のブランチはプレビューデプロイになる。GitHub Actions 側にデプロイワークフローは無い（旧 GitHub Pages 用 `deploy.yml` は 2026-11-13 に削除）。

## 状態

- [x] リポジトリ作成（private）
- [x] Astro プロジェクトの初期化（最小構成、トップページ仮置き）
- [x] CI/CD 整備（CI + Cloudflare Pages デプロイ + main ブランチ保護）
- [ ] 技術スタック確定（現行は推奨案で初期化済み）
- [ ] タイトル・世界観の確定
- [x] ホスティング最終決定（Cloudflare Pages、`.pages.dev`、独自ドメインは未定）
