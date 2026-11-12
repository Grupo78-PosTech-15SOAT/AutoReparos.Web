#!/bin/sh

# Configura o host do OpenTelemetry Collector no nginx se fornecido
OTEL_HOST="${OTEL_COLLECTOR_HOST:-autoreparos-otel-collector}"
if [ -f /etc/nginx/conf.d/default.conf ]; then
  sed -i "s|http://[^:]*:4318/v1/traces|http://${OTEL_HOST}:4318/v1/traces|g" /etc/nginx/conf.d/default.conf
fi

# Injeta a variável API_URL no env.js se configurada (mesmo se vazia para URLs relativas em produção)
if [ "${API_URL+set}" = "set" ]; then
  echo "Setting API URL to: '$API_URL'"
  echo "(function(window) { window.__env = window.__env || {}; window.__env.apiUrl = '$API_URL'; })(this);" > /usr/share/nginx/html/env.js
fi

exec "$@"
