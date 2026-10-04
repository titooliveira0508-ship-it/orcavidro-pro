// ─── OrçaVidro Pro · Bot de WhatsApp (primeiro atendimento) ─────────────────
// Bot conversacional inteligente: o cliente fala livremente, o bot identifica
// o nicho (vidraçaria ou LAA-APPS) e conduz com mensagens naturais e variadas.
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

// ─── Bot conversacional inteligente (sem dependência externa) ───────────────
// O cliente fala livremente; o bot identifica o nicho por palavras-chave
// e conduz a conversa com mensagens naturais e VARIADAS (não repete).
// Regras duras: nunca fala de preços, nunca inventa serviços.

// Palavras que indicam vidraçaria
const PALAVRAS_VIDRACARIA = [
  'vidro', 'blindex', 'box', 'espelho', 'janela', 'porta', 'banheiro',
  'sacada', 'cortina', 'guarda-corpo', 'guardacorpo', 'bascula', 'báscula',
  'pia', 'armario', 'armário', 'pivotante', 'correr', 'abrir', 'canto',
  'temperado', 'fumê', 'fume', 'verde', 'incolor', 'envidraça', 'vidraça',
];
// Palavras que indicam LAA-APPS
const PALAVRAS_APPS = [
  'app', 'aplicativo', 'sistema', 'site', 'software', 'programa', 'plataforma',
  'loja virtual', 'ecommerce', 'e-commerce', 'agendamento', 'delivery',
];

// Mensagens variadas — o bot alterna pra nunca soar robótico
const MSGS = {
  boasVindas: [
    'Olá! 👋 Bem-vindo(a)! Sou o assistente virtual. Me conta o que você precisa — pode falar livremente! 😊',
    'Oi! 👋 Que bom te ver por aqui! Sou o assistente virtual. Me diz como posso te ajudar hoje? 😊',
    'Olá! 👋 Sou o assistente virtual. Pode me contar o que você tá precisando? Tô aqui pra ajudar! 😊',
  ],
  pedeNome: [
    'Prazer! 😊 Qual é o seu *nome*?',
    'Que legal! E qual é o seu *nome* pra eu te chamar direitinho? 😊',
    'Perfeito! Me diz seu *nome* pra gente continuar? 😊',
  ],
  pedeEndereco: [
    'Qual é o seu *endereço* (rua, número e bairro)? 📍',
    'E onde fica? Me passa seu *endereço* (rua, número e bairro) 📍',
    'Beleza! Agora me diz o *endereço* onde vai ser o serviço 📍',
  ],
  pedeServico: [
    'E qual *serviço* você precisa? Pode falar com suas palavras — ex.: box pro banheiro, janela, espelho... 🪟',
    'Me conta: o que você precisa fazer? Tipo box, janela, porta de vidro, espelho... 🪟',
    'Qual trabalho você quer fazer? Descreve pra mim — box, espelho, janela, porta... 🪟',
  ],
  pedeProjeto: [
    'Que massa! 💡 Me conta mais sobre sua ideia — que tipo de aplicativo ou sistema você imagina?',
    'Adoro uma ideia nova! 💡 Descreve pra mim o app ou sistema que você tá pensando.',
    'Show! 💡 Me fala mais detalhes da sua ideia de aplicativo ou sistema.',
  ],
  preco: [
    'Sobre valores, cada orçamento aqui é *personalizado* de acordo com as medidas e o projeto 📐. O Tito vai analisar e te passar certinho, tá bom? 😉',
    'Boa pergunta! 😊 Mas os valores dependem das medidas e do projeto — o Tito monta um orçamento personalizado pra você. Pode continuar me contando o que precisa! 📐',
  ],
  naoEntendi: [
    'Hmm, não entendi muito bem 🤔. Pode me explicar de outro jeito?',
    'Ops, me perdi aqui 😅. Me conta de novo com outras palavras?',
  ],
  confirmaVidracaria: [
    'Fechado! ✅ Anotei tudo aqui.\n\nA *M. Oliveira Envidraçamentos* vai entrar em contato com você em breve. Obrigado! 🙏',
    'Prontinho! ✅ Seus dados já estão com a gente.\n\nA *M. Oliveira Envidraçamentos* te chama em breve. Valeu pelo contato! 🙏',
  ],
  confirmaApp: [
    'Fechado! ✅ Anotei sua ideia aqui.\n\nA *LAA-APPS* vai entrar em contato com você em breve. Obrigado! 🙏',
    'Prontinho! ✅ Sua ideia já tá registrada.\n\nA *LAA-APPS* te chama em breve pra conversar sobre o projeto. Valeu! 🙏',
  ],
  perguntaNicho: [
    'Me conta: é sobre *vidro/box/espelho* 🪟 ou sobre *aplicativo/sistema* 📱?',
    'Só pra eu te direcionar certinho: você precisa de algo pra *vidraçaria* 🪟 ou de um *app/sistema* 📱?',
  ],
  continua: [
    'Entendi! 👍 Me conta mais um pouco pra eu te ajudar melhor.',
    'Beleza! 😊 E o que mais você pode me dizer?',
    'Tô anotando aqui 📝. Me fala mais detalhes?',
  ],
};

