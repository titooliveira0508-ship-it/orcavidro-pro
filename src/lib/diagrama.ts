// ─── OrçaVidro Pro · Diagrama técnico SVG ───────────────────────────────────
// Desenho técnico vetorial estilo CAD: fundo escuro azul-marinho, painéis de
// vidro preenchidos em azul translúcido, contornos ciano, cotas em destaque
// (badges). O desenho é proporcional às medidas reais digitadas e redesenha
// ao trocar o modelo (2/3/4 folhas etc.).

import type { AlturaOpcao } from '../types';

export interface OpcoesDiagrama {
  categoriaId: string;
  larguraMm?: number;
  alturaMm?: number;
  alturaOpcao?: AlturaOpcao;
  subOpcao?: string; // id ("2-folhas") ou rótulo ("2 folhas")
  titulo?: string;
}

const BG = '#0A1628';
const BG_PAINEL = '#0E2145';
const VIDRO = '#3A6EA5';
const CIANO = '#4DD0E1';
const CIANO_FORTE = '#0FA0F2';
const BRANCO = '#F4F9FF';
const LINHA_SUAVE = '#27436F';

const SVG_W = 320;
const SVG_H = 400;
const FONTE = 'ui-monospace, SFMono-Regular, Menlo, monospace';

let seqGrade = 0;

function f(n: number): string {
  return String(Math.round(n * 10) / 10);
}

function inteiro(n: number): string {
  return String(Math.round(n));
}

function esc(t: string): string {
  return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Extrai nº de painéis/folhas da sub-opção ("2-folhas", "3 folhas", "4-folhas"...). */
function numPaineis(subOpcao: string | undefined, padrao: number): number {
  if (subOpcao) {
    const m = subOpcao.match(/(\d+)/);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n >= 2 && n <= 6) return n;
    }
  }
  return padrao;
}

/** Painel de vidro preenchido em azul translúcido, com brilho diagonal sutil. */
function painel(x: number, y: number, w: number, h: number, rx = 2): string {
  if (w <= 2 || h <= 2) return '';
  return (
    `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${rx}"` +
    ` fill="${VIDRO}" fill-opacity="0.42" stroke="${CIANO}" stroke-width="1.8"/>` +
    `<polygon points="${f(x + 1.5)},${f(y + 1.5)} ${f(x + w * 0.42)},${f(y + 1.5)}` +
    ` ${f(x + w * 0.16)},${f(y + h - 1.5)} ${f(x + 1.5)},${f(y + h - 1.5)}"` +
    ` fill="#ffffff" opacity="0.08"/>`
  );
}

/** Moldura externa do conjunto. */
function moldura(x: number, y: number, w: number, h: number): string {
  return (
    `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="3"` +
    ` fill="${BG_PAINEL}" stroke="${CIANO}" stroke-width="2.4"/>`
  );
}

/** Trilho superior (correr). */
function trilho(x: number, y: number, w: number): string {
  return `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="7" rx="3.5" fill="${CIANO}" opacity="0.9"/>`;
}

/** Roldana do sistema de correr. */
function roldana(cx: number, cy: number): string {
  return (
    `<circle cx="${f(cx)}" cy="${f(cy)}" r="4.2" fill="${CIANO}"/>` +
    `<circle cx="${f(cx)}" cy="${f(cy)}" r="1.9" fill="${BG}"/>`
  );
}

/** Puxador vertical. */
function puxador(x: number, y: number, h = 24): string {
  return `<rect x="${f(x)}" y="${f(y)}" width="5" height="${f(h)}" rx="2.5" fill="${CIANO}"/>`;
}

/** Dobradiça na lateral. */
function dobradica(x: number, y: number): string {
  return (
    `<rect x="${f(x - 4)}" y="${f(y - 9)}" width="8" height="18" rx="2"` +
    ` fill="${CIANO_FORTE}" stroke="${BRANCO}" stroke-width="0.8"/>`
  );
}

