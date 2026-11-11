# Landing page / catálogo de telas — Fabric ERP

Página de apresentação do **Fabric** para clientes: o produto explicado por
módulo e um catálogo com **48 telas** do próprio sistema, ampliáveis.

Site estático: HTML, CSS e um `<dialog>` para ampliar as telas. Sem build, sem
dependências, sem requisição a terceiros — as fontes Barlow são servidas junto
com a página, como no próprio sistema.

## Conteúdo

| | |
|---|---|
| `index.html` | A página inteira |
| `estilo.css` | Paleta e layout, a partir dos tokens do sistema |
| `visor.js` | Visualizador das telas (`<dialog>`, setas do teclado) |
| `img/telas/` | 48 telas em 1440×900 (WebP) |
| `img/miniaturas/` | As mesmas em 720×450, carregadas sob demanda |
| `fontes/` | Barlow e Barlow Condensed (WOFF2) |
| `capturar-telas.mjs` | Recaptura as telas a partir de uma instância do Fabric |

Para ver localmente, qualquer servidor estático serve:

```bash
python3 -m http.server 8000
# depois abra http://localhost:8000
```

Repositório: https://github.com/gustavoflandal/Landing-page-fabric

O deploy na VPS está em [DEPLOY.md](DEPLOY.md).

## Como as telas são capturadas

As imagens saem de uma instância do Fabric com **dados de demonstração** — os
mesmos cadastros dos seeds do projeto (produtos PA-001/PA-002, fornecedores
FOR-001…, centros CT-001…), para que nenhuma tela apareça vazia.

Na instância de demonstração, com o banco já populado:

```bash
cd backend
npm run prisma:migrate
npm run prisma:seed          # e os demais seeds (ver backend/SEED_README.md)
npm run dev                  # API em :3005

cd ../frontend && npm run dev   # Vite em :5173
```

Depois, da pasta desta landing:

```bash
npm i --no-save playwright sharp
FABRIC_URL=http://localhost:5173 \
FABRIC_EMAIL=admin@fabric.com \
FABRIC_SENHA='<a senha do ambiente de demonstração>' \
node capturar-telas.mjs
```

A captura é feita em 1440×900 com densidade 2× e depois reduzida — é daí que
vem a nitidez. Os nomes dos arquivos são estáveis (`03-production-orders.webp`
e assim por diante), então **uma recaptura substitui as imagens sem mexer no
HTML**. Para acrescentar uma tela nova, basta incluí-la na lista `TELAS` do
script e adicionar o `<li class="tela">` correspondente no `index.html`.

Nenhuma credencial fica no repositório: o script lê usuário e senha do
ambiente.
