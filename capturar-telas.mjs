/**
 * Recaptura as telas do catálogo a partir de uma instância do Fabric com
 * dados de demonstração.
 *
 *   npm i --no-save playwright sharp
 *   FABRIC_URL=http://localhost:5173 \
 *   FABRIC_EMAIL=admin@fabric.com \
 *   FABRIC_SENHA='...' \
 *   node capturar-telas.mjs [filtro ...]
 *
 * Sem filtro, captura tudo. Com filtro, só as telas cujo nome contém o termo
 * (ex.: `node capturar-telas.mjs wms yard`).
 *
 * Os nomes dos arquivos são estáveis: a recaptura substitui as imagens sem
 * exigir nenhuma mudança no index.html.
 */
import { chromium } from 'playwright';
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.FABRIC_URL || 'http://localhost:5173';
const EMAIL = process.env.FABRIC_EMAIL || 'admin@fabric.com';
const SENHA = process.env.FABRIC_SENHA;
const LARGURA = 1440, ALTURA = 900;
const DIR = path.dirname(new URL(import.meta.url).pathname);
const TELAS_DIR = path.join(DIR, 'img', 'telas');
const MINI_DIR = path.join(DIR, 'img', 'miniaturas');

// nome do arquivo => rota do sistema. A ordem é a do catálogo.
const TELAS = [
  ['00-login', '/login'],
  ['01-dashboard', '/dashboard'],
  ['02-pcp-dashboard', '/pcp/dashboard'],
  ['03-production-orders', '/production-orders'],
  ['04-production-pointings', '/production-pointings'],
  ['05-mrp', '/mrp'],
  ['06-products', '/products'],
  ['07-work-centers', '/work-centers'],
  ['08-stock', '/stock'],
  ['09-warehouses', '/warehouses'],
  ['10-warehouse-structures', '/warehouse-structures'],
  ['11-wms-locations', '/wms/locations'],
  ['12-wms-operations', '/wms/operations'],
  ['13-wms-picking', '/wms/picking'],
  ['14-wms-transfers', '/wms/transfers'],
  ['15-wms-workflows', '/wms/workflows'],
  ['16-wms-kpis', '/wms/kpis'],
  ['17-counting-dashboard', '/counting/dashboard'],
  ['18-counting-plans', '/counting/plans'],
  ['19-counting-sessions', '/counting/sessions'],
  ['20-purchase-quotations', '/purchases/quotations'],
  ['21-purchase-orders', '/purchases/orders'],
  ['22-purchase-receipts', '/purchases/receipts'],
  ['23-suppliers', '/suppliers'],
  ['24-customers', '/customers'],
  ['25-sales-orders', '/sales-orders'],
  ['26-shipments', '/shipments'],
  ['27-yard-dashboard', '/yard/dashboard'],
  ['28-yard-visits', '/yard/visits'],
  ['29-yard-docks', '/yard/docks'],
  ['30-yard-vehicles', '/yard/vehicles'],
  ['31-yard-drivers', '/yard/drivers'],
  ['32-yard-areas', '/yard/areas'],
  ['33-maintenance-equipment', '/maintenance/equipment'],
  ['34-maintenance-plans', '/maintenance/plans'],
  ['35-maintenance-orders', '/maintenance/orders'],
  ['36-maintenance-kpis', '/maintenance/kpis'],
  ['37-reports', '/reports', { acao: 'gerar-relatorios' }],
  ['38-users', '/users'],
  ['39-roles', '/roles'],
  ['40-audit-logs', '/audit-logs'],
  ['41-notifications', '/notifications'],
  ['42-settings', '/settings/system'],
  ['43-units', '/units-of-measure'],
  // As quatro abaixo dependem de um registro existente: ajuste o id conforme
  // a base de demonstração (ou aponte para outro registro equivalente).
  ['44-wms-workflow-editor', '/wms/workflows/:idWorkflow'],
  ['45-purchase-receipt-new', '/purchases/receipts/new'],
  ['46-counting-report', '/counting/sessions/:idSessao/report'],
  ['47-shipment-detail', '/shipments/:idRomaneio'],
];

const IDS = {
  ':idWorkflow': process.env.FABRIC_ID_WORKFLOW || '',
  ':idSessao': process.env.FABRIC_ID_SESSAO || '',
  ':idRomaneio': process.env.FABRIC_ID_ROMANEIO || '',
};

const filtros = process.argv.slice(2);
const escolhidas = filtros.length
  ? TELAS.filter(([n]) => filtros.some((f) => n.includes(f)))
  : TELAS;

fs.mkdirSync(TELAS_DIR, { recursive: true });
fs.mkdirSync(MINI_DIR, { recursive: true });

if (!SENHA) {
  console.error('Defina FABRIC_SENHA (a senha do usuário da instância de demonstração).');
  process.exit(1);
}

const navegador = await chromium.launch();
const ctx = await navegador.newContext({
  viewport: { width: LARGURA, height: ALTURA },
  deviceScaleFactor: 2,
  locale: 'pt-BR',
  timezoneId: 'America/Sao_Paulo',
  colorScheme: 'light',
});

const gravar = async (pagina, nome) => {
  const png = await pagina.screenshot();
  await sharp(png).resize(LARGURA, ALTURA, { fit: 'cover', position: 'top' })
    .webp({ quality: 86, effort: 6 }).toFile(path.join(TELAS_DIR, `${nome}.webp`));
  await sharp(png).resize(720, 450, { fit: 'cover', position: 'top' })
    .webp({ quality: 80, effort: 6 }).toFile(path.join(MINI_DIR, `${nome}.webp`));
};

// 1) Tela de login, antes de autenticar.
const pgLogin = await (await navegador.newContext({
  viewport: { width: LARGURA, height: ALTURA }, deviceScaleFactor: 2, locale: 'pt-BR', colorScheme: 'light',
})).newPage();
await pgLogin.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
await pgLogin.waitForTimeout(1500);
if (escolhidas.some(([n]) => n === '00-login')) {
  await gravar(pgLogin, '00-login');
  console.log('00-login');
}

// 2) Autentica de verdade e reaproveita a sessão nas demais telas.
const pg = await ctx.newPage();
await pg.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
await pg.getByLabel(/e-?mail/i).fill(EMAIL);
await pg.getByLabel(/senha/i).fill(SENHA);
await pg.getByRole('button', { name: /entrar/i }).click();
await pg.waitForURL(/\/dashboard/, { timeout: 30000 });

for (const [nome, rota, opcoes] of escolhidas) {
  if (nome === '00-login') continue;
  let caminho = rota;
  for (const [marca, valor] of Object.entries(IDS)) {
    if (caminho.includes(marca)) {
      if (!valor) { console.log(`${nome}: pulada (defina o id em ${marca})`); caminho = null; break; }
      caminho = caminho.replace(marca, valor);
    }
  }
  if (!caminho) continue;

  try {
    await pg.goto(BASE + caminho, { waitUntil: 'networkidle', timeout: 45000 });
  } catch (e) {
    console.log(`  ! ${nome}: ${e.message.split('\n')[0]}`);
  }
  await pg.waitForTimeout(2600);

  if (opcoes?.acao === 'gerar-relatorios') {
    const botao = pg.getByRole('button', { name: /gerar relat/i }).first();
    if (await botao.count()) { await botao.click(); await pg.waitForTimeout(2600); }
  }

  await pg.evaluate(() => window.scrollTo(0, 0));
  await gravar(pg, nome);
  console.log(nome);
}

await navegador.close();
console.log(`\n${escolhidas.length} tela(s) em img/telas e img/miniaturas.`);
