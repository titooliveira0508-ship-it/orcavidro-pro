// ─── OrçaVidro Pro · Geração de PDF do orçamento (jspdf) ────────────────────
// Layout profissional: cabeçalho com logo, tabela de itens com imagem,
// subtotal / desconto / total em destaque. Paleta da logo oficial.
import { jsPDF } from 'jspdf';
import { ALTURAS, DadosEmpresa, ItemOrcamento } from '../types';
import { getCategoria } from '../data/categorias';
import { formatarMoeda, quantidadeDe, totalItem } from './storage';

export interface DadosPdf {
  empresa: DadosEmpresa;
  numero?: number;
  clienteNome: string;
  clienteTelefone?: string;
  clienteEndereco?: string;
  itens: ItemOrcamento[];
  subtotal: number;
  desconto: number;
  total: number;
  validadeDias: number;
  observacoes?: string;
  pagamento?: string;
  dataEmissao: Date;
}

function rotuloAltura(item: ItemOrcamento): string {
  if (item.alturaOpcao === 'piso-teto') return 'Piso-teto';
  if (item.alturaMm) return `${item.alturaMm} mm`;
  return ALTURAS.find((a) => a.valor === item.alturaOpcao)?.rotulo ?? item.alturaOpcao;
}

function detalhesItem(item: ItemOrcamento): string {
  const partes: string[] = [];
  if (item.subOpcao) partes.push(item.subOpcao);
  const medidas: string[] = [];
  if (item.larguraMm) medidas.push(`L ${item.larguraMm} mm`);
  medidas.push(`A ${rotuloAltura(item)}`);
  partes.push(medidas.join(' × '));
  partes.push(`Vidro ${item.corVidro}`);
  partes.push(`Kit ${item.corKit}`);
  if (item.modeloDobradica) {
    partes.push(
      `Dobradiça ${item.modeloDobradica}${item.corDobradica ? ` (${item.corDobradica})` : ''}`
    );
  }
  if (item.pelicula) partes.push(`Película ${item.pelicula}`);
  if (item.observacao) partes.push(`Obs.: ${item.observacao}`);
  return partes.join(' · ');
}

// Paleta da logo oficial
const NAVY: [number, number, number] = [11, 42, 110]; // azul marinho
const BRAND: [number, number, number] = [15, 160, 242]; // azul brilhante
const CINZA: [number, number, number] = [100, 116, 139];
const CINZA_CLARO: [number, number, number] = [241, 245, 249];
const AZUL_CLARO: [number, number, number] = [226, 243, 254];
const PRETO: [number, number, number] = [30, 41, 59];
const BRANCO: [number, number, number] = [255, 255, 255];

export function gerarPdfOrcamento(d: DadosPdf): Promise<void> {
  return gerarPdfOrcamentoAsync(d);
}

// ─── Imagens (carregadas como base64, com cache) ────────────────────────────

const cacheImagens = new Map<string, string | null>();

function carregarImagem(caminho: string): Promise<string | null> {
  if (cacheImagens.has(caminho)) return Promise.resolve(cacheImagens.get(caminho) ?? null);
  return fetch(caminho)
    .then((resp) => {
      if (!resp.ok) throw new Error('falha ao carregar');
      return resp.blob();
    })
    .then(
      (blob) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        })
    )
    .then((base64) => {
      cacheImagens.set(caminho, base64);
      return base64;
    })
    .catch(() => {
      cacheImagens.set(caminho, null);
      return null;
    });
}

// ─── Layout ─────────────────────────────────────────────────────────────────
// Colunas da tabela de itens (mm, página A4 210mm, margem 14)
const MARGEM = 14;
const LARG_UTIL = 210 - MARGEM * 2; // 182
const COL_DESC_X = MARGEM; // descrição (com imagem)
const COL_QTD_X = 128; // quantidade (centro em 138)
const COL_UNIT_X = 148; // valor unitário (direita em 168)
const COL_TOTAL_X = 210 - MARGEM; // total do item (direita)
const ALT_LINHA_CAB = 9;

