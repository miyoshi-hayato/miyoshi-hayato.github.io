# ポートフォリオサイト 設計書

- 作成日: 2026-05-08
- リポジトリ: `miyoshi-hayato.github.io`
- オーナー: 三好 隼人

## 1. 目的・スコープ

### 1.1 目的

「仕事・登壇の依頼受け口」として機能する個人ポートフォリオサイトを作る。
訪問者（採用担当・取引先・メディア）が、依頼判断に必要な情報を素早く把握し、
そのまま問い合わせまで進める導線を持つ。

### 1.2 受けたい接点

- 仕事の依頼: 副業・顧問・アドバイザリー
- 登壇の依頼: 講演・取材・インタビュー

### 1.3 主な掲載コンテンツ

1. 経歴・肩書き・専門領域
2. 提供できるサービスメニュー
3. 実績・事例
4. 発信・アウトプット
5. 連絡先（mailto）

### 1.4 v1 で**やらないこと**（YAGNI）

- 問い合わせフォーム → `mailto:` のみ
- ダークモード・多言語対応
- ブログ記事ページ（必要になってから追加）
- 自動デプロイ以外の CI/CD

## 2. アーキテクチャ概要

```
content/index.md  ←  原稿（Markdown 1ファイル）
       │
       ▼
   src/build.mjs   ←  marked + gray-matter（~80行）
   ├──► public/index.html  ←  Pattern A 構造でレンダリング
   ├──► public/index.md    ←  原稿コピー（AI/ツール向け）
   ├──► public/llms.txt    ←  サイト概要（AI 導入用）
   ├──► public/styles.css
   └──► public/_headers    ←  Content-Type 設定
       │
       ▼
   Cloudflare Pages
   ├─ _headers で `*.md` を `Content-Type: text/markdown; charset=utf-8`
   └─ GitHub 連携で push 時に自動ビルド・自動デプロイ
```

### 設計上の特徴

- **原稿とコードの分離**: 内容更新は `content/index.md` だけ触る。
- **Markdown 同時公開**: `.md` を AI/ツール向けに本物の `text/markdown` で配信。
- **フレームワーク非依存**: Node 標準 + 2パッケージのみ。読めば全部分かる。

## 3. レイアウト（Pattern A: 1ページスクロール型）

ヒーロー → About → Services → Works → Output → Contact の縦積み。
ナビは sticky で常時表示、スマホではハンバーガー化。

### レスポンシブ

- Desktop（>720px）: 横並びグリッド
- Mobile（≤720px）:
  - ナビ → ハンバーガー
  - Services / Output → 縦1列
  - Works → 年/タグを縦折り返し
  - 余白を圧縮（hero `64px 20px 56px` ほか）

プロトタイプ実装は `.superpowers/brainstorm/57760-1778196566/content/prototypes-v2.html` の `#pattern-a` を出発点とする。

## 4. ディレクトリ構成

```
miyoshi-hayato.github.io/
├── content/
│   └── index.md              # ★ 原稿（編集対象）
├── src/
│   ├── build.mjs             # ビルドスクリプト
│   ├── template.html         # HTML テンプレート（Pattern A）
│   └── styles.css            # スタイル
├── public/                   # ビルド出力先（gitignore、Cloudflare がビルド時に生成）
│   ├── index.html
│   ├── index.md
│   ├── llms.txt
│   ├── styles.css
│   └── _headers
├── package.json
├── .gitignore
├── README.md
├── docs/superpowers/specs/   # 設計ドキュメント類
├── suginami-hazard-map/      # 既存（公開対象外、リポ保管のみ）
└── skills/                   # 既存（公開対象外）
```

## 5. Markdown 規約

`content/index.md` は以下の構造で書く。build.mjs はこの規約を前提にパース。

```markdown
---
name: 三好 隼人
role: snaq.me / D2C プロダクト
description: snaq.meでD2Cプロダクトを担当。副業・顧問・登壇受付中。
contact_email: miyoshi@snaq.me
---

# Hero

お菓子のサブスクで、「おやつ時間」を編集する。

snaq.meでD2Cプロダクトを担当しています。

## About

300字程度の本文。普通の Markdown。

## Services

### 副業・業務委託
D2C / サブスク事業のプロダクト改善、CRM設計、グロース支援。

### 顧問・アドバイザリー
定例での壁打ち、戦略レビュー、新規事業の伴走。

## Works

- **2024** `[アドバイザリー]` 実績タイトル1 — クライアント名
- **2023** `[登壇]` 登壇イベント名 — 参加者数

## Output

- [BLOG: 記事タイトル](https://...)
- [GITHUB: miyoshi-hayato](https://github.com/miyoshi-hayato)

## Contact

[miyoshi@snaq.me](mailto:miyoshi@snaq.me)
```

### 規約のミソ

| セクション | 規約 | レンダリング先 |
|---|---|---|
| front matter | YAML | `<title>`, `<meta>`, llms.txt |
| `# Hero` | 1段落目=キャッチ、2段落目=ピッチ | hero block |
| `## About` | 普通の Markdown 本文 | about セクション |
| `## Services` の `###` | 1つ=1サービス | service-card 1枚 |
| `## Works` のリスト | `**年** \`[タグ]\` タイトル — メタ` | work-item 1行 |
| `## Output` のリスト | `[ラベル: タイトル](URL)` | output-card 1枚 |
| `## Contact` | mailto リンクを含む本文 | contact ブロック |

