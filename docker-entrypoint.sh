#!/bin/sh

# Configura o host do OpenTelemetry Collector e as URLs dos microsserviços no nginx se fornecidos
OTEL_HOST="${OTEL_COLLECTOR_HOST:-autoreparos-otel-collector}"
OS_URL="${OS_URL:-http://autoreparos-os:8080}"
COBRANCA_URL="${COBRANCA_URL:-http://autoreparos-cobranca:8080}"
EXECUCAO_URL="${EXECUCAO_URL:-http://autoreparos-execucao:8080}"
CADASTROS_URL="${CADASTROS_URL:-http://autoreparos-cadastros:8080}"

if [ -f /etc/nginx/conf.d/default.conf ]; then
  sed -i "s|http://[^:]*:4318/v1/traces|http://${OTEL_HOST}:4318/v1/traces|g" /etc/nginx/conf.d/default.conf
  sed -i "s|set \$os_url \"[^\"]*\";|set \$os_url \"${OS_URL%/}\";|g" /etc/nginx/conf.d/default.conf
  sed -i "s|set \$cobranca_url \"[^\"]*\";|set \$cobranca_url \"${COBRANCA_URL%/}\";|g" /etc/nginx/conf.d/default.conf
  sed -i "s|set \$execucao_url \"[^\"]*\";|set \$execucao_url \"${EXECUCAO_URL%/}\";|g" /etc/nginx/conf.d/default.conf
  sed -i "s|set \$cadastros_url \"[^\"]*\";|set \$cadastros_url \"${CADASTROS_URL%/}\";|g" /etc/nginx/conf.d/default.conf
  # Usa o DNS do ambiente (Docker, Kubernetes) em vez do padrão do Docker
  DNS_HOST="$(awk '/^nameserver/ { print $2; exit }' /etc/resolv.conf)"
  if [ -n "$DNS_HOST" ]; then
    sed -i "s|resolver [^ ;]* |resolver ${DNS_HOST} |" /etc/nginx/conf.d/default.conf
  fi
fi

# Injeta a variável API_URL no env.js se configurada (mesmo se vazia para URLs relativas em produção)
if [ "${API_URL+set}" = "set" ]; then
  echo "Setting API URL to: '$API_URL'"
  encoded_url="$(printf '%s' "$API_URL" | od -An -tx1 | tr -d '[:space:]' | sed 's/../%&/g')"
  printf "(function(window) { window.__env = window.__env || {}; window.__env.apiUrl = decodeURIComponent('%s'); })(this);\n" "$encoded_url" > /usr/share/nginx/html/env.js
fi

exec "$@"
