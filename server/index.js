// ─── OrçaVidro Pro · Bot de WhatsApp (primeiro atendimento) ─────────────────
// Fluxo: boas-vindas → nome → endereço → tipo de serviço → confirmação.
// O bot NUNCA fala de preços/valores — isso é só com o Tito.
//
// Variáveis de ambiente (ver server/README.md):
//   VERIFY_TOKEN    – token de verificação do webhook na Meta
//   WHATSAPP_TOKEN  – token permanente da API do WhatsApp Cloud
//   PHONE_NUMBER_ID – ID do número de telefone no WhatsApp Cloud API
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

// ─── Máquina de estados da conversa ─────────────────────────────────────────
async function processarMensagem(telefone, textoRecebido) {
  const texto = (textoRecebido || '').trim();
  const estado = getEstado(telefone);

  // Comandos de reinício
  if (/^(cancelar|recomeçar|recomecar|reiniciar|menu)$/i.test(texto)) {
    resetarEstado(telefone);
    await enviarWhatsApp(telefone, textoBoasVindas());
    estados[telefone].etapa = 'aguardando_nome';
    salvarEstados();
    return;
  }

  // Se perguntou de preço em qualquer etapa: responde sem passar valores
  // (mas não interrompe o fluxo — continua de onde parou)
  if (texto && perguntaPreco(texto) && estado.etapa !== 'concluido' && estado.area === 'vidracaria') {
    await enviarWhatsApp(telefone, textoPreco());
    // Reenvia a pergunta atual para não travar a conversa
    if (estado.etapa === 'aguardando_nome') {
      await enviarWhatsApp(telefone, 'Qual é o seu *nome*?');
    } else if (estado.etapa === 'aguardando_endereco') {
      await enviarWhatsApp(telefone, textoPedeEndereco(estado.nome || 'amigo(a)'));
    } else if (estado.etapa === 'aguardando_servico') {
      await enviarWhatsApp(telefone, textoPedeServico());
    } else {
      await enviarWhatsApp(telefone, textoBoasVindas());
      estado.etapa = 'escolhendo_area';
      salvarEstados();
    }
    return;
  }

  switch (estado.etapa) {
    case 'inicio': {
      await enviarWhatsApp(telefone, textoBoasVindas());
      estado.etapa = 'escolhendo_area';
      salvarEstados();
      break;
    }

    case 'escolhendo_area': {
      const t = texto.toLowerCase();
      if (t === '1' || t.includes('vidro') || t.includes('envidra') || t.includes('oliveira')) {
        estado.area = 'vidracaria';
        estado.etapa = 'aguardando_nome';
        salvarEstados();
        await enviarWhatsApp(telefone, 'Ótimo! 🪟 Vamos falar de *envidraçamento*.\n\nQual é o seu *nome*?');
      } else if (t === '2' || t.includes('app') || t.includes('sistema') || t.includes('laa')) {
        estado.area = 'laaapps';
        estado.etapa = 'aguardando_nome_app';
        salvarEstados();
        await enviarWhatsApp(telefone, 'Ótimo! 📱 Vamos falar de *aplicativos e sistemas*.\n\nQual é o seu *nome*?');
      } else {
        await enviarWhatsApp(
          telefone,
          'Não entendi. 🤔\n\nDigite *1* para 🪟 *M. Oliveira Envidraçamentos*\nDigite *2* para 📱 *LAA-APPS*'
        );
      }
      break;
    }

    case 'aguardando_nome': {
      if (!texto) {
        await enviarWhatsApp(telefone, 'Não entendi. Qual é o seu *nome*?');
        break;
      }
      estado.nome = texto.slice(0, 80);
      estado.etapa = 'aguardando_endereco';
      salvarEstados();
      await enviarWhatsApp(telefone, textoPedeEndereco(estado.nome));
      break;
    }

    case 'aguardando_endereco': {
      if (!texto) {
        await enviarWhatsApp(telefone, 'Não entendi. Qual é o seu *endereço* (rua, número e bairro)?');
        break;
      }
      estado.endereco = texto.slice(0, 200);
      estado.etapa = 'aguardando_servico';
      salvarEstados();
      await enviarWhatsApp(telefone, textoPedeServico());
      break;
    }

    case 'aguardando_servico': {
      const servico = identificarServico(texto);
      if (!servico) {
        await enviarWhatsApp(
          telefone,
          'Hmm, não identifiquei esse serviço. 🤔\n\n' + textoPedeServico()
        );
        break;
      }
      estado.servico = servico;
      estado.etapa = 'concluido';
      salvarEstados();
      salvarLead(telefone, estado);
      await enviarWhatsApp(
        telefone,
        textoConfirmacao(estado.nome, estado.endereco, estado.servico)
      );
      break;
    }

    case 'aguardando_nome_app': {
      if (!texto) {
        await enviarWhatsApp(telefone, 'Não entendi. Qual é o seu *nome*?');
        break;
      }
      estado.nome = texto.slice(0, 80);
      estado.etapa = 'aguardando_projeto';
      salvarEstados();
      await enviarWhatsApp(telefone, textoPedeProjeto(estado.nome));
      break;
    }

    case 'aguardando_projeto': {
      if (!texto) {
        await enviarWhatsApp(telefone, 'Não entendi. Me conta um pouco sobre a sua ideia de *aplicativo ou sistema*?');
        break;
      }
      estado.projeto = texto.slice(0, 500);
      estado.etapa = 'concluido';
      salvarEstados();
      salvarLead(telefone, estado);
      await enviarWhatsApp(
        telefone,
        textoConfirmacaoApp(estado.nome, estado.projeto)
      );
      break;
    }

    case 'concluido': {
      // Conversa já finalizada: oferece recomeçar
      await enviarWhatsApp(
        telefone,
        'Seu pedido já está com a gente! ✅ Entraremos em contato em breve.\n\n' +
          'Se quiser fazer um *novo* pedido, é só escrever *recomeçar*.'
      );
      break;
    }

    default: {
      resetarEstado(telefone);
      await enviarWhatsApp(telefone, textoBoasVindas());
      estados[telefone].etapa = 'escolhendo_area';
      salvarEstados();
    }
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
  console.log('');
});
