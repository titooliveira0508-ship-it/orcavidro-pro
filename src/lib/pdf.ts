// ─── OrçaVidro Pro · Geração de PDF do orçamento (jspdf) ────────────────────
import { jsPDF } from 'jspdf';
import { ALTURAS, DadosEmpresa, ItemOrcamento } from '../types';
import { formatarMoeda } from './storage';

export interface DadosPdf {
  empresa: DadosEmpresa;
  numero?: number;
  clienteNome: string;
  clienteTelefone?: string;
  clienteEndereco?: string;
  itens: ItemOrcamento[];
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

const COR_TEMA: [number, number, number] = [13, 115, 119]; // teal-700
const CINZA: [number, number, number] = [100, 116, 139];
const PRETO: [number, number, number] = [30, 41, 59];

export function gerarPdfOrcamento(d: DadosPdf): void {
  const doc = new jsPDF();
  const margem = 14;
  const larguraUtil = 210 - margem * 2;
  let y = 16;

  function quebraPagina(espacoNecessario: number) {
    if (y + espacoNecessario > 278) {
      doc.addPage();
      y = 16;
    }
  }

  function textoQuebrado(texto: string, tamanho: number, cor: [number, number, number], espaco = 5) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(tamanho);
    doc.setTextColor(...cor);
    const linhas = doc.splitTextToSize(texto, larguraUtil);
    quebraPagina(linhas.length * espaco + 2);
    doc.text(linhas, margem, y);
    y += linhas.length * espaco;
  }

  // ── Cabeçalho da empresa ──────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...COR_TEMA);
  doc.text(d.empresa.nome || 'OrçaVidro Pro', margem, y);
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...CINZA);
  if (d.empresa.endereco) {
    const linhas = doc.splitTextToSize(d.empresa.endereco, larguraUtil);
    doc.text(linhas, margem, y);
    y += linhas.length * 5;
  }
  if (d.empresa.telefone) {
    doc.text(`Tel/WhatsApp: ${d.empresa.telefone}`, margem, y);
    y += 5;
  }
  y += 2;

  // Linha divisória
  doc.setDrawColor(...COR_TEMA);
  doc.setLineWidth(0.8);
  doc.line(margem, y, 210 - margem, y);
  y += 8;

  // ── Título + data ─────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...PRETO);
  const titulo = d.numero ? `ORÇAMENTO Nº ${d.numero}` : 'ORÇAMENTO';
  doc.text(titulo, margem, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...CINZA);
  const dataStr = d.dataEmissao.toLocaleDateString('pt-BR');
  doc.text(`Emitido em ${dataStr}`, 210 - margem, y, { align: 'right' });
  y += 8;

  // ── Dados do cliente ──────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...PRETO);
  doc.text('Cliente', margem, y);
  y += 6;
  textoQuebrado(`Nome: ${d.clienteNome}`, 10, PRETO);
  if (d.clienteTelefone) textoQuebrado(`Telefone: ${d.clienteTelefone}`, 10, PRETO);
  if (d.clienteEndereco) textoQuebrado(`Endereço: ${d.clienteEndereco}`, 10, PRETO);
  y += 3;

  // ── Itens ─────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...PRETO);
  doc.text(`Itens (${d.itens.length})`, margem, y);
  y += 4;

  d.itens.forEach((item, i) => {
    const detalhes = detalhesItem(item);
    const linhasDetalhe = doc.splitTextToSize(detalhes, larguraUtil - 52);
    const alturaBloco = 6 + linhasDetalhe.length * 4.5 + 4;
    quebraPagina(alturaBloco);

    // Faixa do item
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margem, y - 4, larguraUtil, alturaBloco, 2, 2, 'F');

    const yItem = y + 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...PRETO);
    const tituloItem = `${i + 1}. ${item.categoriaNome}${item.subOpcao ? ` — ${item.subOpcao}` : ''}`;
    const tituloCortado = doc.splitTextToSize(tituloItem, larguraUtil - 52);
    doc.text(tituloCortado.slice(0, 1), margem + 3, yItem);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...COR_TEMA);
    doc.text(formatarMoeda(item.valor), 210 - margem - 3, yItem, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...CINZA);
    doc.text(linhasDetalhe, margem + 3, yItem + 5);

    y += alturaBloco + 2;
  });

  y += 2;

  // ── Total ─────────────────────────────────────────────────────────────
  quebraPagina(20);
  doc.setFillColor(...COR_TEMA);
  doc.roundedRect(margem, y, larguraUtil, 14, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text('TOTAL', margem + 5, y + 9);
  doc.text(formatarMoeda(d.total), 210 - margem - 5, y + 9, { align: 'right' });
  y += 20;

  // ── Pagamento / validade / observações ─────────────────────────────────
  if (d.pagamento) {
    textoQuebrado(`Pagamento: ${d.pagamento}`, 10, PRETO);
  }
  textoQuebrado(
    `Validade do orçamento: ${d.validadeDias} ${d.validadeDias === 1 ? 'dia' : 'dias'}.`,
    10,
    PRETO
  );
  if (d.observacoes) {
    y += 1;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...PRETO);
    doc.text('Observações:', margem, y);
    y += 5;
    textoQuebrado(d.observacoes, 10, CINZA);
  }

  y += 8;
  quebraPagina(12);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.setTextColor(...CINZA);
  doc.text('Orçamento gerado pelo OrçaVidro Pro.', margem, y);

  // ── Download ──────────────────────────────────────────────────────────
  const nomeArquivo = d.numero
    ? `orcamento-${d.numero}.pdf`
    : `orcamento-${Date.now()}.pdf`;
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