// Retorna uma mensagem variada (alterna o índice por telefone pra não repetir)
function msgVariada(telefone, lista) {
  const estado = getEstado(telefone);
  const chave = '_msgIdx';
  const i = (estado[chave] || 0) % lista.length;
  estado[chave] = (estado[chave] || 0) + 1;
  salvarEstados();
  return lista[i];
}

function detectarNicho(texto) {
  const t = texto.toLowerCase();
  const ehVidro = PALAVRAS_VIDRACARIA.some((p) => t.includes(p));
  const ehApp = PALAVRAS_APPS.some((p) => t.includes(p));
  if (ehVidro && !ehApp) return 'vidracaria';
  if (ehApp && !ehVidro) return 'laaapps';
  if (ehVidro && ehApp) return 'ambos';
  return null;
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

// ─── Processamento inteligente da conversa ──────────────────────────────────
// O cliente fala livremente; o bot detecta o nicho e conduz com mensagens variadas.
async function processarMensagem(telefone, textoRecebido) {
  const texto = (textoRecebido || '').trim();
  const estado = getEstado(telefone);

  // Ignora mensagem duplicada (retry da Meta em <30s)
  if (texto && typeof mensagemDuplicada === 'function' && mensagemDuplicada(telefone, texto)) {
    console.log(`🔁 Mensagem duplicada ignorada de ${telefone}`);
    return;
  }

  // Comandos de reinício
  if (/^(cancelar|recomeçar|recomecar|reiniciar|menu)$/i.test(texto)) {
    resetarEstado(telefone);
    await enviarWhatsApp(telefone, msgVariada(telefone, MSGS.boasVindas));
    estado.etapa = 'ouvindo';
    salvarEstados();
    return;
  }

  // Pergunta de preço: responde sem valores, sem quebrar o fluxo
  if (texto && perguntaPreco(texto) && estado.etapa !== 'concluido') {
    await enviarWhatsApp(telefone, msgVariada(telefone, MSGS.preco));
    // Reenvia a pergunta atual
    const rep = {
      vid_nome: MSGS.pedeNome, app_nome: MSGS.pedeNome,
      vid_endereco: MSGS.pedeEndereco, vid_servico: MSGS.pedeServico,
      app_projeto: MSGS.pedeProjeto, perguntando_nicho: MSGS.perguntaNicho,
    }[estado.etapa];
    if (rep) await enviarWhatsApp(telefone, msgVariada(telefone, rep));
    else if (estado.etapa === 'inicio' || estado.etapa === 'ouvindo') {
      await enviarWhatsApp(telefone, msgVariada(telefone, MSGS.boasVindas));
      estado.etapa = 'ouvindo';
      salvarEstados();
    }
    return;
  }

  switch (estado.etapa) {
    case 'inicio': {
      await enviarWhatsApp(telefone, msgVariada(telefone, MSGS.boasVindas));
      estado.etapa = 'ouvindo';
      salvarEstados();
      break;
    }

    case 'ouvindo': {
      // Cliente falou livremente: tenta identificar o nicho
      const nicho = detectarNicho(texto);
      if (nicho === 'vidracaria') {
        estado.area = 'vidracaria';
        estado.etapa = 'vid_nome';
        salvarEstados();
        await enviarWhatsApp(telefone, 'Que bom! 🪟 ' + msgVariada(telefone, MSGS.pedeNome));
      } else if (nicho === 'laaapps') {
        estado.area = 'laaapps';
        estado.etapa = 'app_nome';
        salvarEstados();
        await enviarWhatsApp(telefone, 'Que massa! 📱 ' + msgVariada(telefone, MSGS.pedeNome));
      } else {
        estado.etapa = 'perguntando_nicho';
        salvarEstados();
        await enviarWhatsApp(telefone, msgVariada(telefone, MSGS.perguntaNicho));
      }
      break;
    }

    case 'perguntando_nicho': {
      const nicho = detectarNicho(texto);
      const t = texto.toLowerCase();
      if (nicho === 'vidracaria' || t === '1' || t.includes('vidro')) {
        estado.area = 'vidracaria';
        estado.etapa = 'vid_nome';
        salvarEstados();
        await enviarWhatsApp(telefone, 'Fechado! 🪟 ' + msgVariada(telefone, MSGS.pedeNome));
      } else if (nicho === 'laaapps' || t === '2' || t.includes('app') || t.includes('sistema')) {
        estado.area = 'laaapps';
        estado.etapa = 'app_nome';
        salvarEstados();
        await enviarWhatsApp(telefone, 'Fechado! 📱 ' + msgVariada(telefone, MSGS.pedeNome));
      } else {
        await enviarWhatsApp(telefone, msgVariada(telefone, MSGS.perguntaNicho));
      }
      break;
    }

    case 'vid_nome': {
      if (!texto || texto.length < 2) {
        await enviarWhatsApp(telefone, msgVariada(telefone, MSGS.pedeNome));
        break;
      }
      estado.nome = texto.slice(0, 80);
      estado.etapa = 'vid_endereco';
      salvarEstados();
      await enviarWhatsApp(telefone, `Prazer, ${estado.nome}! 😊 ` + msgVariada(telefone, MSGS.pedeEndereco));
      break;
    }

    case 'vid_endereco': {
      if (!texto || texto.length < 3) {
        await enviarWhatsApp(telefone, msgVariada(telefone, MSGS.pedeEndereco));
        break;
      }
      estado.endereco = texto.slice(0, 200);
      // Tenta já identificar o serviço na mesma mensagem (ex.: "preciso de box, moro na rua X")
      const serv = identificarServico(texto);
      if (serv) {
        estado.servico = serv;
        estado.etapa = 'concluido';
        salvarEstados();
        salvarLead(telefone, estado);
        await enviarWhatsApp(
          telefone,
          `✅ *Dados confirmados!*\n\n👤 ${estado.nome}\n📍 ${estado.endereco}\n🔧 ${serv}\n\n` +
          msgVariada(telefone, MSGS.confirmaVidracaria)
        );
      } else {
        estado.etapa = 'vid_servico';
        salvarEstados();
        await enviarWhatsApp(telefone, msgVariada(telefone, MSGS.pedeServico));
      }
      break;
    }

    case 'vid_servico': {
      const serv = identificarServico(texto);
      if (serv) {
        estado.servico = serv;
      } else if (texto && texto.length >= 3) {
        // Aceita descrição livre do serviço
        estado.servico = texto.slice(0, 120);
      } else {
        await enviarWhatsApp(telefone, msgVariada(telefone, MSGS.naoEntendi) + '\n\n' + msgVariada(telefone, MSGS.pedeServico));
        break;
      }
      estado.etapa = 'concluido';
      salvarEstados();
      salvarLead(telefone, estado);
      await enviarWhatsApp(
        telefone,
        `✅ *Dados confirmados!*\n\n👤 ${estado.nome}\n📍 ${estado.endereco}\n🔧 ${estado.servico}\n\n` +
        msgVariada(telefone, MSGS.confirmaVidracaria)
      );
      break;
    }

    case 'app_nome': {
      if (!texto || texto.length < 2) {
        await enviarWhatsApp(telefone, msgVariada(telefone, MSGS.pedeNome));
        break;
      }
      estado.nome = texto.slice(0, 80);
      estado.etapa = 'app_projeto';
      salvarEstados();
      await enviarWhatsApp(telefone, `Prazer, ${estado.nome}! 😊 ` + msgVariada(telefone, MSGS.pedeProjeto));
      break;
    }

    case 'app_projeto': {
      if (!texto || texto.length < 3) {
        await enviarWhatsApp(telefone, msgVariada(telefone, MSGS.pedeProjeto));
        break;
      }
      estado.projeto = texto.slice(0, 500);
      estado.etapa = 'concluido';
      salvarEstados();
      salvarLead(telefone, estado);
      await enviarWhatsApp(
        telefone,
        `✅ *Dados confirmados!*\n\n👤 ${estado.nome}\n💡 ${estado.projeto}\n\n` +
        msgVariada(telefone, MSGS.confirmaApp)
      );
      break;
    }

    case 'concluido': {
      await enviarWhatsApp(
        telefone,
        'Seu pedido já está com a gente! ✅ Entraremos em contato em breve.\n\nSe quiser fazer um *novo* pedido, é só escrever *recomeçar*.'
      );
      break;
    }

    default: {
      resetarEstado(telefone);
      await enviarWhatsApp(telefone, msgVariada(telefone, MSGS.boasVindas));
      estado.etapa = 'ouvindo';
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
  console.log('   💬 Bot conversacional inteligente ativo.');
  console.log('');
});
