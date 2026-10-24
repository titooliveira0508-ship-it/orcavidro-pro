// ─── Teste local da conversa com IA (não roda em produção) ──────────────────
// Sobe o servidor de verdade numa pasta temporária, com a IA MOCKADA
// (IA_MOCK=1), e simula uma conversa de WhatsApp via POST /webhook com
// assinatura válida (HMAC com APP_SECRET de teste).
//
// Verifica:
//   0) Prompt de sistema: saudação oficial do GRUPO OLIVEIRA (retribuir
//      o cumprimento), pergunta-guia educada dos dois ramos, os dois
//      ramos de coleta e a regra anti-preço valendo pros dois
//   1) GET /health responde ok
//   2) Assinatura inválida → 403
//   3) Conversa natural (vidraçaria): IA pede nome → endereço →
//      salva o lead no MESMO formato do formulário → confirma
//   4) Nenhuma resposta contém preço/valor
//   5) GET /leads exige ADMIN_TOKEN e devolve o lead salvo
//   6) Conversa do ramo APPS: abertura só com "Boa noite" → saudação do
//      Grupo Oliveira + pergunta-guia → coleta nome/contato → lead
//      salvo com area 'LAA-APPS' e servico "aplicativo para lanchonete"
//   7) IA cai NO MEIO do ramo apps → atendimento básico educado assume
//      (nome + ideia) e salva o lead básico da LAA-APPS
//   8) Com a IA "fora do ar" desde o início, cai pro formulário
//      e o cliente continua sendo atendido
//   9) Timeout do Gemini → exatamente 1 nova tentativa antes de
//      acertar; erro 4xx (404) não retenta e cai pro próximo provedor
//  10) INVISION é o provedor PRINCIPAL: com a chave configurada, ela é
//      chamada PRIMEIRO (antes do Gemini e da OpenAI) e a chamada NÃO
//      leva `temperature` (o gateway rejeita o parâmetro). Conversa
//      completa por ela: saudação do Grupo Oliveira e lead salvo. Sem
//      INVISION_API_KEY ela é pulada; com TODOS os provedores fora,
//      segue o erro de "IA indisponível" (quem chama cai pro
//      formulário, como hoje)
//
// Uso: node teste-conversa-ia.js

const { spawn } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  contemPreco,
  parseJSONDefensivo,
  montarSistemaConversa,
  IA_TIMEOUT_MS,
  GEMINI_MODEL,
  INVISION_MODEL,
  ehErroRetentavel,
} = require('./ia');

const APP_SECRET = 'segredo-de-teste';
const ADMIN_TOKEN = 'admin-de-teste';
const TELEFONE = '5521999990001';

let falhas = 0;
function ok(cond, nome) {
  console.log(`${cond ? '✅' : '❌'} ${nome}`);
  if (!cond) falhas++;
}

// ─── Unitários rápidos ──────────────────────────────────────────────────────
ok(contemPreco('Isso fica em R$ 2.500,00') === true, 'trava anti-preço pega "R$ 2.500,00"');
ok(contemPreco('custa uns 900 reais') === true, 'trava anti-preço pega "custa 900 reais"');
ok(contemPreco('O Tito prepara o orçamento e te retorna com a proposta') === false, 'trava anti-preço não bloqueia texto seguro');
ok(parseJSONDefensivo('```json\n{"nome":"Ana"}\n```')?.nome === 'Ana', 'parse de JSON com cerca de código');
ok(parseJSONDefensivo('não é json') === null, 'parse defensivo devolve null em lixo');
ok(IA_TIMEOUT_MS === 45000, 'timeout das chamadas de IA é 45000ms');
ok(
  GEMINI_MODEL === (process.env.GEMINI_MODEL || 'gemini-3.8-flash'),
  `modelo padrão do Gemini é gemini-3.8-flash (atual: ${GEMINI_MODEL})`
);
ok(
  INVISION_MODEL === (process.env.INVISION_MODEL || 'openai/gpt-6-astra-invision'),
  `modelo padrão da Invision é openai/gpt-6-astra-invision (atual: ${INVISION_MODEL})`
);
ok(ehErroRetentavel(new Error('timeout of 45000ms exceeded')) === true, 'timeout é erro retentável');
ok(ehErroRetentavel(new Error('Network Error')) === true, 'erro de rede (sem resposta) é retentável');
ok(
  ehErroRetentavel({ message: 'Request failed with status code 503', response: { status: 503 } }) === true,
  'erro 5xx é retentável'
);
ok(
  ehErroRetentavel({ message: 'Request failed with status code 404', response: { status: 404 } }) === false,
  'erro 404 (4xx) NÃO é retentável'
);

