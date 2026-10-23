// ─── OrçaVidro Pro · Conversa com IA ────────────────────────────────────────
// Atendimento com IA de verdade (conversa livre e natural), substituindo o
// formulário rígido como caminho principal.
//
// Cadeia de provedores:
//   1) Gemini (GEMINI_API_KEY) — provedor principal, mesma chave já usada
//      nos outros projetos do Tito.
//   2) OpenAI gpt-4o-mini (OPENAI_API_KEY) — SÓ entra se a variável existir
//      E o Gemini falhar.
//   3) Se a IA falhar/indisponível → quem chama (index.js) cai para o
//      formulário atual. O robô NUNCA fica mudo.
//
// REGRA DE OURO: a IA nunca passa preço/valor/estimativa/prazo fechado.
// Além da instrução no prompt, toda resposta passa por uma trava anti-preço
// (regex) antes de ser enviada — se disparar, entra uma resposta segura.
//
// Variáveis de ambiente:
//   GEMINI_API_KEY  – chave do Gemini (obrigatória p/ IA, sem ela = formulário)
//   GEMINI_MODEL    – modelo Gemini (padrão: gemini-2.0-flash)
//   OPENAI_API_KEY  – chave da OpenAI (opcional; ativa o fallback extra)
//   OPENAI_MODEL    – modelo OpenAI (padrão: gpt-4o-mini)
//   CONVERSA_IA=off – desliga a IA e usa só o formulário
//   IA_MOCK=1       – provedor falso determinístico, SÓ para testes locais.
//                     Nunca configurar em produção.

const axios = require('axios');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const IA_MOCK = process.env.IA_MOCK === '1';

const IA_ATIVA =
  process.env.CONVERSA_IA !== 'off' && (IA_MOCK || !!GEMINI_API_KEY || !!OPENAI_API_KEY);

// ─── Provedores ─────────────────────────────────────────────────────────────
// Contrato: chamarIA({ sistema, mensagens, json }) → texto da resposta.
// mensagens: [{ papel: 'cliente' | 'assistente', texto }]

async function chamarGemini({ sistema, mensagens, json }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
  const generationConfig = { temperature: 0.6, maxOutputTokens: 600 };
  if (json) generationConfig.responseMimeType = 'application/json';
  const resp = await axios.post(
    url,
    {
      systemInstruction: { parts: [{ text: sistema }] },
      contents: mensagens.map((m) => ({
        role: m.papel === 'assistente' ? 'model' : 'user',
        parts: [{ text: m.texto }],
      })),
      generationConfig,
    },
    {
      headers: { 'x-goog-api-key': GEMINI_API_KEY, 'Content-Type': 'application/json' },
      timeout: 20000,
    }
  );
  const parts = resp.data?.candidates?.[0]?.content?.parts || [];
  const texto = parts.map((p) => p.text || '').join('').trim();
  if (!texto) throw new Error('Gemini retornou resposta vazia');
  return texto;
}

async function chamarOpenAI({ sistema, mensagens, json }) {
  const body = {
    model: OPENAI_MODEL,
    temperature: 0.6,
    max_tokens: 600,
    messages: [
      { role: 'system', content: sistema },
      ...mensagens.map((m) => ({
        role: m.papel === 'assistente' ? 'assistant' : 'user',
        content: m.texto,
      })),
    ],
  };
  if (json) body.response_format = { type: 'json_object' };
  const resp = await axios.post('https://api.openai.com/v1/chat/completions', body, {
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    timeout: 20000,
  });
  const texto = (resp.data?.choices?.[0]?.message?.content || '').trim();
  if (!texto) throw new Error('OpenAI retornou resposta vazia');
  return texto;
}

