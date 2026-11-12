#!/bin/sh

# Configura o host do OpenTelemetry Collector no nginx se fornecido
OTEL_HOST="${OTEL_COLLECTOR_HOST:-autoreparos-otel-collector}"
if [ -f /etc/nginx/conf.d/default.conf ]; then
  sed -i "s|http://[^:]*:4318/v1/traces|http://${OTEL_HOST}:4318/v1/traces|g" /etc/nginx/conf.d/default.conf
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