/** Pivô (eixo) da porta pivotante. */
function pivo(cx: number, cy: number): string {
  return (
    `<circle cx="${f(cx)}" cy="${f(cy)}" r="5" fill="none" stroke="${CIANO}" stroke-width="2"/>` +
    `<circle cx="${f(cx)}" cy="${f(cy)}" r="1.8" fill="${CIANO}"/>`
  );
}

/** n painéis verticais com vão entre eles — a troca de modelo fica evidente. */
function paineisVerticais(
  n: number, x: number, y: number, w: number, h: number, m = 6, gap = 4
): string {
  const pw = (w - 2 * m - gap * (n - 1)) / n;
  let s = '';
  for (let i = 0; i < n; i++) s += painel(x + m + i * (pw + gap), y + m, pw, h - 2 * m);
  return s;
}

// ─── cotas ──────────────────────────────────────────────────────────────────

function setaH(x: number, y: number, dir: 1 | -1): string {
  const s = 6;
  return (
    `<polygon points="${f(x)},${f(y - 3.6)} ${f(x)},${f(y + 3.6)}` +
    ` ${f(x + dir * s)},${f(y)}" fill="${CIANO}"/>`
  );
}

function setaV(x: number, y: number, dir: 1 | -1): string {
  const s = 6;
  return (
    `<polygon points="${f(x - 3.6)},${f(y)} ${f(x + 3.6)},${f(y)}` +
    ` ${f(x)},${f(y + dir * s)}" fill="${CIANO}"/>`
  );
}

/** Badge arredondado com o valor da cota (com trava para não sair do SVG). */
function emblema(cx: number, y: number, texto: string): string {
  const w = Math.max(44, texto.length * 8.2 + 18);
  const cxc = Math.max(w / 2 + 4, Math.min(SVG_W - w / 2 - 4, cx));
  return (
    `<rect x="${f(cxc - w / 2)}" y="${f(y - 12)}" width="${f(w)}" height="24" rx="12"` +
    ` fill="${BG}" stroke="${CIANO}" stroke-width="1.4"/>` +
    `<text x="${f(cxc)}" y="${f(y + 4.5)}" text-anchor="middle" font-size="13" font-weight="700"` +
    ` font-family="${FONTE}" fill="${BRANCO}">${esc(texto)}</text>`
  );
}

function cotaH(x1: number, x2: number, y: number, texto: string): string {
  return (
    `<line x1="${f(x1)}" y1="${f(y - 30)}" x2="${f(x1)}" y2="${f(y + 3)}"` +
    ` stroke="${LINHA_SUAVE}" stroke-width="1"/>` +
    `<line x1="${f(x2)}" y1="${f(y - 30)}" x2="${f(x2)}" y2="${f(y + 3)}"` +
    ` stroke="${LINHA_SUAVE}" stroke-width="1"/>` +
    `<line x1="${f(x1)}" y1="${f(y)}" x2="${f(x2)}" y2="${f(y)}"` +
    ` stroke="${CIANO}" stroke-width="1.2"/>` +
    setaH(x1, y, -1) + setaH(x2, y, 1) +
    emblema((x1 + x2) / 2, y, texto)
  );
}

function cotaV(x: number, y1: number, y2: number, texto: string): string {
  const ym = (y1 + y2) / 2;
  return (
    `<line x1="${f(x - 30)}" y1="${f(y1)}" x2="${f(x + 3)}" y2="${f(y1)}"` +
    ` stroke="${LINHA_SUAVE}" stroke-width="1"/>` +
    `<line x1="${f(x - 30)}" y1="${f(y2)}" x2="${f(x + 3)}" y2="${f(y2)}"` +
    ` stroke="${LINHA_SUAVE}" stroke-width="1"/>` +
    `<line x1="${f(x)}" y1="${f(y1)}" x2="${f(x)}" y2="${f(y2)}"` +
    ` stroke="${CIANO}" stroke-width="1.2"/>` +
    setaV(x, y1, -1) + setaV(x, y2, 1) +
    emblema(x + 30, ym, texto)
  );
}

