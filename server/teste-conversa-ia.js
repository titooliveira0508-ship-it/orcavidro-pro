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
//
// Uso: node teste-conversa-ia.js

const { spawn } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { contemPreco, parseJSONDefensivo, montarSistemaConversa } = require('./ia');

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
  await cenarioIA();
  await cenarioApps();
  await cenarioFallbackApps();
  await cenarioFallback();
  console.log(falhas === 0 ? '\n🎉 TODOS OS TESTES PASSARAM' : `\n⚠️  ${falhas} TESTE(S) FALHARAM`);
  process.exit(falhas === 0 ? 0 : 1);
})();
