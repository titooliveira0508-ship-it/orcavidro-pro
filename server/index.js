// ─── OrçaVidro Pro · Bot de WhatsApp (primeiro atendimento) ─────────────────
// Fluxo: menu (1=vidraçaria, 2=LAA-APPS) → nome → endereço → tipo de serviço → confirmação.
// O bot NUNCA fala de preços/valores — isso é só com o Tito.
// As mensagens passam pelo Gemini para um tom mais humano e natural.
//
// Variáveis de ambiente (ver server/README.md):
//   VERIFY_TOKEN    – token de verificação do webhook na Meta
//   WHATSAPP_TOKEN  – token permanente da API do WhatsApp Cloud
//   PHONE_NUMBER_ID – ID do número de telefone no WhatsApp Cloud API
//   GEMINI_API_KEY  – chave da API do Gemini (para humanizar as mensagens)
//   PORT            – porta do servidor (padrão 3001)

const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || '';
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN || '';
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID || '';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

const STATE_FILE = path.join(__dirname, 'state.json');
const LEADS_FILE = path.join(__dirname, 'leads.json');

// ─── As 12 categorias de serviço (igual ao app) ─────────────────────────────
const SERVICOS = [
  'Box Frontal',
  'Box de Abrir',
  'Box de Canto',
  'Janelas',
  'Porta de Correr',
  'Porta Pivotante',
  'Espelho',
  'Armário de Pia',
  'Guarda-Corpo',
  'Cortina de Vidro',
  'Báscula',
  'Box Flex/Articulado',
];

// Palavras que indicam que o cliente está perguntando de preço.
// O bot nunca passa valores: responde que o orçamento é personalizado.
// (Atenção: "orçamento" NÃO está na lista — é palavra normal nesse contexto.)
const PALAVRAS_PRECO = [
  'preço', 'preco', 'valor', 'quanto', 'custa', 'custam',
  'tabela', 'promoção', 'promocao',
  'desconto', 'barato', 'caro',
];

// ─── Estado da conversa (por telefone) ──────────────────────────────────────
// estados: inicio → escolhendo_area → (vidraçaria: aguardando_nome → aguardando_endereco → aguardando_servico → concluido)
//                                → (laa-apps: aguardando_nome_app → aguardando_projeto → concluido)
let estados = {};
try {
  if (fs.existsSync(STATE_FILE)) {
    estados = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8') || '{}');
  }
} catch (e) {
  console.log('⚠️  Não foi possível ler state.json, começando do zero.');
}

function salvarEstados() {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(estados, null, 2), 'utf8');
  } catch (e) {
    console.log('⚠️  Erro ao salvar state.json:', e.message);
  }
}

function getEstado(telefone) {
  if (!estados[telefone]) {
    estados[telefone] = { etapa: 'inicio', area: '', nome: '', endereco: '', servico: '', projeto: '' };
  }
  return estados[telefone];
}

function resetarEstado(telefone) {
  estados[telefone] = { etapa: 'inicio', area: '', nome: '', endereco: '', servico: '', projeto: '' };
  salvarEstados();
}