// Provedor falso e determinístico — usado APENAS nos testes locais
// (IA_MOCK=1). IA_MOCK_FALHAR=1 simula a IA fora do ar.
function provedorMock({ mensagens, json }) {
  if (process.env.IA_MOCK_FALHAR === '1') {
    throw new Error('mock: IA fora do ar (falha simulada)');
  }
  const conversa = mensagens.map((m) => m.texto).join('\n');
  if (json) {
    const nome = (
      conversa.match(
        /(?:meu nome é|me chamo|sou o|sou a)\s+([A-ZÁÉÍÓÚÂÊÔÃÕÇ][\p{L}]+(?: [A-ZÁÉÍÓÚÂÊÔÃÕÇ][\p{L}]+){0,2})/iu
      ) || []
    )[1] || '';
    const endereco = (
      conversa.match(
        /((?:rua|avenida|av\.?|estrada|travessa|rodovia)\b[^.;\n]{0,60}?\d+[^.;\n]{0,40})/i
      ) || []
    )[1] || '';
    const serv = conversa.match(
      /(box|janela|porta de vidro|porta|espelho|guarda[-\s]?corpo|sacada|cortina de vidro|versatik|max system)/i
    );
    const detalhes = (conversa.match(/\d+(?:[.,]\d+)?\s*(?:cm|mm|m\b)/i) || [])[0] || '';
    return JSON.stringify({
      nome: nome.trim(),
      endereco: endereco.trim(),
      servico: serv ? serv[1] : '',
      detalhes: detalhes.trim(),
    });
  }
  // Resposta de conversa do mock: olha o marcador de estado do sistema.
  const sistemaTxt = mensagens.__sistema || '';
  const faltam = (sistemaTxt.match(/faltam:\s*([^\n]+)/i) || [])[1] || '';
  if (/nome/.test(faltam)) {
    return 'Oi! 😊 Consigo te ajudar sim. Pra começar, como você se chama?';
  }
  if (/endereco/.test(faltam)) {
    return 'Prazer! 😊 E onde vai ser a instalação? Me passa o logradouro, número e bairro 📍';
  }
  if (/servico/.test(faltam)) {
    return 'Beleza! E qual serviço de vidro você quer fazer?';
  }
  return 'Perfeito, já anotei aqui! ✅';
}

async function chamarIA(args) {
  if (IA_MOCK) {
    // Guarda o sistema p/ o mock conseguir montar a resposta de conversa.
    args.mensagens.__sistema = args.sistema;
    return provedorMock(args);
  }
  const erros = [];
  if (GEMINI_API_KEY) {
    try {
      return await chamarGemini(args);
    } catch (e) {
      const det = e.response?.data ? JSON.stringify(e.response.data).slice(0, 200) : e.message;
      erros.push(`gemini: ${det}`);
      console.log('⚠️  Gemini falhou:', det);
    }
  }
  if (OPENAI_API_KEY) {
    try {
      console.log('↪️  Tentando fallback OpenAI…');
      return await chamarOpenAI(args);
    } catch (e) {
      const det = e.response?.data ? JSON.stringify(e.response.data).slice(0, 200) : e.message;
      erros.push(`openai: ${det}`);
      console.log('⚠️  OpenAI falhou:', det);
    }
  }
  throw new Error('IA indisponível (' + (erros.join(' | ') || 'nenhum provedor configurado') + ')');
}

// ─── Trava anti-preço ───────────────────────────────────────────────────────
// Mesmo com a instrução no prompt, nenhuma resposta sai com cara de valor.
const PADROES_PRECO = [
  /r\$\s*\d/i, // R$ 123
  /\b\d{1,3}(?:\.\d{3})+,\d{2}\b/, // 1.234,56
  /\b\d+,\d{2}\s*(?:reais|real)?\b/i, // 250,00 (reais)
  /\b\d+\s*(?:reais|real)\b/i, // 250 reais
  /\b(?:custa|custam|custaria|custariam)\b/i,
  /\bpreço\s+(?:de|é|fica|seria|sai)\b/i,
  /\bvalor\s+(?:de|é|fica|seria|sai)\b[^.]{0,30}\d/i,
  /\bfica(?:m|r)?\s+(?:em|por)\s+(?:r\$|\d)/i, // "fica em 2.500"
  /\bsai\s+por\s+(?:r\$|\d)/i, // "sai por 900"
  /\ba\s+partir\s+de\s+(?:r\$|\d)/i, // "a partir de 500"
  /\bestimativa\s+de\s+(?:r\$|\d|preço|valor)/i,
  /\bpor\s+metro\b[^.]{0,30}(?:r\$|\d)/i, // preço por metro
];

function contemPreco(texto) {
  const t = texto || '';
  return PADROES_PRECO.some((r) => r.test(t));
}

