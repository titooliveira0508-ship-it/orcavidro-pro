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
