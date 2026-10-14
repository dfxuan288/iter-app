/**
 * Draws the demo sample receipts and menus (mobile/assets/samples/*.jpg) used to show scanning
 * without a real receipt. Their printed contents must match backend/scan/samples.ts.
 * Run with: npx tsx scripts/make-samples.ts   (needs Japanese and Thai fonts, as on Windows)
 */
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

import sharp from 'sharp';

const OUT = join('mobile', 'assets', 'samples');
const JP = "'Yu Gothic', 'Meiryo', 'MS Gothic', sans-serif";
const TH = "'Leelawadee UI', 'Tahoma', sans-serif";

type Line =
  | { left: string; right?: string; size?: number; bold?: boolean; center?: boolean; indent?: number }
  | { rule: 'dash' | 'double' }
  | { gap: number };

const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** A receipt or menu drawn as SVG text on a sheet, placed slightly askew on a table like a photo. */
async function draw(name: string, lines: Line[], options: { width: number; font: string; paper: string; ink: string; table: string; tilt: number; size: number }) {
  const pad = 48;
  let y = pad;
  const parts: string[] = [];
  for (const line of lines) {
    if ('gap' in line) {
      y += line.gap;
      continue;
    }
    if ('rule' in line) {
      y += 14;
      const dash = line.rule === 'dash' ? 'stroke-dasharray="8 6"' : '';
      parts.push(`<line x1="${pad}" x2="${options.width - pad}" y1="${y}" y2="${y}" stroke="${options.ink}" stroke-width="2" ${dash}/>`);
      if (line.rule === 'double') parts.push(`<line x1="${pad}" x2="${options.width - pad}" y1="${y + 6}" y2="${y + 6}" stroke="${options.ink}" stroke-width="2"/>`);
      y += 22;
      continue;
    }
    const size = line.size ?? options.size;
    y += size * 1.45;
    const weight = line.bold ? 700 : 400;
    const style = `font-family="${options.font}" font-size="${size}" font-weight="${weight}" fill="${options.ink}"`;
    if (line.center) {
      parts.push(`<text x="${options.width / 2}" y="${y}" text-anchor="middle" ${style}>${escape(line.left)}</text>`);
    } else {
      parts.push(`<text x="${pad + (line.indent ?? 0)}" y="${y}" ${style} xml:space="preserve">${escape(line.left)}</text>`);
      if (line.right) parts.push(`<text x="${options.width - pad}" y="${y}" text-anchor="end" ${style}>${escape(line.right)}</text>`);
    }
  }
  const height = Math.ceil(y + pad);
  const sheet = `<svg xmlns="http://www.w3.org/2000/svg" width="${options.width}" height="${height}">
    <rect width="100%" height="100%" fill="${options.paper}"/>${parts.join('')}</svg>`;

  const paper = await sharp(Buffer.from(sheet)).rotate(options.tilt, { background: '#00000000' }).png().toBuffer();
  const meta = await sharp(paper).metadata();
  const margin = 70;
  await sharp({ create: { width: (meta.width ?? 0) + margin * 2, height: (meta.height ?? 0) + margin * 2, channels: 3, background: options.table } })
    .composite([{ input: paper, left: margin, top: margin }])
    .resize({ width: 1100, height: 1500, fit: 'inside' })
    .jpeg({ quality: 82 })
    .toFile(join(OUT, `${name}.jpg`));
  console.log(`wrote ${name}.jpg`);
}

const receipt = { width: 760, font: JP, paper: '#FBFBF7', ink: '#1E1E1E', table: '#8A9BA3', size: 27 };
const yen = (n: number) => `¥${n.toLocaleString('en-US')}`;