// ─── corpo do desenho por categoria ─────────────────────────────────────────

function corpo(
  categoriaId: string, subOpcao: string | undefined,
  x: number, y: number, w: number, h: number
): string {
  switch (categoriaId) {
    case 'box-frontal': {
      const n = numPaineis(subOpcao, 2);
      let s = moldura(x, y, w, h);
      s += trilho(x + 4, y + 5, w - 8);
      const gap = 4;
      const pw = (w - 12 - gap * (n - 1)) / n;
      for (let i = 0; i < n; i++) {
        const px = x + 6 + i * (pw + gap);
        s += painel(px, y + 16, pw, h - 28);
        s += roldana(px + pw / 2, y + 8.5);
      }
      return s;
    }
    case 'box-abrir': {
      const dp = w * 0.42; // largura da porta
      let s = moldura(x, y, w, h);
      s += painel(x + 6, y + 6, w - dp - 12, h - 12); // fixo
      s += painel(x + w - dp - 2, y + 6, dp - 4, h - 12); // porta
      s += dobradica(x + w - 3, y + h * 0.25);
      s += dobradica(x + w - 3, y + h * 0.75);
      s += puxador(x + w - dp + 6, y + h / 2 - 12);
      s +=
        `<path d="M ${f(x + w - dp)} ${f(y + 6)}` +
        ` A ${f(dp)} ${f(dp)} 0 0 0 ${f(x + w - dp + dp * 0.72)} ${f(y + 6 + dp * 0.7)}"` +
        ` fill="none" stroke="${CIANO}" stroke-width="1.2" stroke-dasharray="5 4" opacity="0.8"/>`;
      return s;
    }
    case 'box-canto': {
      const bw = w * 0.55;
      const bh = h * 0.42;
      const pts =
        `${f(x)},${f(y)} ${f(x + bw)},${f(y)} ${f(x + bw)},${f(y + h - bh)}` +
        ` ${f(x + w)},${f(y + h - bh)} ${f(x + w)},${f(y + h)} ${f(x)},${f(y + h)}`;
      let s =
        `<polygon points="${pts}" fill="${BG_PAINEL}" stroke="${CIANO}" stroke-width="2.4"/>`;
      // ala esquerda: 2 painéis
      s += painel(x + 6, y + 6, bw / 2 - 9, h - bh - 12);
      s += painel(x + bw / 2 + 3, y + 6, bw / 2 - 9, h - bh - 12);
      // ala inferior: 2 painéis
      s += painel(x + bw + 6, y + h - bh + 6, (w - bw) / 2 - 9, bh - 12);
      s += painel(x + bw + (w - bw) / 2 + 3, y + h - bh + 6, (w - bw) / 2 - 9, bh - 12);
      // poste do canto
      s += `<rect x="${f(x + bw - 3)}" y="${f(y + h - bh - 3)}" width="6" height="6" fill="${CIANO}"/>`;
      return s;
    }
    case 'janelas': {
      const n = numPaineis(subOpcao, 2);
      let s = moldura(x, y, w, h);
      const m = 6;
      const gap = 4;
      if (n >= 4) {
        // 4 folhas: grade 2 x 2 — bem diferente do modelo 2 folhas
        const pw = (w - 2 * m - gap) / 2;
        const ph = (h - 2 * m - gap) / 2;
        s += painel(x + m, y + m, pw, ph);
        s += painel(x + m + pw + gap, y + m, pw, ph);
        s += painel(x + m, y + m + ph + gap, pw, ph);
        s += painel(x + m + pw + gap, y + m + ph + gap, pw, ph);
        s += `<rect x="${f(x + w / 2 - 2.5)}" y="${f(y + h / 2 - 9)}" width="5" height="18" rx="2" fill="${CIANO}"/>`;
      } else {
        s += paineisVerticais(2, x, y, w, h, m, gap);
        s += `<rect x="${f(x + w / 2 - 2.5)}" y="${f(y + h / 2 - 11)}" width="5" height="22" rx="2" fill="${CIANO}"/>`;
      }
      return s;
    }
    case 'porta-correr': {
      const n = numPaineis(subOpcao, 2);
      let s = moldura(x, y, w, h);
      s += trilho(x + 4, y + 5, w - 8);
      const gap = 4;
      const pw = (w - 12 - gap * (n - 1)) / n;
      for (let i = 0; i < n; i++) {
        const px = x + 6 + i * (pw + gap);
        s += painel(px, y + 16, pw, h - 28);
        s += roldana(px + pw / 2, y + 8.5);
      }
      return s;
    }
    case 'porta-pivotante': {
      let s = moldura(x, y, w, h);
      s += painel(x + 6, y + 6, w - 12, h - 12);
      s +=
        `<line x1="${f(x + w / 2)}" y1="${f(y + 4)}" x2="${f(x + w / 2)}" y2="${f(y + h - 4)}"` +
        ` stroke="${CIANO}" stroke-width="1.4" stroke-dasharray="6 4" opacity="0.85"/>`;
      s += pivo(x + w / 2, y + 10);
      s += pivo(x + w / 2, y + h - 10);
      s += puxador(x + w / 2 + 10, y + h / 2 - 12);
      return s;
    }
    case 'espelho': {
      let s =
        `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="12"` +
        ` fill="${VIDRO}" fill-opacity="0.5" stroke="${CIANO}" stroke-width="2.4"/>`;
      s +=
        `<rect x="${f(x + 7)}" y="${f(y + 7)}" width="${f(w - 14)}" height="${f(h - 14)}" rx="8"` +
        ` fill="none" stroke="${BRANCO}" stroke-width="1" opacity="0.5"/>`;
      s +=
        `<polygon points="${f(x + 8)},${f(y + 8)} ${f(x + w * 0.4)},${f(y + 8)}` +
        ` ${f(x + w * 0.14)},${f(y + h - 8)} ${f(x + 8)},${f(y + h - 8)}"` +
        ` fill="#ffffff" opacity="0.1"/>`;
      return s;
    }
    case 'armario-pia': {
      let s = moldura(x, y, w, h);
      s += painel(x + 6, y + 6, w / 2 - 9, h - 12);
      s += painel(x + w / 2 + 3, y + 6, w / 2 - 9, h - 12);
      s += puxador(x + w / 2 - 11, y + h / 2 - 12);
      s += puxador(x + w / 2 + 6, y + h / 2 - 12);
      return s;
    }
    case 'guarda-corpo': {
      let s = painel(x, y + 10, w, h - 10);
      const nP = Math.max(2, Math.min(6, Math.round(w / 55)));
      for (let i = 0; i <= nP; i++) {
        const px = x + (w * i) / nP;
        s += `<rect x="${f(px - 3)}" y="${f(y)}" width="6" height="${f(h)}" rx="2" fill="${CIANO}" opacity="0.9"/>`;
      }
      s += `<rect x="${f(x - 2)}" y="${f(y - 2)}" width="${f(w + 4)}" height="10" rx="5" fill="${CIANO}"/>`;
      return s;
    }
    case 'cortina-vidro': {
      const n = 6;
      let s = moldura(x, y, w, h);
      s += trilho(x + 4, y + 5, w - 8);
      const gap = 2.5;
      const pw = (w - 12 - gap * (n - 1)) / n;
      for (let i = 0; i < n; i++) {
        const px = x + 6 + i * (pw + gap);
        s += painel(px, y + 16, pw, h - 28, 1);
        s += roldana(px + pw / 2, y + 8.5);
      }
      return s;
    }
    default: {
      let s = moldura(x, y, w, h);
      s += painel(x + 6, y + 6, w - 12, h - 12);
      return s;
    }
  }
}

