# 🤖 Bot de WhatsApp — OrçaVidro Pro

Servidor do bot de **primeiro atendimento** da vidraçaria. Ele conversa com o cliente,
anota **nome**, **endereço** e **tipo de serviço**, e avisa que o Tito vai retornar
com o orçamento.

> ⚠️ **O bot NUNCA fala de preços ou valores.** Se o cliente perguntar, ele responde
> que o orçamento é personalizado e o Tito retornará.

## Como funciona o fluxo

1. Cliente manda mensagem → bot dá boas-vindas e pergunta o **nome**
2. Pergunta o **endereço**
3. Pergunta o **tipo de serviço** (lista as 10 categorias do app)
4. Confirma os dados e diz que o Tito entrará em contato
5. O lead é salvo em `leads.json` e aparece no log do servidor

Comandos: o cliente pode escrever **recomeçar** a qualquer momento para reiniciar.

## Variáveis de ambiente

| Variável          | O que é                                                        | Obrigatória |
|-------------------|----------------------------------------------------------------|-------------|
| `VERIFY_TOKEN`    | Palavra secreta que você inventa (ex.: `orcavidro123`)         | Sim         |
| `WHATSAPP_TOKEN`  | Token permanente do WhatsApp Cloud API                         | Sim         |
| `PHONE_NUMBER_ID` | ID do número de telefone (WhatsApp Manager → número)           | Sim         |
| `PORT`            | Porta do servidor (padrão: `3001`)                             | Não         |
| `GEMINI_API_KEY`  | Chave do Gemini — ativa a **conversa com IA**                  | Sim p/ IA   |
| `OPENAI_API_KEY`  | Chave da OpenAI — fallback extra da IA (gpt-4o-mini)           | Não         |
| `CONVERSA_IA`     | `off` desliga a IA e usa só o formulário                       | Não         |

## Conversa com IA

O atendimento principal é uma **conversa livre com IA** (`server/ia.js`):
o cliente fala do jeito dele e a IA coleta os dados com naturalidade,
salvando o lead no mesmo formato de sempre.

Este WhatsApp é a porta de entrada do **Grupo Oliveira** (os dois negócios
do Tito). A IA abre a conversa com a **saudação oficial do grupo** —
sempre retribuindo o cumprimento do cliente (bom dia/boa tarde/boa
noite) — e, quando ainda não sabe o que ele quer, faz a **pergunta-guia**
com educação: serviço de envidraçamento 🪟 ou aplicativo/site para o
negócio 📱. Se o cliente já chegar falando o que quer, a IA identifica
o ramo e segue direto, sem pergunta-guia. Os dois ramos:

- **Envidraçamento** (M Oliveira Envidraçamentos): coleta nome, endereço
  e serviço de vidro → lead com área `M. Oliveira Envidraçamentos`.
- **Aplicativos e sites** (LAA-APPS): entende a ideia — nome da pessoa,
  o que ela procura (aplicativo, site ou sistema), pra qual negócio é e
  um contato para retorno → lead com área `LAA-APPS` e o campo serviço
  descrevendo a procura (ex.: "aplicativo para lanchonete").

A **regra anti-preço vale pros dois ramos**: nada de valores, estimativas
ou prazos fechados — nem de obra, nem de desenvolvimento.

- **Ordem de fallback:** Gemini → OpenAI (só se `OPENAI_API_KEY` existir) →
  formulário atual. Se a IA cair, o cliente continua atendido — nunca mudo.
  Detalhe: se a IA cair **no meio do ramo de apps** (ramo já identificado),
  quem assume é o atendimento básico de apps do próprio formulário
  (mensagem educada + etapas de nome e ideia), que salva o lead básico da
  LAA-APPS. Sem ramo conhecido, cai no fluxo normal do formulário.
- **Regra de ouro mantida:** a IA **nunca** passa preço/valor/prazo. Além da
  instrução no prompt, toda resposta passa por uma trava anti-preço antes
  de ser enviada.
- **Teste local:** `node teste-conversa-ia.js` sobe o servidor com a IA
  mockada (`IA_MOCK=1`, só para testes — nunca usar em produção) e simula
  uma conversa completa via webhook assinado.

No Render, cadastre essas variáveis em **Environment** do serviço.

> Sem `WHATSAPP_TOKEN`/`PHONE_NUMBER_ID`, o servidor roda em **modo teste**:
> ele processa a conversa e mostra as respostas no log, sem enviar de verdade.

## Rodando local

```bash
cd server
npm install
VERIFY_TOKEN=orcavidro123 PORT=3001 node index.js
```

Teste o health check: `http://localhost:3001/health`

## Configurando o webhook na Meta

1. **WhatsApp Manager** (business.facebook.com) → sua conta → número de telefone:
   - Anote o **Phone Number ID** → `PHONE_NUMBER_ID`
2. **Gere o token permanente:**
   - Configurações do negócio → Usuários do sistema → crie um usuário
   - Adicione o ativo "WhatsApp" com permissões de mensagem
   - Gere o token → `WHATSAPP_TOKEN`
3. **Meta for Developers** (developers.facebook.com) → seu app → **WhatsApp → Configuração**:
   - URL de retorno: `https://SEU-SERVIDOR/webhook`
   - Token de verificação: o mesmo valor de `VERIFY_TOKEN`
   - Clique em **Verificar e salvar**
   - Em **Campos do webhook**, assine o campo **`messages`**

> 💡 O servidor precisa estar **público na internet** (ex.: Render Web Service)
> para a Meta conseguir chamar o webhook.

## Endpoints

| Método | Rota       | Para que serve                          |
|--------|------------|-----------------------------------------|
| GET    | `/health`  | Verifica se o servidor está no ar       |
| GET    | `/webhook` | Verificação do webhook pela Meta        |
| POST   | `/webhook` | Recebe as mensagens do WhatsApp         |
| GET    | `/leads`   | Lista os leads capturados (JSON)        |

## Arquivos

- `index.js` — servidor Express + máquina de estados da conversa
- `leads.json` — leads concluídos (nome, telefone, endereço, serviço, data)
- `state.json` — estado atual de cada conversa (criado automaticamente)
- `exemplo-webhook.json` — exemplo de payload que a Meta envia (para testes)
- `package.json` — dependências (`express`, `axios`)