// ─── Extração estruturada (defensiva) ───────────────────────────────────────
const SISTEMA_EXTRACAO =
  'Você é um extrator de dados de uma conversa de WhatsApp de uma vidraçaria. ' +
  'Analise a conversa (mensagens do Cliente e do Assistente) e retorne SOMENTE um JSON válido, sem texto extra, no formato:\n' +
  '{"nome": "", "endereco": "", "servico": "", "detalhes": ""}\n' +
  'Regras: preencha apenas com o que o CLIENTE afirmou explicitamente. Não invente nada. ' +
  '"nome" = nome do cliente. "endereco" = endereço da instalação (logradouro, número, bairro, cidade) que o cliente informou. ' +
  '"servico" = o serviço/produto desejado (ex.: box de banheiro, janela de vidro, espelho, guarda-corpo, envidraçamento de sacada). ' +
  '"detalhes" = medidas, cores, prazos ou observações úteis ditas pelo cliente. Campo desconhecido = "".';

function parseJSONDefensivo(texto) {
  if (!texto) return null;
  let t = String(texto).replace(/```json/gi, '').replace(/```/g, '').trim();
  const ini = t.indexOf('{');
  const fim = t.lastIndexOf('}');
  if (ini >= 0 && fim > ini) t = t.slice(ini, fim + 1);
  try {
    const o = JSON.parse(t);
    if (o && typeof o === 'object' && !Array.isArray(o)) return o;
  } catch (_) {
    /* cai pro null */
  }
  return null;
}

function campoTexto(o, chave, max) {
  const v = o && typeof o[chave] === 'string' ? o[chave].trim() : '';
  return v.slice(0, max);
}

async function extrairDados(historico) {
  const transcricao = historico
    .map((m) => `${m.papel === 'assistente' ? 'Assistente' : 'Cliente'}: ${m.texto}`)
    .join('\n');
  const bruto = await chamarIA({
    sistema: SISTEMA_EXTRACAO,
    mensagens: [{ papel: 'cliente', texto: transcricao }],
    json: true,
  });
  const o = parseJSONDefensivo(bruto);
  if (!o) return null; // sem dados novos — não é erro fatal
  return {
    nome: campoTexto(o, 'nome', 80),
    endereco: campoTexto(o, 'endereco', 200),
    servico: campoTexto(o, 'servico', 120),
    detalhes: campoTexto(o, 'detalhes', 300),
  };
}

// ─── Prompt de conversa ─────────────────────────────────────────────────────
function montarSistemaConversa(dados, faltam, confirmacao) {
  let s =
    'Você é o atendente virtual da M Oliveira Envidraçamentos, uma vidraçaria do Rio de Janeiro, atendendo pelo WhatsApp.\n' +
    'Fale como uma pessoa de verdade: simpático, natural, informal na medida certa. Respostas CURTAS (1 a 3 frases), estilo WhatsApp. ' +
    'Nada de textão, listas numeradas, menus ou tom de robô/formulário. Reaja ao que o cliente falou antes de perguntar o próximo item — uma coisa por vez.\n' +
    'Serviços da vidraçaria: box de banheiro, janelas, portas de vidro, espelhos, guarda-corpos, cortinas de vidro, envidraçamento de sacadas, sistemas Versatik e Max System.\n' +
    'Seu objetivo: descobrir com naturalidade (1) o nome do cliente, (2) o endereço onde o serviço será feito (logradouro, número e bairro) e (3) qual serviço ele quer — aproveitando medidas e detalhes que ele oferecer, sem forçar.\n' +
    'REGRA ABSOLUTA: você NUNCA fala preço, valor, estimativa, faixa de preço nem prazo fechado. Se perguntarem preço ou prazo, diga que cada caso é analisado e que o Tito (o responsável) prepara o orçamento e retorna com a proposta — e siga a conversa coletando os dados.\n' +
    'Não invente informações da empresa: nada de prometer desconto, garantia, marca ou prazo que não foi citado.\n' +
    '---\n' +
    `Dados já coletados nesta conversa — nome: ${dados.nome || '(ainda não)'} | endereço: ${dados.endereco || '(ainda não)'} | serviço: ${dados.servico || '(ainda não)'}\n` +
    `faltam: ${faltam.length ? faltam.join(', ') : 'nada'}\n`;
  if (confirmacao) {
    s +=
      'Os dados já estão completos e o pedido foi registrado. Apenas agradeça de forma natural, confirme resumidamente o que foi anotado (serviço e endereço) e avise que o Tito vai analisar e retornar com o orçamento. NÃO peça mais nenhum dado.';
  }
  return s;
}

