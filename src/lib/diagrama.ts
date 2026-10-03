// ─── OrçaVidro Pro · Diagrama técnico SVG com cotas ─────────────────────────
// Gera um desenho técnico (vista frontal esquemática) com as medidas reais
// digitadas, estilo planta de vidraçaria: linhas finas azul-marinho,
// fundo branco, cotas de medida anotadas. O desenho é proporcional às
// medidas (largura × altura em mm).

import type { AlturaOpcao } from '../types';

export interface OpcoesDiagrama {
  categoriaId: string;
  larguraMm?: number;
  alturaMm?: number;
  alturaOpcao?: AlturaOpcao;
  subOpcao?: string; // id ("2-folhas") ou rótulo ("2 folhas")
  titulo?: string;
}

const NAVY = '#0B2A6E';

const SVG_W = 320;
const SVG_H = 400;

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

function rect(x: number, y: number, w: number, h: number, sw = 2, rx = 0): string {
  return (
    `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${rx}"` +
    ` fill="#ffffff" stroke="${NAVY}" stroke-width="${sw}"/>`
  );
}

function lin(
  x1: number, y1: number, x2: number, y2: number,
  sw = 1.2, tracejado = false
): string {
  return (
    `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}"` +
    ` stroke="${NAVY}" stroke-width="${sw}"${tracejado ? ' stroke-dasharray="5 4"' : ''}/>`
  );
}

function circ(cx: number, cy: number, r: number, preenchido = true): string {
  return preenchido
    ? `<circle cx="${f(cx)}" cy="${f(cy)}" r="${r}" fill="${NAVY}"/>`
    : `<circle cx="${f(cx)}" cy="${f(cy)}" r="${r}" fill="#ffffff" stroke="${NAVY}" stroke-width="1.5"/>`;
}

function cotaH(x1: number, x2: number, y: number, texto: string): string {
  const xm = (x1 + x2) / 2;
  return (
    `<g stroke="${NAVY}" stroke-width="1" fill="none">` +
    `<line x1="${f(x1)}" y1="${f(y)}" x2="${f(x2)}" y2="${f(y)}"/>` +
    `<line x1="${f(x1)}" y1="${f(y - 5)}" x2="${f(x1)}" y2="${f(y + 5)}"/>` +
    `<line x1="${f(x2)}" y1="${f(y - 5)}" x2="${f(x2)}" y2="${f(y + 5)}"/>` +
    `</g>` +
    `<text x="${f(xm)}" y="${f(y - 8)}" text-anchor="middle" font-size="12"` +
    ` font-family="ui-monospace, monospace" fill="${NAVY}">${esc(texto)}</text>`
  );
}

function cotaV(x: number, y1: number, y2: number, texto: string): string {
  const ym = (y1 + y2) / 2;
  return (
    `<g stroke="${NAVY}" stroke-width="1" fill="none">` +
    `<line x1="${f(x)}" y1="${f(y1)}" x2="${f(x)}" y2="${f(y2)}"/>` +
    `<line x1="${f(x - 5)}" y1="${f(y1)}" x2="${f(x + 5)}" y2="${f(y1)}"/>` +
    `<line x1="${f(x - 5)}" y1="${f(y2)}" x2="${f(x + 5)}" y2="${f(y2)}"/>` +
    `</g>` +
    `<text x="${f(x + 16)}" y="${f(ym)}" text-anchor="middle" font-size="12"` +
    ` font-family="ui-monospace, monospace" fill="${NAVY}"` +
    ` transform="rotate(-90 ${f(x + 16)} ${f(ym)})">${esc(texto)}</text>`
  );
}