// ─── Prompt de sistema: saudação do Grupo Oliveira + dois ramos ─────────────
console.log('\n── Prompt de sistema (abertura, sem ramo definido) ──');
const dadosVaziosIA = { nome: '', endereco: '', servico: '', detalhes: '' };
const dadosVaziosApps = { nome: '', tipo: '', negocio: '', contato: '', detalhes: '' };
const promptInicio = montarSistemaConversa({
  ramo: '',
  inicio: true,
  dadosIA: dadosVaziosIA,
  dadosApps: dadosVaziosApps,
  faltam: ['nome'],
  confirmacao: false,
});
console.log(promptInicio);
console.log('── fim do prompt ──');
ok(promptInicio.includes('GRUPO OLIVEIRA'), 'prompt apresenta o Grupo Oliveira');
ok(/retribua o cumprimento/i.test(promptInicio), 'prompt manda retribuir a saudação do cliente');
ok(
  promptInicio.includes('envidraçamento 🪟') && promptInicio.includes('aplicativo ou site para o seu negócio'),
  'prompt tem a pergunta-guia dos dois ramos'
);
ok(
  /Nunca abra a conversa com essa pergunta de forma seca/.test(promptInicio),
  'pergunta-guia proibida como abertura seca (só com saudação)'
);
ok(
  promptInicio.includes('RAMO ENVIDRAÇAMENTO') && promptInicio.includes('RAMO APLICATIVOS E SITES'),
  'prompt descreve os dois ramos de coleta'
);
ok(
  /REGRA ABSOLUTA/.test(promptInicio) && /NUNCA fala preço/.test(promptInicio),
  'regra anti-preço presente no prompt'
);
ok(/nem de desenvolvimento de aplicativo/.test(promptInicio), 'anti-preço cobre desenvolvimento de app/site');
ok(promptInicio.includes('ramo: (indefinido)') && promptInicio.includes('inicio: sim'), 'marcadores de estado no prompt');
const promptApps = montarSistemaConversa({
  ramo: 'laaapps',
  inicio: false,
  dadosIA: dadosVaziosIA,
  dadosApps: { ...dadosVaziosApps, nome: 'Ana Paula', tipo: 'aplicativo', negocio: 'lanchonete' },
  faltam: ['contato'],
  confirmacao: false,
});
ok(promptApps.includes('ramo: laaapps') && promptApps.includes('faltam: contato'), 'prompt do ramo apps carrega ramo/faltam');

// ─── Sobe o servidor numa pasta temporária ──────────────────────────────────
function prepararPasta() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'orcavidro-teste-'));
  for (const f of ['index.js', 'ia.js', 'package.json']) {
    fs.copyFileSync(path.join(__dirname, f), path.join(dir, f));
  }
  fs.symlinkSync(path.join(__dirname, 'node_modules'), path.join(dir, 'node_modules'), 'dir');
  return dir;
}

function subirServidor(porta, envExtra, dirExistente) {
  let dir = dirExistente;
  if (dir) {
    // Reaproveita a pasta (state.json/leads.json persistem entre os dois
    // servidores); só atualiza o código e garante o node_modules.
    for (const f of ['index.js', 'ia.js', 'package.json']) {
      fs.copyFileSync(path.join(__dirname, f), path.join(dir, f));
    }
    try {
      fs.symlinkSync(path.join(__dirname, 'node_modules'), path.join(dir, 'node_modules'), 'dir');
    } catch (_) {
      /* symlink já existe */
    }
  } else {
    dir = prepararPasta();
  }
  const proc = spawn('node', ['index.js'], {
    cwd: dir,
    env: {
      ...process.env,
      PORT: String(porta),
      NODE_ENV: 'production',
      APP_SECRET,
      ADMIN_TOKEN,
      VERIFY_TOKEN: 'verify-de-teste',
      WHATSAPP_TOKEN: '',
      PHONE_NUMBER_ID: '',
      GEMINI_API_KEY: '',
      OPENAI_API_KEY: '',
      IA_MOCK: '1',
      ...envExtra,
    },
  });
  let log = '';
  proc.stdout.on('data', (d) => { log += d.toString(); });
  proc.stderr.on('data', (d) => { log += d.toString(); });
  return { proc, dir, getLog: () => log };
}

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