// ─── Mensagens seguras (quando a trava anti-preço dispara) ──────────────────
function respostaSeguraPreco(dados) {
  let base =
    'Sobre valores eu não consigo te passar por aqui 😅 Cada serviço é analisado nas medidas, e o Tito prepara o orçamento e te retorna com a proposta certinha.';
  if (!dados.nome) base += '\n\nEnquanto isso, me fala: como você se chama?';
  else if (!dados.endereco) base += '\n\nMe passa o endereço onde vai ser o serviço? (logradouro, número e bairro) 📍';
  else if (!dados.servico) base += '\n\nE qual serviço você tá querendo fazer?';
  return base;
}

function mensagemConfirmacao(dados) {
  const primeiro = (dados.nome || '').split(' ')[0] || '';
  return (
    `Pronto${primeiro ? ', ' + primeiro : ''}! ✅ Já anotei tudo aqui: *${dados.servico}* em ${dados.endereco}.\n\n` +
    'O Tito vai analisar seu pedido e te retornar com o orçamento. Obrigado pelo contato! 🙏'
  );
}

// ─── Turno de conversa com IA ───────────────────────────────────────────────
// Lança erro se a IA estiver indisponível → index.js cai pro formulário.
function criarConversaIA(deps) {
  const { enviarWhatsApp, salvarLead, getEstado, salvarEstados } = deps;

  async function gerarResposta(estado, confirmacao) {
    const d = estado.dadosIA;
    const faltam = [];
    if (!d.nome) faltam.push('nome');
    if (!d.endereco) faltam.push('endereco');
    if (!d.servico) faltam.push('servico');
    const sistema = montarSistemaConversa(d, faltam, confirmacao);
    const texto = await chamarIA({ sistema, mensagens: estado.historicoIA, json: false });
    return (texto || '').trim();
  }

  async function processarComIA(telefone, texto) {
    const estado = getEstado(telefone);
    if (!estado.dadosIA) estado.dadosIA = { nome: '', endereco: '', servico: '', detalhes: '' };
    if (!Array.isArray(estado.historicoIA)) estado.historicoIA = [];
    estado.modoIA = true;
    estado.historicoIA.push({ papel: 'cliente', texto });
    if (estado.historicoIA.length > 16) {
      estado.historicoIA = estado.historicoIA.slice(-16);
    }

    // 1) Extração estruturada do que o cliente já informou
    const extraido = await extrairDados(estado.historicoIA);
    if (extraido) {
      for (const k of ['nome', 'endereco', 'servico', 'detalhes']) {
        if (extraido[k]) estado.dadosIA[k] = extraido[k];
      }
    }
    salvarEstados();

    const d = estado.dadosIA;
    const completo = !!(d.nome && d.endereco && d.servico);

    // 2) Dados completos → salva o lead (mesmo formato do formulário) e confirma
    if (completo && !estado.iaLeadSalvo) {
      const servicoFinal = (d.detalhes ? `${d.servico} — ${d.detalhes}` : d.servico).slice(0, 300);
      salvarLead(telefone, {
        nome: d.nome,
        area: 'vidracaria',
        endereco: d.endereco,
        servico: servicoFinal,
        projeto: '',
      });
      estado.iaLeadSalvo = true;
      estado.etapa = 'concluido';
      salvarEstados();

      let msg = '';
      try {
        msg = await gerarResposta(estado, true);
      } catch (_) {
        msg = '';
      }
      if (!msg || contemPreco(msg)) msg = mensagemConfirmacao(d);
      estado.historicoIA.push({ papel: 'assistente', texto: msg });
      salvarEstados();
      await enviarWhatsApp(telefone, msg);
      return;
    }

    // 3) Resposta conversacional normal
    let resposta = await gerarResposta(estado, false);
    if (!resposta) throw new Error('IA retornou resposta vazia');
    if (contemPreco(resposta)) {
      console.log('🛡️  Trava anti-preço: resposta da IA substituída por texto seguro.');
      resposta = respostaSeguraPreco(d);
    }
    estado.historicoIA.push({ papel: 'assistente', texto: resposta });
    salvarEstados();
    await enviarWhatsApp(telefone, resposta);
  }

  return { processarComIA, ativa: IA_ATIVA };
}

module.exports = {
  criarConversaIA,
  // Exportados para os testes locais:
  contemPreco,
  parseJSONDefensivo,
  IA_ATIVA,
};
