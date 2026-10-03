# OrçaVidro Pro 📐

App de orçamentos para vidraçaria — estrutura base.

## Como rodar

```bash
cd ~/workspace/orcavidro-pro
npm install   # só na primeira vez
npm run dev   # abre em http://localhost:5173
```

Para gerar a versão de produção:

```bash
npm run build   # saída em dist/
npm run preview # testa a versão de produção
```

## O que tem pronto

- **Novo Orçamento**: lista das 10 categorias de produtos; cada uma abre um
  formulário com medidas (largura/altura em mm), seletor de altura
  (1800/1900/piso-teto), cor do vidro, cor do kit, dobradiça (quando aplicável),
  película opcional e valor em R$ digitado pelo usuário.
- **Carrinho**: itens do orçamento atual com total acumulado, persistido em
  `localStorage`.
- **Fechar pedido**: vincula cliente (opcional), forma de pagamento e observações;
  gera pedido numerado com status (pendente → aprovado → instalado).
- **Clientes**: cadastro com nome, telefone e endereço (criar/editar/excluir).
- **Pedidos**: lista com filtro por status, expansão dos itens, troca de status e
  exclusão. Cada pedido tem botões **📄 Gerar PDF** e **💬 WhatsApp**.
- **PDF do orçamento** (jspdf): cabeçalho com dados da empresa, dados do cliente,
  lista detalhada de itens, total em destaque, validade, pagamento, observações e
  data de emissão. Botão de PDF também no carrinho (prévia antes de fechar).
- **WhatsApp**: abre `wa.me` com mensagem pronta para o telefone do cliente
  (o PDF baixa no aparelho — é só anexar na conversa).
- **Empresa**: aba com dados da empresa (nome, endereço, telefone/WhatsApp) usados
  no cabeçalho do PDF, salvos em `localStorage`.
- **PWA**: manifest + service worker (auto-update) + ícones placeholder.
- Visual mobile-first, 100% em pt-BR, sem backend (tudo em `localStorage`).

## Estrutura

```
src/
  App.tsx               # shell + navegação por abas
  types.ts              # modelos (Categoria, ItemOrcamento, Cliente, Pedido)
  data/categorias.ts    # as 10 categorias e sub-opções
  lib/storage.ts        # persistência em localStorage
  components/           # BottomNav, CategoriaCard, ItemForm, Carrinho
  pages/                # NovoOrcamento, Clientes, Pedidos
```

## Próximos passos (não implementados)

- Ilustrações reais por categoria (hoje: emoji provisório)
- Geração de PDF do orçamento
- Envio do PDF via WhatsApp
- Bot de WhatsApp para primeiro atendimento
- Financeiro por serviço (entradas × saídas)
