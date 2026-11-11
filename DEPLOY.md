# Deploy na VPS

O catálogo é servido em **https://syncrofin.com.br/fabric/** por um contêiner
nginx próprio, atrás do Caddy que já atende 80/443 na VPS — o mesmo desenho do
`/pdv-lev` e do `/enterprise`.

| | |
|---|---|
| Contêiner | `fabric-landing` |
| Porta local | `127.0.0.1:8092` (só para teste dentro da VPS) |
| Rede do proxy | `syncrofin-pessoal_default` (externa) |
| Proxy | `syncrofin-pessoal-caddy-1` |

> Se a landing for publicada em domínio próprio em vez de subcaminho, troque
> `/fabric/` por `/` no `nginx.conf` e no `Dockerfile` — o resto não muda.

## 1. Subir o contêiner

```bash
cd /opt
git clone https://github.com/gustavoflandal/Landing-page-fabric.git fabric-landing
cd /opt/fabric-landing

docker compose up -d --build

echo "=== TESTE LOCAL (espera 200) ==="
curl -sI http://127.0.0.1:8092/fabric/ | head -3

echo "=== O CADDY ENXERGA O CONTÊINER? (espera 200) ==="
docker exec syncrofin-pessoal-caddy-1 \
  wget -qS -O /dev/null http://fabric-landing/fabric/ 2>&1 | head -3
```

O segundo teste é o que confirma que a rede ficou certa, **antes** de mexer no
proxy. Se ele falhar, o problema é a rede externa, não o Caddy.

## 2. Publicar no Caddy

A regra precisa vir **antes** do `handle {` catch-all, e o `reverse_proxy` vai
**sem barra no final** — senão o prefixo `/fabric` é cortado e a página abre
sem CSS nem imagens.

```bash
cd /opt/syncrofin/releases/<versão-atual>/deploy/caddy
cp -a Caddyfile.landing Caddyfile.landing.bak

awk '
  !feito && /^[[:space:]]*handle[[:space:]]*\{[[:space:]]*$/ {
    print "\thandle /fabric* {"
    print "\t\treverse_proxy fabric-landing:80"
    print "\t}"
    print ""
    feito=1
  }
  { print }
' Caddyfile.landing.bak > Caddyfile.landing

diff Caddyfile.landing.bak Caddyfile.landing
docker exec syncrofin-pessoal-caddy-1 \
  caddy validate --config /etc/caddy/Caddyfile.landing --adapter caddyfile
```

O diff tem de mostrar exatamente três linhas acrescentadas mais uma em branco.
Se a validação falhar, `cp -a Caddyfile.landing.bak Caddyfile.landing` restaura:
nada terá mudado no ar, porque o Caddy só relê a configuração no reload.

```bash
docker exec syncrofin-pessoal-caddy-1 \
  caddy reload --config /etc/caddy/Caddyfile.landing --adapter caddyfile

curl -sI https://syncrofin.com.br/fabric/ | head -5
curl -sI https://syncrofin.com.br/fabric  | grep -iE 'HTTP|location'   # 301
curl -sI https://syncrofin.com.br/ | head -3                           # intacto
curl -sI https://syncrofin.com.br/pdv-lev/  | head -3                  # intacto
curl -sI https://syncrofin.com.br/enterprise/ | head -3                # intacto
```

## 3. Fixar a regra no repositório do SyncroFin

**Sem este passo a página some no próximo release.** O deploy do SyncroFin é por
release versionado (`current -> releases/vX.Y.Z`), então uma versão nova nasce
com um `Caddyfile.landing` limpo e leva junto a regra do `/fabric` — sem erro
nenhum, a página simplesmente deixa de responder.

Faça a mesma edição em `deploy/caddy/Caddyfile.landing` no repositório do
SyncroFin e comite. É a mesma pendência que o `/pdv-lev` e o `/enterprise` têm.

## Atualizar a página depois

```bash
cd /opt/fabric-landing
git pull
docker compose up -d --build
curl -sI https://syncrofin.com.br/fabric/ | head -3
```

Não é preciso tocar no Caddy: o nome do contêiner não muda.