async function esperar(condicao, timeoutMs, rotulo) {
  const ini = Date.now();
  while (Date.now() - ini < timeoutMs) {
    if (condicao()) return true;
    await dormir(150);
  }
  console.log(`   (timeout esperando: ${rotulo})`);
  return false;
}

function payloadWebhook(telefone, texto, id) {
  return JSON.stringify({
    object: 'whatsapp_business_account',
    entry: [{
      id: '123',
      changes: [{
        field: 'messages',
        value: {
          messaging_product: 'whatsapp',
          metadata: { display_phone_number: '5521998071729', phone_number_id: '999' },
          messages: [{ from: telefone, id, timestamp: '1729000000', type: 'text', text: { body: texto } }],
        },
      }],
    }],
  });
}

async function enviarMensagem(porta, telefone, texto, id, secret = APP_SECRET) {
  const body = payloadWebhook(telefone, texto, id);
  const sig = 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex');
  const resp = await fetch(`http://127.0.0.1:${porta}/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-hub-signature-256': sig },
    body,
  });
  return resp.status;
}

// ─── Nova tentativa do Gemini após timeout (axios stubado) ──────────────────
// chamarIA não é exercitado pelo mock (IA_MOCK atalha antes do provedor
// real), então aqui o axios é stubado e o módulo é recarregado com uma
// chave de teste: timeout na 1ª chamada, sucesso na 2ª. Sem
// INVISION_API_KEY neste cenário, o Gemini abre a cadeia.
async function testarRetentativaGemini() {
  console.log('\n── Nova tentativa do Gemini após timeout ──');
  const axios = require('axios');
  const postOriginal = axios.post;
  const envAnterior = {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    INVISION_API_KEY: process.env.INVISION_API_KEY,
    IA_MOCK: process.env.IA_MOCK,
  };
  try {
    let tentativas = 0;
    axios.post = async () => {
      tentativas++;
      if (tentativas === 1) {
        const erro = new Error('timeout of 45000ms exceeded');
        erro.code = 'ECONNABORTED';
        throw erro;
      }
      return {
        data: { candidates: [{ content: { parts: [{ text: 'Oi! 😊 Sou o assistente do Grupo Oliveira.' }] } }] },
      };
    };
    process.env.GEMINI_API_KEY = 'chave-de-teste-retry';
    process.env.OPENAI_API_KEY = '';
    process.env.INVISION_API_KEY = '';
    process.env.IA_MOCK = '';
    delete require.cache[require.resolve('./ia')];
    const iaRetry = require('./ia');
    const texto = await iaRetry.chamarIA({
      sistema: 'teste',
      mensagens: [{ papel: 'cliente', texto: 'oi' }],
      json: false,
    });
    ok(tentativas === 2, `timeout do Gemini dispara exatamente 1 nova tentativa (tentativas=${tentativas})`);
    ok(/Grupo Oliveira/.test(texto), 'resposta da 2ª tentativa do Gemini é aproveitada');

    // Erro 404 NÃO retenta: cai direto pro próximo provedor (aqui nenhum).
    let tentativas404 = 0;
    axios.post = async () => {
      tentativas404++;
      const erro = new Error('Request failed with status code 404');
      erro.response = { status: 404, data: { error: { message: 'model not found' } } };
      throw erro;
    };
    let lancou404 = false;
    try {
      await iaRetry.chamarIA({
        sistema: 'teste',
        mensagens: [{ papel: 'cliente', texto: 'oi' }],
        json: false,
      });
    } catch (_) {
      lancou404 = true;
    }
    ok(tentativas404 === 1, `erro 404 do Gemini NÃO retenta (tentativas=${tentativas404})`);
    ok(lancou404, 'sem outro provedor, erro 404 do Gemini propaga como IA indisponível');
  } finally {
    axios.post = postOriginal;
    for (const [chave, valor] of Object.entries(envAnterior)) {
      if (valor === undefined) delete process.env[chave];
      else process.env[chave] = valor;
    }
    delete require.cache[require.resolve('./ia')];
  }
}

// ─── Invision principal: 1ª da cadeia e SEM temperature (axios stubado) ─────
// Mesmo esquema do teste de retentativa: o provedor de verdade não é
// exercitado pelo mock, então o axios é stubado por URL e o módulo é
// recarregado com chaves de teste. O stub da Invision imita as respostas
// do provedor mock (saudação/extração) pra conversa fluir até o lead.
async function testarInvisionPrincipal() {
  console.log('\n── Invision principal (1ª da cadeia, sem temperature) ──');
  const axios = require('axios');
  const postOriginal = axios.post;
  const envAnterior = {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    INVISION_API_KEY: process.env.INVISION_API_KEY,
    INVISION_MODEL: process.env.INVISION_MODEL,
    IA_MOCK: process.env.IA_MOCK,
  };
  const chamadas = [];
  let ultimaInvision = null;
  let invisionFalha = false;
  function recarregar(env) {
    for (const [chave, valor] of Object.entries(env)) {
      if (valor === undefined || valor === '') delete process.env[chave];
      else process.env[chave] = valor;
    }
    delete require.cache[require.resolve('./ia')];
    return require('./ia');
  }
  try {
    axios.post = async (url, body, config) => {
      if (url.includes('generativelanguage.googleapis.com')) {
        chamadas.push('gemini');
        const erro = new Error('Request failed with status code 404');
        erro.response = { status: 404, data: { error: { message: 'model not found' } } };
        throw erro;
      }
      if (url.includes('api.openai.com')) {
        chamadas.push('openai');
        const erro = new Error('Request failed with status code 500');
        erro.response = { status: 500, data: { error: { message: 'erro interno simulado' } } };
        throw erro;
      }
      if (url.includes('invision.dreamvision.com.br')) {
        chamadas.push('invision');
        ultimaInvision = { url, body, config };
        if (invisionFalha) {
          const erro = new Error('Request failed with status code 500');
          erro.response = { status: 500, data: { error: { message: 'erro interno simulado' } } };
          throw erro;
        }
        const sistemaTxt = (body.messages[0] && body.messages[0].content) || '';
        const conversaTxt = body.messages.map((m) => m.content).join('\n');
        let texto;
        if (body.response_format) {
          // Extração (json): completa só quando o cliente já deu os dados.
          texto = /Carlos Eduardo/.test(conversaTxt)
            ? JSON.stringify({
                nome: 'Carlos Eduardo',
                ramo: 'vidracaria',
                endereco: 'Rua das Flores, 123, Bangu',
                servico: 'box de banheiro',
                detalhes: '',
                tipo: '',
                negocio: '',
                contato: '',
              })
            : JSON.stringify({
                nome: '',
                ramo: '',
                endereco: '',
                servico: '',
                detalhes: '',
                tipo: '',
                negocio: '',
                contato: '',
              });
        } else if (/Os dados já estão completos/.test(sistemaTxt)) {
          texto =
            'Pronto! ✅ Já anotei tudo aqui: box de banheiro em Rua das Flores, 123, Bangu. ' +
            'O Tito vai analisar e te retornar com o orçamento. 🙏';
        } else if (/inicio: sim/.test(sistemaTxt)) {
          texto =
            'Boa noite! 😊 Sou o assistente do Grupo Oliveira. Como posso te ajudar? ' +
            'Precisa de serviço de envidraçamento 🪟 ou está procurando um aplicativo ou site para o seu negócio 📱?';
        } else {
          texto = 'Perfeito, já anotei aqui! ✅';
        }
        return { data: { choices: [{ message: { content: texto } }] } };
      }
      throw new Error('URL inesperada no stub: ' + url);
    };

    const iaInv = recarregar({
      GEMINI_API_KEY: 'chave-gemini-teste',
      OPENAI_API_KEY: 'chave-openai-teste',
      INVISION_API_KEY: 'chave-invision-teste',
      INVISION_MODEL: '',
      IA_MOCK: '',
    });
    ok(iaInv.IA_ATIVA === true, 'IA ativa com Invision + Gemini + OpenAI configurados');

    // 1) Chamada direta com TODOS os provedores configurados: a Invision
    //    responde PRIMEIRO — Gemini e OpenAI nem são chamados. E o corpo
    //    da chamada NÃO pode levar `temperature` (o gateway rejeita).
    const sistemaTeste = 'sistema de teste\ninicio: sim';
    chamadas.length = 0;
    const textoDireto = await iaInv.chamarIA({
      sistema: sistemaTeste,
      mensagens: [{ papel: 'cliente', texto: 'Boa noite' }],
      json: false,
    });
    ok(/Grupo Oliveira/.test(textoDireto), 'quem responde é a Invision (provedor principal)');
    ok(
      chamadas.join(',') === 'invision',
      `Invision chamada PRIMEIRO e sozinha, com todos configurados (${chamadas.join(' → ')})`
    );
    ok(
      !!ultimaInvision && ultimaInvision.url === 'https://invision.dreamvision.com.br/v1/chat/completions',
      'URL da Invision é a do gateway /v1/chat/completions'
    );
    ok(
      !!ultimaInvision && ultimaInvision.config.headers.Authorization === 'Bearer chave-invision-teste',
      'Invision recebe o header Authorization: Bearer <chave>'
    );
    ok(
      !!ultimaInvision && ultimaInvision.body.model === 'openai/gpt-6-astra-invision',
      `corpo da Invision usa o modelo padrão (atual: ${ultimaInvision && ultimaInvision.body.model})`
    );
    ok(
      !!ultimaInvision &&
        ultimaInvision.body.messages[0].role === 'system' &&
        ultimaInvision.body.messages[0].content === sistemaTeste,
      'Invision recebe o mesmo system prompt dos outros provedores'
    );
    ok(
      !!ultimaInvision && ultimaInvision.config.timeout === 45000,
      'Invision usa o mesmo timeout das outras chamadas (45000ms)'
    );
    ok(
      !!ultimaInvision && ultimaInvision.body.max_tokens === 600,
      'corpo da Invision mantém max_tokens 600'
    );
    ok(
      !!ultimaInvision && !('temperature' in ultimaInvision.body),
      'corpo da Invision NÃO leva temperature (o gateway rejeita o parâmetro)'
    );

    // 1b) Modo extração (json): response_format continua presente e o
    //     temperature continua de fora.
    await iaInv.chamarIA({
      sistema: 'extração de teste',
      mensagens: [{ papel: 'cliente', texto: 'Meu nome é Carlos Eduardo' }],
      json: true,
    });
    ok(
      !!ultimaInvision &&
        ultimaInvision.body.response_format &&
        ultimaInvision.body.response_format.type === 'json_object' &&
        !('temperature' in ultimaInvision.body),
      'no modo extração: response_format json_object presente e temperature continua fora'
    );

    // 2) Conversa completa pela Invision: saudação → dados → lead salvo.
    const enviados = [];
    const leadsSalvos = [];
    const estado = {};
    const conversa = iaInv.criarConversaIA({
      enviarWhatsApp: async (_tel, msg) => {
        enviados.push(msg);
      },
      salvarLead: (_tel, lead) => {
        leadsSalvos.push(lead);
      },
      getEstado: () => estado,
      salvarEstados: () => {},
    });
    await conversa.processarComIA('5521999990009', 'Boa noite');
    ok(
      enviados.length === 1 &&
        enviados[0].includes('Grupo Oliveira') &&
        enviados[0].includes('envidraçamento 🪟'),
      'conversa via Invision abre com a saudação do Grupo Oliveira + pergunta-guia'
    );
    await conversa.processarComIA(
      '5521999990009',
      'Meu nome é Carlos Eduardo, preciso de um box pro banheiro, é na Rua das Flores, 123, Bangu'
    );
    ok(leadsSalvos.length === 1, 'lead salvo ao completar os dados via Invision');
    if (leadsSalvos[0]) {
      ok(leadsSalvos[0].nome === 'Carlos Eduardo', `lead.nome = "${leadsSalvos[0].nome}"`);
      ok(/box/i.test(leadsSalvos[0].servico), `lead.servico = "${leadsSalvos[0].servico}"`);
      ok(/Rua das Flores/.test(leadsSalvos[0].endereco), `lead.endereco = "${leadsSalvos[0].endereco}"`);
      ok(leadsSalvos[0].area === 'vidracaria', `lead.area = "${leadsSalvos[0].area}"`);
    }
    ok(
      enviados.length === 2 && /anotei/i.test(enviados[1]),
      'confirmação do pedido enviada ao cliente via Invision'
    );

    // 3) TODOS os provedores fora → mesmo erro de hoje ("IA indisponível"),
    //    depois de percorrer a cadeia inteira na ordem nova.
    invisionFalha = true;
    chamadas.length = 0;
    let erroTodos = null;
    try {
      await iaInv.chamarIA({
        sistema: 'teste',
        mensagens: [{ papel: 'cliente', texto: 'oi' }],
        json: false,
      });
    } catch (e) {
      erroTodos = e;
    }
    invisionFalha = false;
    ok(
      !!erroTodos && /IA indisponível/.test(erroTodos.message),
      'todos os provedores fora → erro "IA indisponível" (index.js cai pro formulário)'
    );
    ok(
      chamadas.join(',') === 'invision,gemini,openai',
      `ordem completa da cadeia: Invision → Gemini → OpenAI (${chamadas.join(' → ')})`
    );
    ok(
      !!erroTodos &&
        /invision/i.test(erroTodos.message) &&
        /gemini/i.test(erroTodos.message) &&
        /openai/i.test(erroTodos.message),
      'erro final cita os três provedores que falharam'
    );

    // 4) Sem INVISION_API_KEY, a Invision nunca é chamada.
    const iaSemInv = recarregar({
      GEMINI_API_KEY: 'chave-gemini-teste',
      OPENAI_API_KEY: '',
      INVISION_API_KEY: '',
      INVISION_MODEL: '',
      IA_MOCK: '',
    });
    chamadas.length = 0;
    let erroSem = null;
    try {
      await iaSemInv.chamarIA({
        sistema: 'teste',
        mensagens: [{ papel: 'cliente', texto: 'oi' }],
        json: false,
      });
    } catch (e) {
      erroSem = e;
    }
    ok(
      !!erroSem && !chamadas.includes('invision') && chamadas.join(',') === 'gemini',
      'sem INVISION_API_KEY, a Invision é pulada e o Gemini abre a cadeia (comportamento preservado)'
    );

    // 5) Só a Invision configurada já ativa a IA.
    const iaSoInv = recarregar({
      GEMINI_API_KEY: '',
      OPENAI_API_KEY: '',
      INVISION_API_KEY: 'chave-invision-teste',
      INVISION_MODEL: '',
      IA_MOCK: '',
    });
    ok(iaSoInv.IA_ATIVA === true, 'IA ativa só com a Invision configurada');
  } finally {
    axios.post = postOriginal;
    for (const [chave, valor] of Object.entries(envAnterior)) {
      if (valor === undefined) delete process.env[chave];
      else process.env[chave] = valor;
    }
    delete require.cache[require.resolve('./ia')];
  }
}

// ─── Cenário 1: conversa com IA ─────────────────────────────────────────────
async function cenarioIA() {
  console.log('\n── Cenário 1: conversa com IA (mock) ──');
  const { proc, getLog } = subirServidor(3457, {});
  try {
    const saude = await esperar(() => getLog().includes('no ar!'), 8000, 'boot');
    ok(saude, 'servidor subiu');
    const h = await fetch('http://127.0.0.1:3457/health').then((r) => r.json());
    ok(h.ok === true, 'GET /health ok');

    const statusRuim = await enviarMensagem(3457, TELEFONE, 'oi', 'wamid.x', 'secret-errado');
    ok(statusRuim === 403, 'assinatura inválida → 403');

    // 1) saudação com o serviço
    await enviarMensagem(3457, TELEFONE, 'Oi, boa tarde! Preciso de um box pro banheiro da minha casa', 'wamid.t1');
    ok(await esperar(() => getLog().includes('se chama'), 6000, 'IA pede nome'), 'IA pede o nome de forma natural');

    // 2) pergunta de preço → sem valor na resposta, conversa continua
    await enviarMensagem(3457, TELEFONE, 'quanto custa um box mais ou menos?', 'wamid.t2');
    await dormir(800);
    ok(!/Texto:.*(R\$|\d+\s*reais)/.test(getLog()), 'nenhuma resposta com valor em dinheiro');

    // 3) nome
    await enviarMensagem(3457, TELEFONE, 'Meu nome é Carlos Eduardo', 'wamid.t3');
    ok(await esperar(() => getLog().includes('instalação'), 6000, 'IA pede endereço'), 'IA pede o endereço');

    // 4) endereço → completa → lead + confirmação
    await enviarMensagem(3457, TELEFONE, 'É na Rua das Flores, 123, Bangu', 'wamid.t4');
    ok(await esperar(() => getLog().includes('NOVO LEAD RECEBIDO'), 6000, 'lead salvo'), 'lead salvo ao completar os dados');
    ok(await esperar(() => getLog().includes('anotei'), 4000, 'confirmação'), 'IA confirma o pedido');

    // 5) depois de concluído → comportamento atual de "concluido"
    await enviarMensagem(3457, TELEFONE, 'obrigado!', 'wamid.t5');
    ok(await esperar(() => getLog().includes('já está com a gente'), 6000, 'concluido'), 'pós-conclusão responde como hoje');

    // /leads protegido + formato do lead
    const semToken = await fetch('http://127.0.0.1:3457/leads');
    ok(semToken.status === 401, 'GET /leads sem token → 401');
    const leads = await fetch('http://127.0.0.1:3457/leads', {
      headers: { 'x-admin-token': ADMIN_TOKEN },
    }).then((r) => r.json());
    const lead = leads.find((l) => l.telefone === TELEFONE);
    ok(!!lead, 'lead aparece no GET /leads');
    if (lead) {
      ok(lead.nome === 'Carlos Eduardo', `lead.nome = "${lead.nome}"`);
      ok(/Rua das Flores/.test(lead.endereco), `lead.endereco = "${lead.endereco}"`);
      ok(/box/i.test(lead.servico), `lead.servico = "${lead.servico}"`);
      ok(lead.area === 'M. Oliveira Envidraçamentos', `lead.area = "${lead.area}"`);
      ok(typeof lead.data === 'string' && !!lead.data, 'lead.data presente (ISO)');
    }
  } finally {
    proc.kill('SIGTERM');
  }
}

// ─── Cenário 2: ramo aplicativos/sites (Grupo Oliveira) ─────────────────────
async function cenarioApps() {
  console.log('\n── Cenário 2: conversa do ramo apps (mock) ──');
  const TEL = '5521999990004';
  const { proc, getLog } = subirServidor(3459, {});
  try {
    ok(await esperar(() => getLog().includes('no ar!'), 8000, 'boot'), 'servidor subiu');

    // 1) só "Boa noite" → saudação oficial do Grupo Oliveira + pergunta-guia
    await enviarMensagem(3459, TEL, 'Boa noite', 'wamid.b1');
    ok(
      await esperar(() => getLog().includes('Grupo Oliveira'), 6000, 'saudação do grupo'),
      'abertura retribui "Boa noite" e apresenta o Grupo Oliveira'
    );
    ok(
      await esperar(() => getLog().includes('envidraçamento 🪟'), 4000, 'pergunta-guia'),
      'pergunta-guia educada (envidraçamento ou aplicativo/site)'
    );

    // 2) cliente diz o que quer → ramo apps identificado, sem repetir a guia
    await enviarMensagem(3459, TEL, 'Quero um aplicativo pra minha lanchonete', 'wamid.b2');
    ok(
      await esperar(() => getLog().includes('se chama'), 6000, 'IA apps pede nome'),
      'ramo apps: IA pede o nome'
    );

    // 3) nome → 4) contato → lead salvo como LAA-APPS
    await enviarMensagem(3459, TEL, 'Meu nome é Ana Paula', 'wamid.b3');
    ok(
      await esperar(() => getLog().includes('contato'), 6000, 'IA apps pede contato'),
      'ramo apps: IA pede o contato de retorno'
    );
    await enviarMensagem(3459, TEL, 'Pode ser nesse WhatsApp mesmo', 'wamid.b4');
    ok(
      await esperar(() => getLog().includes('NOVO LEAD RECEBIDO'), 6000, 'lead apps salvo'),
      'lead de apps salvo ao completar os dados'
    );

    const leads = await fetch('http://127.0.0.1:3459/leads', {
      headers: { 'x-admin-token': ADMIN_TOKEN },
    }).then((r) => r.json());
    const lead = leads.find((l) => l.telefone === TEL);
    ok(!!lead, 'lead de apps aparece no GET /leads');
    if (lead) {
      ok(lead.area === 'LAA-APPS', `lead.area = "${lead.area}"`);
      ok(lead.nome === 'Ana Paula', `lead.nome = "${lead.nome}"`);
      ok(
        /aplicativo/i.test(lead.servico) && /lanchonete/i.test(lead.servico),
        `lead.servico = "${lead.servico}"`
      );
    }
  } finally {
    proc.kill('SIGTERM');
  }
}

// ─── Cenário 3: IA cai NO MEIO do ramo apps → atendimento básico ────────────
async function cenarioFallbackApps() {
  console.log('\n── Cenário 3: IA cai no meio do ramo apps → atendimento básico ──');
  const TEL = '5521999990003';
  const s1 = subirServidor(3460, {});
  const dir = s1.dir;
  try {
    ok(await esperar(() => s1.getLog().includes('no ar!'), 8000, 'boot'), 'servidor subiu (IA ok)');
    await enviarMensagem(3460, TEL, 'Boa noite', 'wamid.a1');
    ok(
      await esperar(() => s1.getLog().includes('Grupo Oliveira'), 6000, 'saudação'),
      'abertura com a saudação do Grupo Oliveira'
    );
    await enviarMensagem(3460, TEL, 'Quero um aplicativo pra minha lanchonete', 'wamid.a2');
    ok(
      await esperar(() => s1.getLog().includes('se chama'), 6000, 'IA apps pede nome'),
      'ramo apps identificado antes da queda'
    );
  } finally {
    s1.proc.kill('SIGTERM');
  }
  await dormir(600);

  // Reinicia na MESMA pasta (estado persiste), agora com a IA fora do ar.
  const s2 = subirServidor(3461, { IA_MOCK_FALHAR: '1' }, dir);
  try {
    ok(await esperar(() => s2.getLog().includes('no ar!'), 8000, 'boot'), 'servidor reiniciou (IA fora do ar)');
    await enviarMensagem(3461, TEL, 'Meu nome é Ana Paula', 'wamid.a3');
    ok(
      await esperar(() => s2.getLog().includes('IA indisponível'), 6000, 'log de fallback'),
      'log registra a queda da IA'
    );
    ok(
      await esperar(() => /Texto:.*instabilidade/s.test(s2.getLog()), 6000, 'mensagem educada'),
      'atendimento básico de apps responde com educação (sem ficar mudo)'
    );
    await enviarMensagem(3461, TEL, 'Ana Paula', 'wamid.a4');
    ok(
      await esperar(() => s2.getLog().includes('ideia'), 6000, 'form apps pede a ideia'),
      'atendimento básico pede a ideia/projeto'
    );
    await enviarMensagem(3461, TEL, 'um aplicativo pra minha lanchonete', 'wamid.a5');
    ok(
      await esperar(() => s2.getLog().includes('NOVO LEAD RECEBIDO'), 6000, 'lead básico salvo'),
      'lead básico de apps salvo pelo fallback'
    );
    const leads = await fetch('http://127.0.0.1:3461/leads', {
      headers: { 'x-admin-token': ADMIN_TOKEN },
    }).then((r) => r.json());
    const lead = leads.find((l) => l.telefone === TEL);
    ok(!!lead && lead.area === 'LAA-APPS', `lead do fallback com area "LAA-APPS" (${lead && lead.area})`);
  } finally {
    s2.proc.kill('SIGTERM');
  }
}

// ─── Cenário 4: IA fora do ar desde o início → formulário ───────────────────
async function cenarioFallback() {
  console.log('\n── Cenário 4: IA fora do ar → formulário ──');
  const { proc, getLog } = subirServidor(3458, { IA_MOCK_FALHAR: '1' });
  try {
    ok(await esperar(() => getLog().includes('no ar!'), 8000, 'boot'), 'servidor subiu');
    await enviarMensagem(3458, '5521999990002', 'quero orçamento de uma janela', 'wamid.f1');
    ok(await esperar(() => getLog().includes('IA indisponível'), 6000, 'log de fallback'), 'log registra a queda pra IA');
    ok(
      await esperar(() => /Texto:.*(chama|seu nome)/s.test(getLog()), 6000, 'formulário responde'),
      'formulário assume e pede o nome'
    );
    const h = await fetch('http://127.0.0.1:3458/health').then((r) => r.json());
    ok(h.ok === true, 'servidor segue no ar após a falha da IA');
  } finally {
    proc.kill('SIGTERM');
  }
}

(async () => {
  await testarRetentativaGemini();
  await testarInvisionPrincipal();
  await cenarioIA();
  await cenarioApps();
  await cenarioFallbackApps();
  await cenarioFallback();
  console.log(falhas === 0 ? '\n🎉 TODOS OS TESTES PASSARAM' : `\n⚠️  ${falhas} TESTE(S) FALHARAM`);
  process.exit(falhas === 0 ? 0 : 1);
})();
