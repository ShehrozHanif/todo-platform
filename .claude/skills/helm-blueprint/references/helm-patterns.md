# Helm Chart Best Practices

## Chart Structure

```
chart-name/
├── Chart.yaml          # Chart metadata (apiVersion v2)
├── values.yaml         # Default configuration values
├── .helmignore         # Files to ignore when packaging
└── templates/
    ├── _helpers.tpl    # Named template definitions
    ├── deployment.yaml
    ├── service.yaml
    ├── configmap.yaml
    ├── ingress.yaml    # Optional
    ├── secret.yaml     # Optional
    ├── hpa.yaml        # Optional
    └── NOTES.txt       # Post-install notes
```

## Naming Conventions

- Chart names: lowercase, hyphens allowed (e.g., `todo-backend`)
- Template names: lowercase, correspond to K8s resource type
- Value keys: camelCase (e.g., `replicaCount`, `pullPolicy`)

## _helpers.tpl Standard Templates

```yaml
{{- define "chart.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "chart.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}

{{- define "chart.labels" -}}
helm.sh/chart: {{ include "chart.name" . }}-{{ .Chart.Version | replace "+" "_" }}
app.kubernetes.io/name: {{ include "chart.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{- define "chart.selectorLabels" -}}
app.kubernetes.io/name: {{ include "chart.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}
```

## Deployment Template Pattern

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "chart.fullname" . }}
  labels:
    {{- include "chart.labels" . | nindent 4 }}
spec:
  replicas: {{ .Values.replicaCount }}
  selector:
    matchLabels:
      {{- include "chart.selectorLabels" . | nindent 6 }}
  template:
    metadata:
      labels:
        {{- include "chart.selectorLabels" . | nindent 8 }}
      annotations:
        checksum/config: {{ include (print $.Template.BasePath "/configmap.yaml") . | sha256sum }}
    spec:
      containers:
        - name: {{ .Chart.Name }}
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
          imagePullPolicy: {{ .Values.image.pullPolicy }}
          ports:
            - containerPort: {{ .Values.service.targetPort }}
          livenessProbe:
            httpGet:
              path: {{ .Values.probes.liveness.path | default "/health" }}
              port: {{ .Values.service.targetPort }}
            initialDelaySeconds: 10
            periodSeconds: 30
          readinessProbe:
            httpGet:
              path: {{ .Values.probes.readiness.path | default "/health" }}
              port: {{ .Values.service.targetPort }}
            initialDelaySeconds: 5
            periodSeconds: 10
          resources:
            {{- toYaml .Values.resources | nindent 12 }}
          envFrom:
            - configMapRef:
                name: {{ include "chart.fullname" . }}-config
            - secretRef:
                name: {{ include "chart.fullname" . }}-secret
                optional: true
```

## ConfigMap Checksum Annotation

Forces pod restart when config changes:

```yaml
annotations:
  checksum/config: {{ include (print $.Template.BasePath "/configmap.yaml") . | sha256sum }}
```

## Service Types

| Type | Use Case |
|------|----------|
| ClusterIP | Internal services, with Ingress for external |
| NodePort | Local dev (Minikube), direct access |
| LoadBalancer | Cloud providers with LB support |

## Ingress Pattern

```yaml
{{- if .Values.ingress.enabled }}
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: {{ include "chart.fullname" . }}
  annotations:
    {{- toYaml .Values.ingress.annotations | nindent 4 }}
spec:
  ingressClassName: {{ .Values.ingress.className }}
  rules:
    {{- range .Values.ingress.hosts }}
    - host: {{ .host }}
      http:
        paths:
          {{- range .paths }}
          - path: {{ .path }}
            pathType: {{ .pathType }}
            backend:
              service:
                name: {{ include "chart.fullname" $ }}
                port:
                  number: {{ $.Values.service.port }}
          {{- end }}
    {{- end }}
{{- end }}
```

## Anti-Patterns

- Never hardcode image tags as `latest` in production
- Never store secrets in values.yaml (use external secrets or sealed secrets)
- Never skip resource limits (causes noisy neighbor issues)
- Never skip probes (causes traffic to unhealthy pods)

Sources:
- https://helm.sh/docs/chart_template_guide/
- https://helm.sh/docs/topics/charts/
- https://www.baeldung.com/ops/helm-charts-best-practices