規約から外れた書き方をしても、build.mjs は標準 Markdown→HTML 変換にフォールバックする（見た目が崩れるだけで壊れない）。

## 6. ビルドスクリプト

### 6.1 build.mjs の処理フロー

```
1. content/index.md を読む
2. gray-matter で front matter と本文を分離
3. 本文を ## 単位でセクションに分割
4. 各セクションを規約に従いカスタムレンダラで HTML 化
   - Hero: 段落 → h1 + p
   - Services: ### 単位で service-card 配列
   - Works: リストアイテムを正規表現で year/tag/title/meta に分解
   - Output: リンクの `LABEL: TITLE` 形式を分解
   - その他: marked 標準
5. src/template.html に流し込み public/index.html を書く
6. content/index.md を public/index.md にコピー
7. src/styles.css を public/styles.css にコピー
8. front matter + 各セクション要約から llms.txt を生成
9. _headers を public/ に書き出す
```

### 6.2 依存パッケージ

```json
{
  "type": "module",
  "scripts": {
    "build": "node src/build.mjs",
    "dev": "node src/build.mjs && python3 -m http.server -d public 8080"
  },
  "devDependencies": {
    "marked": "^14.0.0",
    "gray-matter": "^4.0.0"
  }
}
```

## 7. Cloudflare Pages 設定

### 7.1 接続設定

- GitHub リポジトリ `miyoshi-hayato/miyoshi-hayato.github.io` を連携
- Build command: `npm run build`
- Output directory: `public`
- Production branch: `master`
- ドメイン: 初期は `*.pages.dev`（カスタムドメインは後追い）

### 7.2 `public/_headers`

```
/*.md
  Content-Type: text/markdown; charset=utf-8
  Cache-Control: public, max-age=300

/llms.txt
  Content-Type: text/plain; charset=utf-8

/*.html
  Cache-Control: public, max-age=300
```

### 7.3 検証

デプロイ後 `curl -I https://<deployed>/index.md` で `Content-Type: text/markdown; charset=utf-8` が返ることを確認する。

## 8. llms.txt のフォーマット

```
# 三好 隼人 (Hayato Miyoshi)

snaq.me / D2C プロダクト。副業・顧問・登壇受付中。

- 経歴と専門領域: /index.md の About 節を参照
- 提供サービス: 副業 / 顧問 / 登壇 / 取材
- 連絡先: miyoshi@snaq.me

詳細: https://<deployed-domain>/index.md
```

front matter と各セクションの先頭一文から自動生成する。

## 9. 既存ファイルの扱い

| パス | 扱い |
|---|---|
| ルートの `index.html`（Hello World） | **削除**（公開先は `public/`） |
| `suginami-hazard-map/` | 触らずリポに残す。`public/` には含めない |
| `skills/` | 触らずリポに残す。`public/` には含めない |
| `.superpowers/` | `.gitignore` 済み |

## 10. 実装ステップ（v1）

1. `package.json` 作成、`npm install marked gray-matter`
2. `src/template.html` を Pattern A v2 から抽出
3. `src/styles.css` を Pattern A v2 から抽出
4. `src/build.mjs` を実装（front matter + sections パーサ）
5. `content/index.md` 雛形作成（プレースホルダー込み）
6. `public/_headers` の生成ロジックを build.mjs に組み込み
7. `npm run build` 実行、ローカルで `python3 -m http.server -d public 8080` で確認
8. ルートの `index.html` を削除、`.gitignore` に `node_modules/` と `public/` を追加（Cloudflare Pages 側で `npm run build` を実行するため、`public/` はリポジトリにコミットしない）
9. コミット & GitHub プッシュ
10. Cloudflare Pages で接続・初回デプロイ確認
11. `curl -I` で `*.md` のレスポンスヘッダー検証
12. 仮文を実コンテンツへ差し替え（`content/index.md` のみ編集）して再デプロイ

## 11. 受け入れ基準

- [ ] `npm run build` が成功する
- [ ] `public/index.html` が Pattern A のレイアウトで描画される
- [ ] Desktop / Tablet / Mobile（390px）でレイアウトが崩れない
- [ ] `public/index.md` が原稿コピーとして存在する
- [ ] `public/llms.txt` がサイト概要を含む
- [ ] Cloudflare Pages のデプロイが成功する
- [ ] `curl -I https://<deployed>/index.md` のレスポンスヘッダーが `Content-Type: text/markdown; charset=utf-8`
- [ ] `mailto:` リンクから本人のメーラが開く

## 12. リスクと対応

| リスク | 対応 |
|---|---|
| 規約違反な Markdown が書かれた場合に意図せぬ崩れ | 標準 Markdown→HTML フォールバックで「壊れない」設計。崩れたら原稿を直す |
| Cloudflare Pages のビルド環境差で `npm install` 失敗 | `package-lock.json` をコミット、Node バージョンを `package.json` の `engines` で固定 |
| 原稿の差し替え後にビルド忘れ | Cloudflare Pages 側で push 時に自動ビルドされるため、ローカルビルドは任意 |
| `*.pages.dev` ドメインの SEO 弱さ | カスタムドメイン追加で対応（v2 範囲） |