async function gerarPdfOrcamentoAsync(d: DadosPdf): Promise<void> {
  // Pré-carrega logo + ilustrações dos itens
  const logoBase64 = await carregarImagem('/logo.png').catch(() => null);
  const ilustracoes = new Map<string, string | null>();
  for (const item of d.itens) {
    const cat = getCategoria(item.categoriaId);
    if (cat && !ilustracoes.has(cat.ilustracao)) {
      ilustracoes.set(cat.ilustracao, await carregarImagem(cat.ilustracao));
    }
  }

  const doc = new jsPDF();
  let y = 14;
  let pagina = 1;

  function novaPagina() {
    doc.addPage();
    pagina += 1;
    y = 14;
  }

  function quebraPagina(espaco: number) {
    if (y + espaco > 282) novaPagina();
  }

  // ── 1. Cabeçalho: logo + empresa (esquerda) · ORÇAMENTO Nº (direita) ──
  const temLogo = !!logoBase64;
  if (temLogo) {
    try {
      doc.addImage(logoBase64 as string, 'PNG', MARGEM, y, 20, 30);
    } catch {
      /* segue sem logo */
    }
  }
  const xEmp = MARGEM + (temLogo ? 24 : 0);
  const largEmp = 210 - MARGEM - xEmp - 62; // reserva espaço p/ nº à direita

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...NAVY);
  const nomeEmp = doc.splitTextToSize(d.empresa.nome || 'OrçaVidro Pro', Math.max(largEmp, 40));
  doc.text(nomeEmp.slice(0, 2), xEmp, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...CINZA);
  let yEmp = y + 12;
  if (d.empresa.endereco) {
    const lEnd = doc.splitTextToSize(d.empresa.endereco, Math.max(largEmp, 40));
    doc.text(lEnd.slice(0, 2), xEmp, yEmp);
    yEmp += lEnd.slice(0, 2).length * 4;
  }
  if (d.empresa.telefone) {
    doc.text(`Tel/WhatsApp: ${d.empresa.telefone}`, xEmp, yEmp);
    yEmp += 4;
  }

  // Bloco do número do orçamento (direita)
  const xNum = 210 - MARGEM - 58;
  doc.setFillColor(...NAVY);
  doc.roundedRect(xNum, y, 58, 20, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...BRANCO);
  doc.text('ORÇAMENTO', xNum + 29, y + 7.5, { align: 'center' });
  doc.setFontSize(13);
  doc.text(d.numero ? `Nº ${d.numero}` : 'Nº —', xNum + 29, y + 15, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...CINZA);
  doc.text(`Emitido em ${d.dataEmissao.toLocaleDateString('pt-BR')}`, 210 - MARGEM, y + 26, {
    align: 'right',
  });

  y = Math.max(yEmp, y + 32) + 2;

  // Linha de destaque
  doc.setDrawColor(...BRAND);
  doc.setLineWidth(1);
  doc.line(MARGEM, y, 210 - MARGEM, y);
  y += 7;

  // ── 2. Dados do cliente (caixa destacada) ─────────────────────────────
  quebraPagina(30);
  doc.setFillColor(...AZUL_CLARO);
  doc.roundedRect(MARGEM, y, LARG_UTIL, 26, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...NAVY);
  doc.text('DADOS DO CLIENTE', MARGEM + 4, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...PRETO);
  const nomeCli = doc.splitTextToSize(d.clienteNome, LARG_UTIL - 8);
  doc.text(nomeCli.slice(0, 1), MARGEM + 4, y + 12.5);

  doc.setFontSize(9);
  doc.setTextColor(...CINZA);
  const contato: string[] = [];
  if (d.clienteTelefone) contato.push(d.clienteTelefone);
  if (d.clienteEndereco) contato.push(d.clienteEndereco);
  if (contato.length > 0) {
    const lCont = doc.splitTextToSize(contato.join('  ·  '), LARG_UTIL - 8);
    doc.text(lCont.slice(0, 2), MARGEM + 4, y + 18);
  }
  y += 32;

  // ── 3. Tabela de itens ────────────────────────────────────────────────
  function cabecalhoTabela() {
    quebraPagina(ALT_LINHA_CAB + 6);
    doc.setFillColor(...NAVY);
    doc.roundedRect(MARGEM, y, LARG_UTIL, ALT_LINHA_CAB, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...BRANCO);
    doc.text('DESCRIÇÃO', COL_DESC_X + 3, y + 6);
    doc.text('QTD', COL_QTD_X + 10, y + 6, { align: 'center' });
    doc.text('VALOR UNIT.', COL_UNIT_X + 20, y + 6, { align: 'right' });
    doc.text('TOTAL', COL_TOTAL_X - 2, y + 6, { align: 'right' });
    y += ALT_LINHA_CAB + 1.5;
  }

  cabecalhoTabela();

  d.itens.forEach((item, i) => {
    const qtd = quantidadeDe(item);
    const cat = getCategoria(item.categoriaId);
    const imgBase64 = cat ? ilustracoes.get(cat.ilustracao) ?? null : null;
    const temImg = !!imgBase64;

    const tituloItem = `${item.categoriaNome}${item.subOpcao ? ` — ${item.subOpcao}` : ''}`;
    const detalhes = detalhesItem(item);
    const largTexto = COL_QTD_X - COL_DESC_X - (temImg ? 24 : 6);
    const lTitulo = doc.splitTextToSize(tituloItem, largTexto);
    const lDetalhes = doc.splitTextToSize(detalhes, largTexto);
    const alturaLinha = Math.max(20, 5 + lTitulo.slice(0, 2).length * 4.5 + lDetalhes.slice(0, 4).length * 3.8 + 3);

    // Se não couber, nova página + repete cabeçalho
    if (y + alturaLinha > 278) {
      novaPagina();
      cabecalhoTabela();
    }

    // Faixa zebrada
    if (i % 2 === 1) {
      doc.setFillColor(...CINZA_CLARO);
      doc.rect(MARGEM, y, LARG_UTIL, alturaLinha, 'F');
    }

    const xTxt = COL_DESC_X + (temImg ? 23 : 3);
    const yTxt = y + 5.5;

    if (temImg && imgBase64) {
      try {
        doc.addImage(imgBase64, 'PNG', COL_DESC_X + 3, y + 2, 17, 17);
      } catch {
        /* segue sem imagem */
      }
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...PRETO);
    doc.text(lTitulo.slice(0, 2), xTxt, yTxt);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...CINZA);
    doc.text(lDetalhes.slice(0, 4), xTxt, yTxt + lTitulo.slice(0, 2).length * 4.5 + 1);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...PRETO);
    doc.text(String(qtd), COL_QTD_X + 10, yTxt + 2, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.text(formatarMoeda(item.valor), COL_UNIT_X + 20, yTxt + 2, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...NAVY);
    doc.text(formatarMoeda(totalItem(item)), COL_TOTAL_X - 2, yTxt + 2, { align: 'right' });

    y += alturaLinha;
  });

  y += 4;

  // ── 4. Totais ─────────────────────────────────────────────────────────
  quebraPagina(34);
  const xTot = 210 - MARGEM - 78;
  const largTot = 78;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...CINZA);
  doc.text('Subtotal', xTot, y + 5);
  doc.setTextColor(...PRETO);
  doc.text(formatarMoeda(d.subtotal), 210 - MARGEM, y + 5, { align: 'right' });
  y += 7;

  if (d.desconto > 0) {
    doc.setTextColor(...CINZA);
    doc.text('Desconto', xTot, y + 5);
    doc.setTextColor(5, 150, 105);
    doc.text(`− ${formatarMoeda(d.desconto)}`, 210 - MARGEM, y + 5, { align: 'right' });
    y += 7;
  }

  doc.setFillColor(...NAVY);
  doc.roundedRect(xTot - 4, y, largTot + 4, 13, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...BRANCO);
  doc.text('TOTAL', xTot, y + 8.5);
  doc.text(formatarMoeda(d.total), 210 - MARGEM, y + 8.5, { align: 'right' });
  y += 20;

  // ── 5. Pagamento / validade / observações ─────────────────────────────
  quebraPagina(30);
  doc.setDrawColor(...BRAND);
  doc.setLineWidth(0.6);
  doc.line(MARGEM, y, 210 - MARGEM, y);
  y += 6;

  function linhaInfo(rotulo: string, valor: string) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...NAVY);
    const lRot = `${rotulo}: `;
    doc.text(lRot, MARGEM, y);
    const wRot = doc.getTextWidth(lRot);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...PRETO);
    const lVal = doc.splitTextToSize(valor, LARG_UTIL - wRot);
    doc.text(lVal, MARGEM + wRot, y);
    y += lVal.length * 5;
  }

  if (d.pagamento) linhaInfo('Pagamento', d.pagamento);
  linhaInfo(
    'Validade',
    `Este orçamento é válido por ${d.validadeDias} ${d.validadeDias === 1 ? 'dia' : 'dias'}.`
  );
  if (d.observacoes) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...NAVY);
    doc.text('Observações:', MARGEM, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...PRETO);
    const lObs = doc.splitTextToSize(d.observacoes, LARG_UTIL);
    quebraPagina(lObs.length * 5 + 10);
    doc.text(lObs, MARGEM, y);
    y += lObs.length * 5;
  }

  y += 10;
  quebraPagina(10);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8.5);
  doc.setTextColor(...CINZA);
  doc.text('Orçamento gerado pelo OrçaVidro Pro.', MARGEM, y);

  // ── Download ──────────────────────────────────────────────────────────
  const nomeArquivo = d.numero ? `orcamento-${d.numero}.pdf` : `orcamento-${Date.now()}.pdf`;
  doc.save(nomeArquivo);
}

// ─── WhatsApp ────────────────────────────────────────────────────────────────

export function soDigitos(telefone: string): string {
  return telefone.replace(/\D/g, '');
}

export function linkWhatsApp(telefone: string, mensagem: string): string {
  return `https://wa.me/${soDigitos(telefone)}?text=${encodeURIComponent(mensagem)}`;
}

export function mensagemOrcamento(
  clienteNome: string,
  numero: number | undefined,
  total: number
): string {
  const ref = numero ? `nº ${numero}` : 'em anexo';
  const primeiroNome = clienteNome.split(' ')[0] || 'cliente';
  return (
    `Olá, ${primeiroNome}! Aqui é da OrçaVidro Pro. ` +
    `Segue o orçamento ${ref} no valor de ${formatarMoeda(total)}. ` +
    `Qualquer dúvida estou à disposição!`
  );
}
