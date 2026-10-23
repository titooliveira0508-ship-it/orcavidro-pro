// ─── OrçaVidro Pro · Conversa com IA ────────────────────────────────────────
// Atendimento com IA de verdade (conversa livre e natural), substituindo o
// formulário rígido como caminho principal.
//
// Este WhatsApp é a porta de entrada do GRUPO OLIVEIRA (os dois negócios
// do Tito). A IA abre a conversa com a saudação oficial do grupo — sempre
// retribuindo o cumprimento do cliente — e, quando ainda não sabe o que
// ele quer, faz a pergunta-guia com educação: envidraçamento 🪟 ou
// aplicativo/site 📱. Daí seguem dois ramos de coleta:
//   · vidracaria → nome, endereço, serviço de vidro
//                  (lead salvo com area 'M. Oliveira Envidraçamentos')
//   · laaapps    → nome, o que procura (aplicativo/site/sistema),
//                  pra qual negócio é e um contato para retorno
//                  (lead salvo com area 'LAA-APPS')
// Se o cliente já chegar falando o que quer, nada de pergunta-guia:
// a IA identifica o ramo pelo assunto e segue direto.
//
// Cadeia de provedores:
//   1) Gemini (GEMINI_API_KEY) — provedor principal, mesma chave já usada
//      nos outros projetos do Tito.
//   2) OpenAI gpt-4o-mini (OPENAI_API_KEY) — SÓ entra se a variável existir
//      E o Gemini falhar.
//   3) Invision (INVISION_API_KEY) — gateway compatível com OpenAI, camada
//      extra de fallback: SÓ entra se a variável existir E os anteriores
//      falharem. (Entrou porque o gemini-3.8-flash, em produção, aceita a
//      chamada mas nunca responde — timeout atrás de timeout e o bot caía
//      pro formulário seco; a Invision responde em segundos.)
//   4) Se a IA falhar/indisponível → quem chama (index.js) cai para o
//      formulário atual. O robô NUNCA fica mudo.
//
// REGRA DE OURO: a IA nunca passa preço/valor/estimativa/prazo fechado.
// Além da instrução no prompt, toda resposta passa por uma trava anti-preço
// (regex) antes de ser enviada — se disparar, entra uma resposta segura.
//
// Variáveis de ambiente:
//   GEMINI_API_KEY  – chave do Gemini (obrigatória p/ IA, sem ela = formulário)
//   GEMINI_MODEL    – modelo Gemini (padrão: gemini-3.8-flash)
//   OPENAI_API_KEY  – chave da OpenAI (opcional; ativa o fallback extra)
//   OPENAI_MODEL    – modelo OpenAI (padrão: gpt-4o-mini)
//   INVISION_API_KEY – chave da Invision (opcional; ativa o fallback extra)
//   INVISION_MODEL  – modelo Invision (padrão: openai/gpt-6-astra-invision)
//   CONVERSA_IA=off – desliga a IA e usa só o formulário
//   IA_MOCK=1       – provedor falso determinístico, SÓ para testes locais.
//                     Nunca configurar em produção.

const axios = require('axios');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const INVISION_API_KEY = process.env.INVISION_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const INVISION_MODEL = process.env.INVISION_MODEL || 'openai/gpt-6-astra-invision';
const IA_MOCK = process.env.IA_MOCK === '1';
// Timeout das chamadas aos provedores de IA. 20s era pouco pro Gemini
// em produção (Render): quase toda mensagem estourava o prazo e o bot
// caía pro formulário seco. 45s dá folga sem deixar o cliente preso.
const IA_TIMEOUT_MS = 45000;

const IA_ATIVA =
  process.env.CONVERSA_IA !== 'off' &&
  (IA_MOCK || !!GEMINI_API_KEY || !!OPENAI_API_KEY || !!INVISION_API_KEY);

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
      timeout: IA_TIMEOUT_MS,
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
    timeout: IA_TIMEOUT_MS,
  });
  const texto = (resp.data?.choices?.[0]?.message?.content || '').trim();
  if (!texto) throw new Error('OpenAI retornou resposta vazia');
  return texto;
}