/**
 * Gera o SVG do diagrama técnico. `dim` permite sobrescrever os atributos
 * width/height (ex.: width="100%" para uso responsivo no React).
 */
export function gerarSvgDiagrama(
  o: OpcoesDiagrama,
  dim?: { width: string; height: string }
): string {
  const largura = o.larguraMm && o.larguraMm > 0 ? o.larguraMm : 1200;
  const pisoTeto = o.alturaOpcao === 'piso-teto';
  const altura = pisoTeto ? 2600 : o.alturaMm && o.alturaMm > 0 ? o.alturaMm : 1900;
  const rotL = inteiro(largura);
  const rotA = pisoTeto ? 'PISO-TETO' : inteiro(altura);

  const BX = 30;
  const BY = 38;
  const BW = 200;
  const BH = 258;
  const s = Math.min(BW / largura, BH / altura);
  const dw = largura * s;
  const dh = altura * s;
  const x0 = BX + (BW - dw) / 2;
  const y0 = BY + (BH - dh) / 2;

  const wAttr = dim?.width ?? String(SVG_W);
  const hAttr = dim?.height ?? String(SVG_H);

  seqGrade += 1;
  const gid = `grade${seqGrade}`;

  let svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${wAttr}" height="${hAttr}"` +
    ` viewBox="0 0 ${SVG_W} ${SVG_H}" style="display:block">`;
  svg +=
    `<defs><pattern id="${gid}" width="24" height="24" patternUnits="userSpaceOnUse">` +
    `<path d="M 24 0 L 0 0 0 24" fill="none" stroke="#13294F" stroke-width="0.6"/>` +
    `</pattern></defs>`;
  svg += `<rect x="0" y="0" width="${SVG_W}" height="${SVG_H}" fill="${BG}"/>`;
  svg += `<rect x="0" y="0" width="${SVG_W}" height="${SVG_H}" fill="url(#${gid})"/>`;
  svg +=
    `<text x="${BX}" y="22" font-size="11" font-weight="700" letter-spacing="2"` +
    ` font-family="${FONTE}" fill="${CIANO}">DESENHO TÉCNICO</text>`;
  if (o.titulo) {
    svg +=
      `<text x="${SVG_W - BX}" y="22" text-anchor="end" font-size="10" font-weight="600"` +
      ` font-family="${FONTE}" fill="${BRANCO}" opacity="0.75">${esc(o.titulo)}</text>`;
  }
  svg += corpo(o.categoriaId, o.subOpcao, x0, y0, dw, dh);
  svg += cotaH(x0, x0 + dw, y0 + dh + 30, rotL);
  svg += cotaV(x0 + dw + 20, y0, y0 + dh, rotA);
  svg +=
    `<text x="${SVG_W / 2}" y="${SVG_H - 10}" text-anchor="middle" font-size="9"` +
    ` letter-spacing="2.5" font-family="${FONTE}" fill="${LINHA_SUAVE}">COTAS EM MM</text>`;
  svg += `</svg>`;
  return svg;
}

/**
 * Rasteriza um SVG para PNG (data URL), para uso no jsPDF.
 * Roda no navegador (usa Image + canvas).
 */
export function rasterizarSvg(svg: string, larguraPx = 480): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        try {
          const wNat = img.naturalWidth || SVG_W;
          const hNat = img.naturalHeight || SVG_H;
          const proporcao = hNat / wNat;
          const canvas = document.createElement('canvas');
          canvas.width = larguraPx;
          canvas.height = Math.round(larguraPx * proporcao);
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            URL.revokeObjectURL(url);
            resolve(null);
            return;
          }
          ctx.fillStyle = BG;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          URL.revokeObjectURL(url);
          resolve(canvas.toDataURL('image/png'));
        } catch {
          URL.revokeObjectURL(url);
          resolve(null);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      img.src = url;
    } catch {
      resolve(null);
    }
  });
}
