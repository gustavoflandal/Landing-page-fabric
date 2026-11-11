# Imagem estática: nginx servindo o catálogo do Fabric sob /fabric/. Os
# arquivos são copiados um a um em vez de `COPY . .` para que Dockerfile,
# compose, documentação e script de captura não acabem publicados junto.
FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY index.html estilo.css visor.js /usr/share/nginx/html/fabric/
COPY fontes/ /usr/share/nginx/html/fabric/fontes/
COPY img/    /usr/share/nginx/html/fabric/img/

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/healthz || exit 1