async function main() {
  mkdirSync(OUT, { recursive: true });

  await draw(
    'receipt-drugstore-ginza',
    [
      { left: 'マツモトキヨシ', size: 44, bold: true, center: true },
      { left: '銀座店', size: 30, center: true },
      { left: '東京都中央区銀座', size: 22, center: true },
      { left: '★ 免税 TAX-FREE SHOP ★', size: 24, bold: true, center: true },
      { gap: 8 },
      { left: '2026年11月15日(日) 14:32', right: 'No.2841' },
      { rule: 'dash' },
      { left: 'アネッサ 日焼け止め', right: yen(2980) },
      { left: '肌ラボ 化粧水' },
      { left: '2個 × @1,280', right: yen(2560), indent: 28 },
      { left: 'ロート 目薬', right: yen(680) },
      { left: '※ポッキー チョコ' },
      { left: '3個 × @150', right: yen(450), indent: 28 },
      { rule: 'dash' },
      { left: '小計 (税抜)', right: yen(6670) },
      { left: '(10%対象', right: `${yen(6220)})`, size: 23 },
      { left: '消費税 10%', right: yen(622) },
      { left: '(8%対象', right: `${yen(450)})`, size: 23 },
      { left: '消費税 8%', right: yen(36) },
      { rule: 'double' },
      { left: '合計', right: yen(7328), size: 36, bold: true },
      { left: 'お預り', right: yen(10000) },
      { left: 'お釣り', right: yen(2672) },
      { gap: 10 },
      { left: '※印は軽減税率(8%)対象商品です', size: 21 },
      { gap: 14 },
      { left: 'SAMPLE RECEIPT · ITER DEMO', size: 20, center: true },
    ],
    { ...receipt, tilt: -1 },
  );

  await draw(
    'receipt-convenience-store-shibuya',
    [
      { left: 'FamilyMart', size: 46, bold: true, center: true },
      { left: 'ファミリーマート 渋谷店', size: 28, center: true },
      { gap: 8 },
      { left: '2026年11月15日(日) 08:17', right: 'レジ01' },
      { rule: 'dash' },
      { left: 'おにぎり 鮭', right: '軽' },
      { left: '2個 × @172', right: yen(344), indent: 28 },
      { left: 'お〜いお茶', right: `${yen(162)} 軽` },
      { left: 'たまごサンド', right: `${yen(336)} 軽` },
      { rule: 'dash' },
      { left: '小計', right: yen(842) },
      { left: '合計', right: yen(842), size: 36, bold: true },
      { left: '(8%対象', right: `${yen(842)})`, size: 23 },
      { left: '(内消費税', right: `${yen(62)})`, size: 23 },
      { left: '現金', right: yen(1000) },
      { left: 'お釣り', right: yen(158) },
      { gap: 10 },
      { left: '「軽」は軽減税率対象商品です', size: 21 },
      { gap: 14 },
      { left: 'SAMPLE RECEIPT · ITER DEMO', size: 20, center: true },
    ],
    { ...receipt, tilt: 0.8 },
  );

  const menuStyle = { width: 900, paper: '#F3E6CF', ink: '#3A2414', table: '#4B3A2E', size: 34 };
  await draw(
    'menu-ramen',
    [
      { left: 'らーめん 桜屋', size: 58, bold: true, center: true },
      { left: 'お品書き', size: 32, center: true },
      { rule: 'double' },
      { gap: 10 },
      { left: '豚骨らーめん', right: '1,000円' },
      { left: '醤油らーめん', right: '900円' },
      { left: '鶏塩らーめん', right: '950円' },
      { left: '野菜らーめん', right: '900円' },
      { gap: 10 },
      { left: '餃子 (6個)', right: '450円' },
      { gap: 10 },
      { left: '生ビール', right: '600円' },
      { left: 'ウーロン茶', right: '300円' },
      { gap: 10 },
      { rule: 'dash' },
      { left: '※表示価格は税抜です', size: 26 },
      { gap: 16 },
      { left: 'SAMPLE MENU · ITER DEMO', size: 20, center: true },
    ],
    { ...menuStyle, font: JP, tilt: -0.8 },
  );

  await draw(
    'menu-thai',
    [
      { left: 'ครัวไทย', size: 60, bold: true, center: true },
      { left: 'เมนูอาหาร', size: 32, center: true },
      { rule: 'double' },
      { gap: 10 },
      { left: 'ผัดไทยกุ้ง', right: '180.-' },
      { left: 'ต้มยำกุ้ง', right: '220.-' },
      { left: 'ข้าวผัดสับปะรด', right: '160.-' },
      { left: 'หมูสะเต๊ะ', right: '150.-' },
      { left: 'ส้มตำ', right: '120.-' },
      { gap: 10 },
      { left: 'เบียร์สิงห์', right: '140.-' },
      { left: 'ชาไทยเย็น', right: '80.-' },
      { gap: 10 },
      { rule: 'dash' },
      { left: 'ราคา ++ บวกค่าบริการ 10% และ VAT 7%', size: 26 },
      { gap: 16 },
      { left: 'SAMPLE MENU · ITER DEMO', size: 20, center: true },
    ],
    { ...menuStyle, font: TH, paper: '#FFF8EC', tilt: 0.6 },
  );
}

void main();
