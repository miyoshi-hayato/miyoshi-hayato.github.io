#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import { marked } from 'marked';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const SRC_MD = resolve(root, 'content/index.md');
const TEMPLATE = resolve(root, 'src/template.html');
const STYLES = resolve(root, 'src/styles.css');
const OUT_DIR = resolve(root, 'public');

const escapeHtml = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const escapeAttr = (s) => String(s).replace(/"/g, '&quot;');

function parseSections(body) {
  const lines = body.split('\n');
  const sections = {};
  let key = null;
  let buf = [];
  for (const line of lines) {
    const h = line.match(/^#{1,2}\s+(.+?)\s*$/);
    if (h) {
      if (key !== null) sections[key] = buf.join('\n').trim();
      key = h[1].trim();
      buf = [];
    } else if (key !== null) {
      buf.push(line);
    }
  }
  if (key !== null) sections[key] = buf.join('\n').trim();
  return sections;
}

function renderHero(text) {
  if (!text) return '';
  const paragraphs = text.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean);
  const headline = paragraphs[0] || '';
  const pitchHtml = paragraphs
    .slice(1)
    .map((p) => `<p>${escapeHtml(p)}</p>`)
    .join('\n    ');
  return `    <h1>${escapeHtml(headline)}</h1>${pitchHtml ? `\n    ${pitchHtml}` : ''}`;
}

function renderServices(text) {
  if (!text) return '';
  const blocks = text.split(/^###\s+/m).map((s) => s.trim()).filter(Boolean);
  return blocks
    .map((block) => {
      const [titleLine, ...rest] = block.split('\n');
      const desc = rest.join('\n').trim();
      return `    <div class="service-card">
      <h3>${escapeHtml(titleLine.trim())}</h3>
      <p>${escapeHtml(desc)}</p>
    </div>`;
    })
    .join('\n');
}

const WORK_RE = /^[-*]\s+\*\*(.+?)\*\*\s*`\[(.+?)\]`\s*(.+?)(?:\s*[—–\-]\s*(.+))?$/;

function renderWorks(text) {
  if (!text) return '';
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const m = line.match(WORK_RE);
      if (!m) return null;
      const [, year, tag, title, meta] = m;
      const metaSpan = meta ? `<span class="meta"> · ${escapeHtml(meta.trim())}</span>` : '';
      return `    <div class="work-item">
      <span class="year">${escapeHtml(year)}</span>
      <span><span class="title">${escapeHtml(title.trim())}</span>${metaSpan}</span>
      <span class="tag">${escapeHtml(tag)}</span>
    </div>`;
    })
    .filter(Boolean)
    .join('\n');
}

const OUTPUT_RE = /^[-*]\s+\[([^:\]]+):\s*(.+?)\]\((.+?)\)/;

function renderOutput(text) {
  if (!text) return '';
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const m = line.match(OUTPUT_RE);
      if (!m) return null;
      const [, label, title, url] = m;
      return `    <a class="output-card" href="${escapeAttr(url)}">
      <div class="label-tag">${escapeHtml(label.trim())}</div>
      ${escapeHtml(title.trim())}
    </a>`;
    })
    .filter(Boolean)
    .join('\n');
}

function renderProse(text) {
  return text ? marked.parse(text) : '';
}

function renderLlmsTxt(meta) {
  return `# ${meta.name}

${meta.description}

## 役職
snaq.me CTO & Co-Founder（2015年〜）

## 主な実績
- 売上 5 倍成長、LTV 15% 向上、出荷生産性 8 倍、誤ピック率 1/10
- エンジニア組織 1→20 名、離職率 5% 未満
- AWS アーキテクチャ賞 2 年連続ファイナリスト
- 生成 AI 活用で開発リードタイム 10 倍短縮

## 受け付けている依頼
- 製造業 × デジタルのアドバイザリー（食品・消費財メーカーの DX）
- 生成 AI 活用の組織導入
- 技術顧問・CTO 壁打ち
- 講演・取材・寄稿

## 専門領域
食品 D2C × 製造オペレーション、WMS / SCM、業務システム、生成 AI 活用、
スタートアップ技術戦略、エンジニア組織づくり。

## 連絡先
公式サイトの「問い合わせる」ボタンから（メーラーが起動します）。
`;
}

const HEADERS_CONFIG = `/*.md
  Content-Type: text/markdown; charset=utf-8
  Cache-Control: public, max-age=300

/llms.txt
  Content-Type: text/plain; charset=utf-8

/*.html
  Cache-Control: public, max-age=300
`;

function applyTemplate(template, vars) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => (vars[k] != null ? vars[k] : ''));
}

function build() {
  const raw = readFileSync(SRC_MD, 'utf8');
  const { data: meta, content } = matter(raw);
  const sections = parseSections(content);

  if (!meta.contact_email) {
    throw new Error('content/index.md の front matter に contact_email が必要です');
  }
  const contactEmailB64 = Buffer.from(meta.contact_email, 'utf8').toString('base64');

  const template = readFileSync(TEMPLATE, 'utf8');
  const html = applyTemplate(template, {
    title: meta.title || `${meta.name} - Portfolio`,
    description: meta.description || '',
    name: meta.name || '',
    role_tag: meta.role_tag || '',
    year: new Date().getFullYear(),
    contact_email_b64: contactEmailB64,
    hero: renderHero(sections.Hero),
    about: renderProse(sections.About),
    services: renderServices(sections.Services),
    works: renderWorks(sections.Works),
    output: renderOutput(sections.Output),
    contact: renderProse(sections.Contact),
  });

  // Redacted markdown for public — strip contact_email from front matter
  const redactedMeta = { ...meta };
  delete redactedMeta.contact_email;
  const redactedMd = matter.stringify(content, redactedMeta);

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(resolve(OUT_DIR, 'index.html'), html);
  writeFileSync(resolve(OUT_DIR, 'index.md'), redactedMd);
  copyFileSync(STYLES, resolve(OUT_DIR, 'styles.css'));
  writeFileSync(resolve(OUT_DIR, 'llms.txt'), renderLlmsTxt(meta));
  writeFileSync(resolve(OUT_DIR, '_headers'), HEADERS_CONFIG);

  console.log('✓ Built:');
  console.log('  public/index.html');
  console.log('  public/index.md  (contact_email redacted)');
  console.log('  public/styles.css');
  console.log('  public/llms.txt');
  console.log('  public/_headers');
}

build();
