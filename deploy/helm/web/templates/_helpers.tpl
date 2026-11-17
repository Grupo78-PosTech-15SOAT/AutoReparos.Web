{{/* Nome fixo dos objetos: o Ingress e o pipeline procuram o Service e o Deployment autoreparos-web. */}}
{{- define "web.fullname" -}}
autoreparos-web
{{- end }}

{{- define "web.selectorLabels" -}}
app.kubernetes.io/name: autoreparos-web
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{- define "web.labels" -}}
helm.sh/chart: {{ printf "%s-%s" .Chart.Name .Chart.Version }}
{{ include "web.selectorLabels" . }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/part-of: autoreparos
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}
