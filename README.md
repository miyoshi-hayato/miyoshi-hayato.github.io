# miyoshi-hayato.github.io

三好 隼人 のポートフォリオサイト。

- 原稿: `content/index.md` のみ
- ビルド: `npm run build` → `public/` を生成
- ホスティング: Cloudflare Pages
- 設計: [docs/superpowers/specs/2026-05-08-portfolio-design.md](docs/superpowers/specs/2026-05-08-portfolio-design.md)

## ローカル開発

```bash
npm install
npm run build       # public/ にビルド
npm run dev         # ビルド後に http://localhost:8080 でプレビュー
```

## 内容を更新する

`content/index.md` を編集して push するだけ。Cloudflare Pages 側で自動ビルド・デプロイされる。

セクション構造の規約は設計書を参照。

## 公開される URL

- `/` — HTML 版（ブラウザ向け）
- `/index.md` — Markdown 版（AI エージェント・ツール向け、`Content-Type: text/markdown`）
- `/llms.txt` — AI 向けサイト概要

## デプロイ設定（Cloudflare Pages）

- Build command: `npm run build`
- Output directory: `public`
- Production branch: `master`