// Invision: gateway compatível com a API da OpenAI — mesmo formato de
// chamada/resposta do chamarOpenAI, muda só o endereço, a chave e o modelo.
async function chamarInvision({ sistema, mensagens, json }) {
  const body = {
    model: INVISION_MODEL,
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
  const resp = await axios.post('https://invision.dreamvision.com.br/v1/chat/completions', body, {
    headers: { Authorization: `Bearer ${INVISION_API_KEY}`, 'Content-Type': 'application/json' },
    timeout: IA_TIMEOUT_MS,
  });
  const texto = (resp.data?.choices?.[0]?.message?.content || '').trim();
  if (!texto) throw new Error('Invision retornou resposta vazia');
  return texto;
}

// Provedor falso e determinístico — usado APENAS nos testes locais
// (IA_MOCK=1). IA_MOCK_FALHAR=1 simula a IA fora do ar.
function provedorMock({ mensagens, json }) {
  if (process.env.IA_MOCK_FALHAR === '1') {
    throw new Error('mock: IA fora do ar (falha simulada)');
  }
  const conversa = mensagens.map((m) => m.texto).join('\n');
  // Só as falas do cliente (a transcrição vem rotulada "Cliente: ...").
  const clienteTxt = conversa
    .split('\n')
    .filter((l) => /^Cliente:/i.test(l))
    .join('\n');
  const baseRamo = clienteTxt || conversa;
  if (json) {
    // Extração olha SÓ as falas do cliente (como o extrator de verdade):
    // senão a apresentação do assistente ("Sou o assistente...") viraria
    // um "nome" falso.
    const nome = (
      baseRamo.match(
        /(?:meu nome é|me chamo|sou o|sou a)\s+([A-ZÁÉÍÓÚÂÊÔÃÕÇ][\p{L}]+(?: [A-ZÁÉÍÓÚÂÊÔÃÕÇ][\p{L}]+){0,2})/iu
      ) || []
    )[1] || '';
    const endereco = (
      baseRamo.match(
        /((?:rua|avenida|av\.?|estrada|travessa|rodovia)\b[^.;\n]{0,60}?\d+[^.;\n]{0,40})/i
      ) || []
    )[1] || '';
    const serv = baseRamo.match(
      /(box|janela|porta de vidro|porta|espelho|guarda[-\s]?corpo|sacada|cortina de vidro|versatik|max system)/i
    );
    const detalhes = (baseRamo.match(/\d+(?:[.,]\d+)?\s*(?:cm|mm|m\b)/i) || [])[0] || '';
    // Ramo + campos do ramo de aplicativos/sites (só falas do cliente).
    const appMatch = baseRamo.replace(/max\s*system/gi, '').match(/(aplicativo|\bapp\b|site|sistema)/i);
    let ramo = '';
    if (serv) ramo = 'vidracaria';
    else if (appMatch) ramo = 'laaapps';
    let tipo = '';
    if (appMatch) {
      tipo = /site/i.test(appMatch[0]) ? 'site' : /sistema/i.test(appMatch[0]) ? 'sistema' : 'aplicativo';
    }
    const negocio =
      ((baseRamo.match(/(?:pra|para)\s+(?:minha\s+|meu\s+)([\p{L}][\p{L} ]{1,28})/iu) || [])[1] ||
        (baseRamo.match(
          /\b(lanchonete|loja|restaurante|pizzaria|barbearia|oficina|clínica|clinica|academia|mercado|salão|salao)\b/i
        ) || [])[1] ||
        '')
        .trim()
        .replace(/[.!?…]+$/, '');
    let contato = '';
    const email = baseRamo.match(/[\w.+-]+@[\w-]+\.[\w.]+/);
    if (email) contato = email[0];
    else if (/whats/i.test(baseRamo)) contato = 'este WhatsApp';
    return JSON.stringify({
      nome: nome.trim(),
      ramo,
      endereco: endereco.trim(),
      servico: serv ? serv[1] : '',
      detalhes: detalhes.trim(),
      tipo,
      negocio,
      contato,
    });
  }
  // Resposta de conversa do mock: olha os marcadores de estado do sistema.
  const sistemaTxt = mensagens.__sistema || '';
  const faltam = (sistemaTxt.match(/faltam:\s*([^\n]+)/i) || [])[1] || '';
  const ramoMock = ((sistemaTxt.match(/(?:^|\n)ramo:\s*(laaapps|vidracaria)/) || [])[1] || '');
  const inicioMock = /inicio:\s*sim/.test(sistemaTxt);
  const ultimaCliente = [...mensagens].reverse().find((m) => m.papel === 'cliente');
  const textoCliente = ultimaCliente ? ultimaCliente.texto : '';
  // Abertura sem ramo definido → saudação oficial do Grupo Oliveira + pergunta-guia.
  if (inicioMock && !ramoMock) {
    const saud = /boa noite/i.test(textoCliente)
      ? 'Boa noite! 😊'
      : /bom dia/i.test(textoCliente)
        ? 'Bom dia! 😊'
        : /boa tarde/i.test(textoCliente)
          ? 'Boa tarde! 😊'
          : 'Oi! 😊';
    return (
      saud +
      ' Sou o assistente do Grupo Oliveira. Como posso te ajudar? ' +
      'Precisa de serviço de envidraçamento 🪟 ou está procurando um aplicativo ou site para o seu negócio 📱?'
    );
  }
  if (ramoMock === 'laaapps') {
    if (/nome/.test(faltam)) {
      return 'Consigo te ajudar sim! 😊 Pra começar, como você se chama?';
    }
    if (/tipo/.test(faltam)) {
      return 'E você procura um aplicativo, um site ou um sistema?';
    }
    if (/negocio/.test(faltam)) {
      return 'Boa! E é pra qual negócio?';
    }
    if (/contato/.test(faltam)) {
      return 'E qual o melhor contato pra equipe te retornar? Pode ser este WhatsApp mesmo 😊';
    }
    return 'Perfeito, já anotei aqui! ✅';
  }
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

// Falha que vale UMA nova tentativa no Gemini: timeout, erro de rede
// (sem resposta) ou erro 5xx do servidor. Erro 4xx (ex.: 404 de modelo
// aposentado) NÃO adianta repetir — cai direto pro próximo provedor.
function ehErroRetentavel(e) {
  const texto = `${(e && e.message) || ''} ${(e && e.code) || ''}`;
  if (/timeout/i.test(texto)) return true;
  if (!e || !e.response) return true;
  return typeof e.response.status === 'number' && e.response.status >= 500;
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
      console.log('⚠️  Gemini falhou:', det);
      if (ehErroRetentavel(e)) {
        console.log('↪️  Tentando o Gemini novamente…');
        try {
          return await chamarGemini(args);
        } catch (e2) {
          const det2 = e2.response?.data ? JSON.stringify(e2.response.data).slice(0, 200) : e2.message;
          erros.push(`gemini: ${det2}`);
          console.log('⚠️  Gemini falhou:', det2);
        }
      } else {
        erros.push(`gemini: ${det}`);
      }
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
  if (INVISION_API_KEY) {
    try {
      console.log('↪️  Tentando fallback Invision…');
      return await chamarInvision(args);
    } catch (e) {
      const det = e.response?.data ? JSON.stringify(e.response.data).slice(0, 200) : e.message;
      erros.push(`invision: ${det}`);
      console.log('⚠️  Invision falhou:', det);
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
  'Você é um extrator de dados de uma conversa de WhatsApp do Grupo Oliveira (a vidraçaria M Oliveira Envidraçamentos e a LAA-APPS, de aplicativos/sites/sistemas). ' +
  'Analise a conversa (mensagens do Cliente e do Assistente) e retorne SOMENTE um JSON válido, sem texto extra, no formato:\n' +
  '{"nome": "", "ramo": "", "endereco": "", "servico": "", "detalhes": "", "tipo": "", "negocio": "", "contato": ""}\n' +
  'Regras: preencha apenas com o que o CLIENTE afirmou explicitamente. Não invente nada. ' +
  '"nome" = nome do cliente/pessoa. ' +
  '"ramo" = "vidracaria" se o assunto é vidro, box, janela, espelho, guarda-corpo ou sacada; "laaapps" se o assunto é aplicativo, site ou sistema; "" se ainda não dá pra saber. ' +
  '"endereco" = endereço da instalação (logradouro, número, bairro, cidade) que o cliente informou (só ramo vidracaria). ' +
  '"servico" = o serviço/produto de vidro desejado (ex.: box de banheiro, janela de vidro, espelho, guarda-corpo, envidraçamento de sacada). ' +
  '"tipo" = (só ramo laaapps) o que a pessoa procura: "aplicativo", "site" ou "sistema". ' +
  '"negocio" = (só ramo laaapps) o negócio da pessoa (ex.: lanchonete, loja de roupas, clínica). ' +
  '"contato" = (só ramo laaapps) o contato para retorno que a pessoa informou (telefone, e-mail ou "este WhatsApp"). ' +
  '"detalhes" = medidas, descrição da ideia, cores, prazos ou observações úteis ditas pelo cliente. Campo desconhecido = "".';

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
  const ramoBruto = campoTexto(o, 'ramo', 20).toLowerCase();
  return {
    nome: campoTexto(o, 'nome', 80),
    ramo: ramoBruto === 'vidracaria' || ramoBruto === 'laaapps' ? ramoBruto : '',
    endereco: campoTexto(o, 'endereco', 200),
    servico: campoTexto(o, 'servico', 120),
    detalhes: campoTexto(o, 'detalhes', 300),
    tipo: campoTexto(o, 'tipo', 40),
    negocio: campoTexto(o, 'negocio', 120),
    contato: campoTexto(o, 'contato', 120),
  };
}

// ─── Prompt de conversa ─────────────────────────────────────────────────────
// Saudação oficial do GRUPO OLIVEIRA: educação primeiro (retribuir o
// cumprimento), apresentação breve do grupo e — só quando ainda não se
// sabe o que o cliente quer — a pergunta-guia dos dois ramos. Se o
// cliente já chegar falando o que quer, a IA identifica o ramo e segue
// direto, sem pergunta-guia.
function montarSistemaConversa(ctx) {
  const { ramo, inicio, dadosIA, dadosApps, faltam, confirmacao } = ctx;
  let s =
    'Você é o assistente virtual do GRUPO OLIVEIRA, atendendo pelo WhatsApp. O grupo reúne dois negócios: a M OLIVEIRA ENVIDRAÇAMENTOS (vidraçaria no Rio de Janeiro) e a LAA-APPS (aplicativos, sites e sistemas sob encomenda).\n' +
    'EDUCAÇÃO ANTES DE TUDO: se o cliente cumprimentar (oi, olá, bom dia, boa tarde, boa noite), SEMPRE retribua o cumprimento no mesmo espírito antes de qualquer pergunta — ex.: ele disse "boa noite", você responde "Boa noite! 😊". No começo da conversa, apresente-se em uma frase curta como assistente do Grupo Oliveira e pergunte como pode ajudar.\n' +
    'PERGUNTA-GUIA (só na abertura, e só se você ainda não sabe o que o cliente quer): pergunte UMA vez, com educação e sempre depois da saudação: "Precisa de serviço de envidraçamento 🪟 ou está procurando um aplicativo ou site para o seu negócio 📱?" Nunca abra a conversa com essa pergunta de forma seca, sem cumprimentar — e nunca repita a pergunta-guia na mesma conversa.\n' +
    'ATALHO: se o cliente já chegar dizendo o que quer (ex.: "quero um box pro banheiro", "quero um app pra minha loja"), NÃO faça a pergunta-guia: identifique o ramo pelo assunto e siga direto no atendimento daquele ramo (sem esquecer de retribuir a saudação, se ele cumprimentou).\n' +
    'Fale como uma pessoa de verdade: simpático, natural, informal na medida certa. Respostas CURTAS (1 a 3 frases), estilo WhatsApp. ' +
    'Nada de textão, listas numeradas, menus ou tom de robô/formulário. Reaja ao que o cliente falou antes de perguntar o próximo item — uma coisa por vez.\n' +
    'RAMO ENVIDRAÇAMENTO (M Oliveira Envidraçamentos): serviços de box de banheiro, janelas, portas de vidro, espelhos, guarda-corpos, cortinas de vidro, envidraçamento de sacadas, sistemas Versatik e Max System. ' +
    'Objetivo: descobrir com naturalidade (1) o nome do cliente, (2) o endereço onde o serviço será feito (logradouro, número e bairro) e (3) qual serviço ele quer — aproveitando medidas e detalhes que ele oferecer, sem forçar.\n' +
    'RAMO APLICATIVOS E SITES (LAA-APPS): objetivo: entender a ideia com naturalidade: (1) o nome da pessoa, (2) o que ela procura (um aplicativo, um site ou um sistema), (3) pra qual negócio é e (4) um contato para retorno (pode ser este WhatsApp mesmo). Mostre interesse genuíno pela ideia, sem virar interrogatório.\n' +
    'REGRA ABSOLUTA (vale pros dois ramos): você NUNCA fala preço, valor, estimativa, faixa de preço nem prazo fechado — nem de serviço de vidro, nem de desenvolvimento de aplicativo, site ou sistema. Se perguntarem preço ou prazo, diga que cada caso é analisado e que a equipe prepara a proposta e retorna o contato — e siga a conversa coletando os dados.\n' +
    'Não invente informações das empresas: nada de prometer desconto, garantia, marca ou prazo que não foi citado.\n' +
    '---\n' +
    `ramo: ${ramo || '(indefinido)'}\n` +
    `inicio: ${inicio ? 'sim' : 'nao'}\n` +
    `Dados já coletados — envidraçamento: nome: ${dadosIA.nome || '(ainda não)'} | endereço: ${dadosIA.endereco || '(ainda não)'} | serviço: ${dadosIA.servico || '(ainda não)'}\n` +
    `Dados já coletados — aplicativos/sites: nome: ${dadosApps.nome || '(ainda não)'} | procura: ${dadosApps.tipo || '(ainda não)'} | negócio: ${dadosApps.negocio || '(ainda não)'} | contato: ${dadosApps.contato || '(ainda não)'}\n` +
    `faltam: ${faltam.length ? faltam.join(', ') : 'nada'}\n`;
  if (confirmacao) {
    s +=
      ramo === 'laaapps'
        ? 'Os dados já estão completos e a ideia foi registrada. Apenas agradeça de forma natural, confirme resumidamente o que foi anotado (o que a pessoa procura e pra qual negócio) e avise que a equipe da LAA-APPS vai retornar o contato. NÃO peça mais nenhum dado.'
        : 'Os dados já estão completos e o pedido foi registrado. Apenas agradeça de forma natural, confirme resumidamente o que foi anotado (serviço e endereço) e avise que o Tito vai analisar e retornar com o orçamento. NÃO peça mais nenhum dado.';
  }
  return s;
}

// O que falta coletar depende do ramo da conversa.
function faltamDoEstado(estado) {
  if (estado.ramo === 'laaapps') {
    const a = estado.dadosApps;
    const f = [];
    if (!a.nome) f.push('nome');
    if (!a.tipo) f.push('tipo');
    if (!a.negocio) f.push('negocio');
    if (!a.contato) f.push('contato');
    return f;
  }
  const d = estado.dadosIA;
  const f = [];
  if (!d.nome) f.push('nome');
  if (!d.endereco) f.push('endereco');
  if (!d.servico) f.push('servico');
  return f;
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

// Mensagem segura do ramo de apps quando a trava anti-preço dispara.
function respostaSeguraPrecoApps(a) {
  let base =
    'Sobre valores eu não consigo te passar por aqui 😅 Cada projeto é analisado com calma, e a equipe da LAA-APPS prepara a proposta e te retorna o contato.';
  if (!a.nome) base += '\n\nEnquanto isso, me fala: como você se chama?';
  else if (!a.tipo) base += '\n\nE você procura um aplicativo, um site ou um sistema?';
  else if (!a.negocio) base += '\n\nE é pra qual negócio?';
  else if (!a.contato) base += '\n\nE qual o melhor contato pra te retornar? Pode ser este WhatsApp mesmo 😊';
  return base;
}

function mensagemConfirmacaoApp(a) {
  const primeiro = (a.nome || '').split(' ')[0] || '';
  const ideia = a.negocio ? `${a.tipo} para ${a.negocio}` : a.tipo;
  return (
    `Pronto${primeiro ? ', ' + primeiro : ''}! ✅ Já anotei sua ideia: *${ideia}*.\n\n` +
    'A equipe da LAA-APPS vai analisar e te retornar o contato. Obrigado por falar com o Grupo Oliveira! 🙏'
  );
}

// ─── Turno de conversa com IA ───────────────────────────────────────────────
// Lança erro se a IA estiver indisponível → index.js cai pro formulário.
function criarConversaIA(deps) {
  const { enviarWhatsApp, salvarLead, getEstado, salvarEstados } = deps;

  async function gerarResposta(estado, confirmacao) {
    const faltam = faltamDoEstado(estado);
    const inicio = !estado.historicoIA.some((m) => m.papel === 'assistente');
    const sistema = montarSistemaConversa({
      ramo: estado.ramo || '',
      inicio,
      dadosIA: estado.dadosIA,
      dadosApps: estado.dadosApps,
      faltam,
      confirmacao,
    });
    const texto = await chamarIA({ sistema, mensagens: estado.historicoIA, json: false });
    return (texto || '').trim();
  }

  async function processarComIA(telefone, texto) {
    const estado = getEstado(telefone);
    if (!estado.dadosIA) estado.dadosIA = { nome: '', endereco: '', servico: '', detalhes: '' };
    if (!estado.dadosApps) {
      estado.dadosApps = { nome: '', tipo: '', negocio: '', contato: '', detalhes: '' };
    }
    if (!Array.isArray(estado.historicoIA)) estado.historicoIA = [];
    estado.modoIA = true;
    estado.historicoIA.push({ papel: 'cliente', texto });
    if (estado.historicoIA.length > 16) {
      estado.historicoIA = estado.historicoIA.slice(-16);
    }

    // 1) Extração estruturada do que o cliente já informou
    const extraido = await extrairDados(estado.historicoIA);
    if (extraido) {
      // Ramo: o primeiro identificado fica — a conversa não troca de ramo
      // sozinha no meio. Sem ramo explícito, um serviço de vidro ou um
      // tipo de procura (app/site/sistema) também definem o ramo.
      if (!estado.ramo && extraido.ramo) estado.ramo = extraido.ramo;
      if (!estado.ramo && extraido.servico) estado.ramo = 'vidracaria';
      if (!estado.ramo && extraido.tipo) estado.ramo = 'laaapps';
      if (extraido.nome) {
        estado.dadosIA.nome = extraido.nome;
        estado.dadosApps.nome = extraido.nome;
      }
      if (estado.ramo === 'laaapps') {
        const a = estado.dadosApps;
        if (extraido.tipo) a.tipo = extraido.tipo;
        if (extraido.negocio) a.negocio = extraido.negocio;
        if (extraido.contato) a.contato = extraido.contato;
        if (extraido.detalhes) a.detalhes = extraido.detalhes;
      } else {
        const d = estado.dadosIA;
        if (extraido.endereco) d.endereco = extraido.endereco;
        if (extraido.servico) d.servico = extraido.servico;
        if (extraido.detalhes) d.detalhes = extraido.detalhes;
      }
    }
    salvarEstados();

    // 2) Dados completos → salva o lead (mesma salvarLead; a area segue o
    //    ramo) e confirma com fechamento próprio de cada ramo.
    if (estado.ramo === 'laaapps') {
      const a = estado.dadosApps;
      const completoApps = !!(a.nome && a.tipo && a.negocio && a.contato);
      if (completoApps && !estado.iaLeadSalvo) {
        const servicoApps = `${a.tipo} para ${a.negocio}`.slice(0, 300);
        const projetoApps = [a.detalhes, a.contato ? `Contato para retorno: ${a.contato}` : '']
          .filter(Boolean)
          .join(' · ')
          .slice(0, 500);
        salvarLead(telefone, {
          nome: a.nome,
          area: 'laaapps',
          endereco: '',
          servico: servicoApps,
          projeto: projetoApps,
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
        if (!msg || contemPreco(msg)) msg = mensagemConfirmacaoApp(a);
        estado.historicoIA.push({ papel: 'assistente', texto: msg });
        salvarEstados();
        await enviarWhatsApp(telefone, msg);
        return;
      }
    } else {
      const d = estado.dadosIA;
      const completo = !!(d.nome && d.endereco && d.servico);

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
    }

    // 3) Resposta conversacional normal
    let resposta = await gerarResposta(estado, false);
    if (!resposta) throw new Error('IA retornou resposta vazia');
    if (contemPreco(resposta)) {
      console.log('🛡️  Trava anti-preço: resposta da IA substituída por texto seguro.');
      resposta =
        estado.ramo === 'laaapps'
          ? respostaSeguraPrecoApps(estado.dadosApps)
          : respostaSeguraPreco(estado.dadosIA);
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
  montarSistemaConversa,
  IA_ATIVA,
  IA_TIMEOUT_MS,
  GEMINI_MODEL,
  INVISION_MODEL,
  ehErroRetentavel,
  chamarIA,
};