function corpo(
  categoriaId: string, subOpcao: string | undefined,
  x: number, y: number, w: number, h: number
): string {
  switch (categoriaId) {
    case 'box-frontal': {
      const n = numPaineis(subOpcao, 2);
      let s = rect(x, y, w, h);
      for (let i = 1; i < n; i++) s += lin(x + (w * i) / n, y, x + (w * i) / n, y + h);
      for (let i = 0; i < n; i++) s += circ(x + (w * (i + 0.5)) / n, y + 7, 2.5);
      return s;
    }
    case 'box-abrir': {
      const dp = w * 0.38; // largura da porta
      let s = rect(x, y, w, h);
      s += lin(x + w - dp, y, x + w - dp, y + h);
      s += circ(x + w, y + h * 0.22, 3);
      s += circ(x + w, y + h * 0.78, 3);
      s +=
        `<path d="M ${f(x + w - dp)} ${f(y)} A ${f(dp)} ${f(dp)} 0 0 1 ${f(x + w)} ${f(y + dp)}"` +
        ` fill="none" stroke="${NAVY}" stroke-width="1.2" stroke-dasharray="5 4"/>`;
      s += lin(x + w - dp + 7, y + h * 0.42, x + w - dp + 7, y + h * 0.58, 3);
      return s;
    }
    case 'box-canto': {
      const bw = w * 0.52;
      const bh = h * 0.4;
      const pts = [
        [x, y],
        [x + bw, y],
        [x + bw, y + h - bh],
        [x + w, y + h - bh],
        [x + w, y + h],
        [x, y + h],
      ]
        .map((p) => `${f(p[0])},${f(p[1])}`)
        .join(' ');
      let s = `<polygon points="${pts}" fill="#ffffff" stroke="${NAVY}" stroke-width="2"/>`;
      s += lin(x + bw, y + h - bh, x + bw, y + h, 1.2);
      s += lin(x + bw / 2, y, x + bw / 2, y + h - bh, 1);
      return s;
    }
    case 'janelas': {
      const n = numPaineis(subOpcao, 2);
      let s = rect(x, y, w, h);
      s += lin(x + w / 2, y, x + w / 2, y + h);
      if (n > 2) s += lin(x, y + h / 2, x + w, y + h / 2);
      return s;
    }
    case 'porta-correr': {
      const n = numPaineis(subOpcao, 2);
      let s = rect(x, y, w, h);
      s += lin(x, y, x + w, y, 4); // trilho superior
      for (let i = 1; i < n; i++) s += lin(x + (w * i) / n, y, x + (w * i) / n, y + h);
      for (let i = 0; i < n; i++) s += circ(x + (w * (i + 0.5)) / n, y + 10, 2.5);
      return s;
    }
    case 'porta-pivotante': {
      let s = rect(x, y, w, h);
      s += lin(x + w / 2, y, x + w / 2, y + h, 1.2, true); // eixo pivotante
      s += circ(x + w / 2, y + 8, 4, false);
      s += circ(x + w / 2, y + h - 8, 4, false);
      return s;
    }
    case 'espelho': {
      return rect(x, y, w, h, 2, 10);
    }
    case 'armario-pia': {
      let s = rect(x, y, w, h);
      s += lin(x + w / 2, y, x + w / 2, y + h); // duas portas
      s += lin(x + w / 2 - 9, y + h * 0.44, x + w / 2 - 9, y + h * 0.58, 3);
      s += lin(x + w / 2 + 9, y + h * 0.44, x + w / 2 + 9, y + h * 0.58, 3);
      return s;
    }
    case 'guarda-corpo': {
      let s = rect(x, y, w, h);
      const nP = Math.max(2, Math.min(6, Math.round(w / 60)));
      for (let i = 0; i <= nP; i++) s += lin(x + (w * i) / nP, y, x + (w * i) / nP, y + h, 2);
      s += lin(x, y, x + w, y, 4.5); // corrimão
      return s;
    }
    case 'cortina-vidro': {
      const n = 6;
      let s = rect(x, y, w, h);
      s += lin(x, y, x + w, y, 3.5); // trilho superior
      for (let i = 1; i < n; i++) s += lin(x + (w * i) / n, y, x + (w * i) / n, y + h, 1);
      return s;
    }
    default:
      return rect(x, y, w, h);
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

  const BX = 40;
  const BY = 16;
  const BW = 200;
  const BH = 268;
  const s = Math.min(BW / largura, BH / altura);
  const dw = largura * s;
  const dh = altura * s;
  const x0 = BX + (BW - dw) / 2;
  const y0 = BY + (BH - dh) / 2;

  const wAttr = dim?.width ?? String(SVG_W);
  const hAttr = dim?.height ?? String(SVG_H);

  let svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${wAttr}" height="${hAttr}"` +
    ` viewBox="0 0 ${SVG_W} ${SVG_H}" style="display:block">`;
  svg += `<rect x="0" y="0" width="${SVG_W}" height="${SVG_H}" fill="#ffffff"/>`;
  svg += corpo(o.categoriaId, o.subOpcao, x0, y0, dw, dh);
  svg += cotaH(x0, x0 + dw, y0 + dh + 32, rotL);
  svg += cotaV(x0 + dw + 32, y0, y0 + dh, rotA);
  if (o.titulo) {
    svg +=
      `<text x="${SVG_W / 2}" y="${SVG_H - 8}" text-anchor="middle" font-size="12"` +
      ` font-weight="bold" font-family="ui-monospace, monospace" fill="${NAVY}">${esc(o.titulo)}</text>`;
  }
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
          ctx.fillStyle = '#ffffff';
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
