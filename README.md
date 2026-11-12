# AutoReparos.Web

Frontend Angular 22 do AutoReparos, extraído de `AutoReparos.Cadastros/AutoReparos.Web` para um repositório próprio. A branch de integração é `develop`; mudanças para `main` seguem por pull request.

## Desenvolvimento local

Requisitos: Node.js 22 e Yarn 1.22.22. O projeto usa o `yarn.lock` versionado.

```bash
corepack enable
yarn install --frozen-lockfile
yarn dev
```

Para conferir a aplicação:

```bash
yarn build
yarn test --watch=false
```

O projeto Angular mantém o nome interno `app-temp`; o build de produção gera `dist/app-temp/browser`, usado pelo Dockerfile.

## URL da API

O navegador lê `window.__env.apiUrl` de `public/env.js`. O valor versionado é `http://localhost:8080` para desenvolvimento. Ao iniciar a imagem Docker, defina `API_URL` para substituir esse valor sem recompilar:

```bash
docker build -t autoreparos-web .
docker run --rm -p 8081:8080 -e API_URL=http://localhost:8080 autoreparos-web
```

A interface fica em `http://localhost:8081`. Quando `API_URL` é definido como string vazia, as chamadas usam URLs relativas; sem a variável, permanece o valor de `public/env.js`.

`src/app/core/config/api-endpoints.ts` ainda contém os paths HTTP legados do monólito. Adaptá-los às APIs de OS, Cobrança, Execução e Cadastros e criar as telas novas da Fase 4 são etapas posteriores à extração do repositório. O build e os testes deste projeto não demonstram integração ponta a ponta com esses serviços.

## CI e qualidade

`.github/workflows/ci-cd.yml` executa os jobs `build`, `test` e `quality` em PRs para `main` e em pushes para `develop` ou `main`. O job `quality` usa SonarCloud e precisa do secret `SONAR_TOKEN` no repositório. As variáveis opcionais `SONAR_ORGANIZATION` e `SONAR_PROJECT_KEY` podem substituir os valores padrão do workflow. Não grave tokens no código ou em arquivos locais versionados.
