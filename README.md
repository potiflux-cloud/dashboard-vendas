# Dashboard de Vendas

Painel de vendas em HTML, CSS e JavaScript puro, sem bibliotecas nem servidor. Mostra faturamento, ticket médio, conversão e evolução das vendas, com regras de negócio reais.

**Demo:** https://potiflux-cloud.github.io/dashboard-vendas/

![Painel](docs/prints/painel.png)

## Funcionalidades

- **Indicadores:** faturamento, ticket médio, taxa de conversão e pedidos pagos, com variação contra o período anterior.
- **Gráfico de evolução** em SVG, com período anterior sobreposto e tooltip.
- **Meta do período** editável, com progresso e valor a receber.
- **Funil de conversão**, desempenho por canal, ranking de vendedores e produtos mais vendidos.
- **Filtros** por período, vendedor, canal e status.
- **Nova venda** pelo formulário, salva no navegador.
- **Importar CSV** e **exportar relatório** em CSV ou PDF.
- **Tema claro e escuro**, responsivo para celular.

## Regras de negócio

| Indicador | Regra |
|---|---|
| Faturamento | Soma dos pedidos pagos (pendentes e cancelados ficam de fora) |
| Ticket médio | Faturamento ÷ pedidos pagos |
| Conversão | Pedidos pagos ÷ leads do período |
| Comparação | Período anterior de mesma duração; conversão em pontos percentuais |
| Meta do time | Meta individual × nº de vendedores × dias |

A lista completa está em [docs/REQUISITOS.md](docs/REQUISITOS.md).

## Como rodar

Não precisa instalar nada.

1. Baixe ou clone o repositório.
2. Abra o `index.html` no navegador (ou use a extensão Live Server do VS Code).

## Usando seus dados

Clique em **Importar CSV** (use **Baixar modelo** para ver o formato):

```csv
data;canal;vendedor;etapa;produto;valor;status
2026-10-01;WhatsApp;Ana Lima;pedido;Plano Presence;497;pago
2026-10-01;Instagram;Bruno Reis;lead;;;
```

Para buscar de uma API, preencha `API_URL` no `script.js`. Ela deve devolver um array JSON com as mesmas colunas.

## Estrutura

```
dashboard-vendas/
├── index.html      # estrutura da página
├── style.css       # tema, layout e responsivo
├── script.js       # dados, regras de negócio e renderização
└── docs/
    ├── REQUISITOS.md
    └── prints/
```

## Tecnologias

HTML5, CSS3 (variáveis, grid, flexbox) e JavaScript (ES2020), com gráfico em SVG gerado por código e persistência em `localStorage`.

## Próximos passos

- Backend para compartilhar dados entre dispositivos
- Autenticação e múltiplos usuários
- Metas por vendedor e por mês

## Autor

Matheus | Potiflux · [@potiflux-cloud](https://github.com/potiflux-cloud)