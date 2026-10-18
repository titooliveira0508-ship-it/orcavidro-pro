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

- **Novo Orçamento**: lista das 12 categorias de produtos; cada uma abre um
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
- **WhatsApp**: abre o WhatsApp com o PDF do orçamento **anexado** (Web Share API);
  se o aparelho não suportar anexo, baixa o PDF e abre o `wa.me` com mensagem
  pronta para o telefone do cliente.
- **Empresa**: aba com dados da empresa (nome, endereço, telefone/WhatsApp) usados
  no cabeçalho do PDF, salvos em `localStorage`.
- **Financeiro**: entradas × saídas por serviço, com resumo no topo e filtros.
- **PWA**: manifest + service worker (auto-update) + ícones placeholder.
- Visual mobile-first, 100% em pt-BR, sem backend (tudo em `localStorage`).

## Estrutura

```
src/
  App.tsx               # shell + navegação por abas
  types.ts              # modelos (Categoria, ItemOrcamento, Cliente, Pedido)
  data/categorias.ts    # as 12 categorias e sub-opções
  lib/storage.ts        # persistência em localStorage
  components/           # BottomNav, CategoriaCard, ItemForm, Carrinho, Financeiro
  pages/                # NovoOrcamento, Clientes, Pedidos
```

## Próximos passos

- Bot de WhatsApp para primeiro atendimento