// ─── Envio de mensagem via WhatsApp Cloud API ───────────────────────────────
async function enviarWhatsApp(para, texto) {
  if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
    console.log('⚠️  WHATSAPP_TOKEN ou PHONE_NUMBER_ID não configurados. Mensagem NÃO enviada:');
    console.log('   Para:', para);
    console.log('   Texto:', texto.slice(0, 120) + (texto.length > 120 ? '…' : ''));
    return false;
  }
  try {
    await axios.post(
      `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        to: para,
        type: 'text',
        text: { body: texto },
      },
      {
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return true;
  } catch (e) {
    const detalhe = e.response?.data ? JSON.stringify(e.response.data) : e.message;
    console.log('❌ Erro ao enviar mensagem para', para, '→', detalhe);
    return false;
  }
}

// ─── IA conversacional via Gemini ───────────────────────────────────────────
// O bot é 100% conduzido pela IA: o cliente fala livremente o que precisa,
// a IA identifica o nicho (vidraçaria ou apps) e conduz a conversa.
// Quando tiver todos os dados, a IA sinaliza com um bloco JSON [LEAD].
// Se o Gemini falhar, usa mensagens simples de fallback.

const SYSTEM_PROMPT = `Você é o atendente virtual de WhatsApp de dois negócios do Tito:

1. 🪟 M. OLIVEIRA ENVIDRAÇAMENTOS (vidraçaria no RJ) — trabalha SOMENTE com vidro temperado/blindex: box (frontal, de abrir, de canto, flex), janelas, portas de correr, porta pivotante, espelhos, armário de pia, guarda-corpo, cortina de vidro, báscula. NUNCA esquadrias de alumínio.

2. 📱 LAA-APPS — desenvolvimento de aplicativos e sistemas sob encomenda.

COMO CONVERSAR:
- Seja caloroso, natural e humano, como uma pessoa real no WhatsApp. Português brasileiro informal.
- Use 1-2 emojis por mensagem, sem exagero. Mensagens curtas (estilo WhatsApp).
- LEIA O HISTÓRICO com atenção: NUNCA repita uma pergunta que já foi feita. NUNCA peça de novo um dado que o cliente já deu.
- Varie as frases: cada resposta deve soar fresca, nunca copie e cole a mesma mensagem.
- Deixe o cliente falar livremente. Identifique sozinho se é vidraçaria ou app pela mensagem dele.
- Se não der pra identificar, pergunte de forma natural: "me conta, é sobre vidro/box ou sobre aplicativo/sistema?"
- Para VIDRAÇARIA, colete: nome da pessoa, endereço (rua, número, bairro) e tipo de serviço.
- Para LAA-APPS, colete: nome da pessoa e descrição da ideia do app/sistema.
- Faça UMA pergunta por vez, com naturalidade. Não interrogue de forma robótica.
- Se o cliente mandar algo fora do contexto (ex.: "oi", "bom dia"), responda com simpatia e retome de onde parou, sem recomeçar do zero.

REGRAS DURAS (nunca quebre):
- NUNCA informe preços, valores, orçamentos ou tabelas. Se perguntarem, diga que cada orçamento é personalizado e o Tito vai passar.
- NUNCA invente serviços que não existem na lista da vidraçaria.
- NUNCA diga que você é o Tito. Você é o assistente virtual.

QUANDO TIVER TODOS OS DADOS:
- Agradeça e confirme os dados de forma resumida.
- Diga que o responsável vai entrar em contato em breve.
- No FINAL da sua resposta, em linha separada, inclua EXATAMENTE este bloco (preencha os campos):
[LEAD]
{"area":"vidracaria ou laaapps","nome":"...","endereco":"...","servico":"...","projeto":"..."}
[/LEAD]
- Para vidraçaria preencha nome, endereco e servico (projeto vazio ""). Para apps preencha nome e projeto (endereco e servico vazios "").`;

// Histórico de conversa por telefone (últimas 20 mensagens)
function getHistorico(telefone) {
  const estado = getEstado(telefone);
  if (!estado.historico) estado.historico = [];
  return estado.historico;
}

function adicionarHistorico(telefone, papel, texto) {
  const hist = getHistorico(telefone);
  hist.push({ papel, texto: (texto || '').slice(0, 1000) });
  if (hist.length > 20) hist.splice(0, hist.length - 20);
  salvarEstados();
}

// Extrai o bloco [LEAD]...[/LEAD] da resposta da IA
function extrairLead(resposta) {
  const match = resposta.match(/\[LEAD\]\s*(\{[\s\S]*?\})\s*\[\/LEAD\]/);
  if (!match) return null;
  try {
    const dados = JSON.parse(match[1]);
    if (!dados.nome) return null;
    return dados;
  } catch (e) {
    return null;
  }
}

// Remove o bloco [LEAD] da mensagem antes de enviar ao cliente
function limparResposta(resposta) {
  return resposta.replace(/\[LEAD\][\s\S]*?\[\/LEAD\]/g, '').trim();
}

// Gera a resposta da IA com base no histórico
async function responderComIA(telefone, textoCliente) {
  if (!GEMINI_API_KEY) return null;
  try {
    const hist = getHistorico(telefone);
    const conversa = hist.map((h) =>
      h.papel === 'cliente' ? `Cliente: ${h.texto}` : `Atendente: ${h.texto}`
    ).join('\n');

    const prompt = SYSTEM_PROMPT +
      '\n\n--- HISTÓRICO DA CONVERSA ---\n' + (conversa || '(início da conversa)') +
      '\n\nCliente: ' + textoCliente +
      '\nAtendente:';

    const resp = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 600, temperature: 0.8 },
      },
      { timeout: 20000 }
    );
    const texto = resp.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    return texto || null;
  } catch (e) {
    console.log('⚠️  Gemini indisponível:', e.message);
    return null;
  }
}

// Mensagens simples de fallback (se a IA estiver fora do ar) — variadas pra não repetir
const FALLBACKS_CONTINUA = [
  'Entendi! 👍 Me conta mais um pouquinho pra eu te ajudar melhor.',
  'Beleza! 😊 E o que mais você pode me contar sobre o que precisa?',
  'Certo! Tô anotando aqui 📝. Me fala mais detalhes?',
  'Show! 👍 Continua que tô te ouvindo.',
];
function textoFallbackContinua(telefone) {
  const estado = getEstado(telefone);
  const i = (estado.fallbackIdx || 0) % FALLBACKS_CONTINUA.length;
  estado.fallbackIdx = (estado.fallbackIdx || 0) + 1;
  salvarEstados();
  return FALLBACKS_CONTINUA[i];
}

function textoFallbackBoasVindas() {
  return (
    'Olá! 👋 Bem-vindo(a)!\n\n' +
    'Sou o assistente virtual. Me conta o que você precisa — pode falar livremente! 😊'
  );
}

// Anti-duplicação: ignora a mesma mensagem se chegar repetida em <30s (retry da Meta)
function mensagemDuplicada(telefone, texto) {
  const estado = getEstado(telefone);
  const agora = Date.now();
  if (estado.ultimaMsg === texto && agora - (estado.ultimaMsgTs || 0) < 30000) {
    return true;
  }
  estado.ultimaMsg = texto;
  estado.ultimaMsgTs = agora;
  salvarEstados();
  return false;
}

// ─── Textos do bot (pt-BR) ──────────────────────────────────────────────────
function textoBoasVindas() {
  return (
    'Olá! 👋 Bem-vindo(a)!\n\n' +
    'Sou o assistente virtual. Com o que posso te ajudar?\n\n' +
    'Digite *1* para 🪟 *M. Oliveira Envidraçamentos* (vidros, boxes, espelhos)\n' +
    'Digite *2* para 📱 *LAA-APPS* (aplicativos e sistemas)'
  );
}

function textoPedeEndereco(nome) {
  return `Prazer, ${nome}! 😊\n\nQual é o seu *endereço* (rua, número e bairro)?`;
}

function textoPedeServico() {
  const lista = SERVICOS.map((s, i) => `${i + 1}. ${s}`).join('\n');
  return (
    'Perfeito! Agora me conta: qual *tipo de serviço* você precisa?\n\n' +
    lista +
    '\n\nÉ só me dizer o *número* ou o *nome* do serviço.'
  );
}

function textoConfirmacao(nome, endereco, servico) {
  return (
    '✅ *Dados confirmados!*\n\n' +
    `👤 Nome: ${nome}\n` +
    `📍 Endereço: ${endereco}\n` +
    `🔧 Serviço: ${servico}\n\n` +
    'A *M. Oliveira Envidraçamentos* vai entrar em contato com você em breve com o orçamento. Obrigado pelo contato! 🙏'
  );
}

function textoPedeProjeto(nome) {
  return (
    `Prazer, ${nome}! 😊\n\n` +
    'Me conta um pouco sobre a sua ideia: que tipo de *aplicativo ou sistema* você precisa? 📱💻\n\n' +
    'Pode descrever com suas palavras — ex.: "um app pra minha loja", "um sistema de agendamento", etc.'
  );
}

function textoConfirmacaoApp(nome, projeto) {
  return (
    '✅ *Dados confirmados!*\n\n' +
    `👤 Nome: ${nome}\n` +
    `💡 Projeto: ${projeto}\n\n` +
    'A *LAA-APPS* vai entrar em contato com você em breve. Obrigado pelo contato! 🙏'
  );
}

function textoPreco() {
  return (
    'Sobre valores, cada orçamento aqui é *personalizado* de acordo com as medidas e o projeto. 📐\n\n' +
    'O Tito vai analisar seu pedido e te passar o orçamento certinho, tá bom? 😉'
  );
}

// Tenta identificar o serviço pelo número (1-10) ou pelo nome.
function identificarServico(texto) {
  const t = texto.trim().toLowerCase();
  const numero = parseInt(t, 10);
  if (!isNaN(numero) && numero >= 1 && numero <= SERVICOS.length) {
    return SERVICOS[numero - 1];
  }
  const achou = SERVICOS.find((s) => t.includes(s.toLowerCase()));
  return achou || null;
}

function perguntaPreco(texto) {
  const t = texto.toLowerCase();
  return PALAVRAS_PRECO.some((p) => t.includes(p));
}

// ─── Salva o lead concluído ─────────────────────────────────────────────────
function salvarLead(telefone, dados) {
  const lead = {
    nome: dados.nome,
    telefone,
    area: dados.area === 'laaapps' ? 'LAA-APPS' : 'M. Oliveira Envidraçamentos',
    endereco: dados.endereco || '',
    servico: dados.servico || '',
    projeto: dados.projeto || '',
    data: new Date().toISOString(),
  };
  let leads = [];
  try {
    leads = JSON.parse(fs.readFileSync(LEADS_FILE, 'utf8') || '[]');
  } catch (e) {
    leads = [];
  }
  leads.push(lead);
  fs.writeFileSync(LEADS_FILE, JSON.stringify(leads, null, 2), 'utf8');

  console.log('');
  console.log('═══════════════════════════════════════');
  console.log('🔔 NOVO LEAD RECEBIDO!');
  console.log('   👤 Nome:    ', lead.nome);
  console.log('   📞 Telefone:', lead.telefone);
  console.log('   🏢 Área:    ', lead.area);
  if (lead.endereco) console.log('   📍 Endereço:', lead.endereco);
  if (lead.servico) console.log('   🔧 Serviço: ', lead.servico);
  if (lead.projeto) console.log('   💡 Projeto: ', lead.projeto);
  console.log('   📅 Data:    ', lead.data);
  console.log('═══════════════════════════════════════');
  console.log('');
}

// ─── Processamento da mensagem (100% IA) ────────────────────────────────────
async function processarMensagem(telefone, textoRecebido) {
  const texto = (textoRecebido || '').trim();
  const estado = getEstado(telefone);

  // Ignora mensagem duplicada (retry da Meta em <30s)
  if (texto && mensagemDuplicada(telefone, texto)) {
    console.log(`🔁 Mensagem duplicada ignorada de ${telefone}: ${texto.slice(0, 50)}`);
    return;
  }

  // Comandos de reinício
  if (/^(cancelar|recomeçar|recomecar|reiniciar|menu)$/i.test(texto)) {
    resetarEstado(telefone);
    adicionarHistorico(telefone, 'atendente', textoFallbackBoasVindas());
    await enviarWhatsApp(telefone, textoFallbackBoasVindas());
    return;
  }

  // Se a conversa já foi concluída e a pessoa continua falando: oferece recomeçar
  // (a IA também lida com isso, mas garantimos uma resposta mesmo sem Gemini)
  if (estado.etapa === 'concluido' && !GEMINI_API_KEY) {
    await enviarWhatsApp(
      telefone,
      'Seu pedido já está com a gente! ✅ Entraremos em contato em breve.\n\n' +
        'Se quiser fazer um *novo* pedido, é só escrever *recomeçar*.'
    );
    return;
  }

  // Registra a mensagem do cliente no histórico
  adicionarHistorico(telefone, 'cliente', texto);

  // Tenta responder com a IA
  const respostaIA = await responderComIA(telefone, texto);

  if (!respostaIA) {
    // Fallback: sem Gemini, usa mensagens variadas (não repete a mesma)
    const hist = getHistorico(telefone);
    const fallback = estado.etapa === 'inicio' || hist.length <= 1
      ? textoFallbackBoasVindas()
      : textoFallbackContinua(telefone);
    adicionarHistorico(telefone, 'atendente', fallback);
    await enviarWhatsApp(telefone, fallback);
    if (estado.etapa === 'inicio') estado.etapa = 'conversando';
    salvarEstados();
    return;
  }

  // Verifica se a IA concluiu o lead
  const lead = extrairLead(respostaIA);
  const textoLimpo = limparResposta(respostaIA);

  adicionarHistorico(telefone, 'atendente', textoLimpo);
  if (textoLimpo) {
    await enviarWhatsApp(telefone, textoLimpo);
  }

  if (lead) {
    estado.etapa = 'concluido';
    estado.area = lead.area;
    estado.nome = lead.nome || '';
    estado.endereco = lead.endereco || '';
    estado.servico = lead.servico || '';
    estado.projeto = lead.projeto || '';
    salvarEstados();
    salvarLead(telefone, estado);
  } else if (estado.etapa === 'inicio') {
    estado.etapa = 'conversando';
    salvarEstados();
  }
}

// ─── Rotas ──────────────────────────────────────────────────────────────────

// Health check
app.get('/health', (req, res) => {
  res.json({ ok: true, servico: 'orcavidro-pro-bot', timestamp: new Date().toISOString() });
});

// Verificação do webhook (a Meta chama isso ao configurar)
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('✅ Webhook verificado pela Meta.');
    res.status(200).send(challenge);
  } else {
    console.log('❌ Falha na verificação do webhook (token incorreto?).');
    res.sendStatus(403);
  }
});

// Recebimento de mensagens
app.post('/webhook', async (req, res) => {
  // Responde rápido para a Meta não reenviar
  res.sendStatus(200);

  try {
    const entry = req.body.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    if (!value || value.messaging_product !== 'whatsapp') return;

    const mensagens = value.messages || [];
    for (const msg of mensagens) {
      const telefone = msg.from; // ex.: "5521999999999"
      const tipo = msg.type;
      const texto = tipo === 'text' ? msg.text?.body : '';

      if (tipo !== 'text') {
        await enviarWhatsApp(
          telefone,
          'Recebi sua mensagem! 👍 Por enquanto consigo ler só mensagens de *texto*. Pode escrever pra mim?'
        );
        continue;
      }

      console.log(`📩 Mensagem de ${telefone}: ${texto}`);
      await processarMensagem(telefone, texto);
    }
  } catch (e) {
    console.log('❌ Erro ao processar webhook:', e.message);
  }
});

// Lista os leads capturados (útil para conferir)
app.get('/leads', (req, res) => {
  try {
    const leads = JSON.parse(fs.readFileSync(LEADS_FILE, 'utf8') || '[]');
    res.json(leads);
  } catch (e) {
    res.json([]);
  }
});

// ─── Start ──────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('');
  console.log('🤖 OrçaVidro Pro · Bot de WhatsApp no ar!');
  console.log(`   Porta: ${PORT}`);
  console.log(`   Webhook: GET/POST /webhook`);
  console.log(`   Health:  GET /health`);
  console.log(`   Leads:   GET /leads`);
  if (!VERIFY_TOKEN) console.log('   ⚠️  VERIFY_TOKEN não configurado!');
  if (!WHATSAPP_TOKEN) console.log('   ⚠️  WHATSAPP_TOKEN não configurado (modo teste: mensagens só no log).');
  if (!PHONE_NUMBER_ID) console.log('   ⚠️  PHONE_NUMBER_ID não configurado!');
  if (!GEMINI_API_KEY) console.log('   ⚠️  GEMINI_API_KEY não configurado (mensagens sem humanização).');
  else console.log('   ✨ Gemini ativado: mensagens humanizadas.');
  console.log('');
});
