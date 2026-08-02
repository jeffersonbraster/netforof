# Patches

## `next@16.2.12.patch` — payload RSC corrompido nas páginas retomadas do PPR

### O sintoma

Toda página com casca prerenderizada + buraco dinâmico (`◐` no relatório do
build — hoje `/noticias` e `/admin`) podia sair com um script assim:

```html
<script>self.__next_f.push([1,"…grid gap-4 sm:<script src="/_next/static/chunks/POLYFILL.js" noModule=""></script>
```

O `push([1,"` nunca fecha. O navegador termina o script no primeiro
`</script>`, o literal de string fica aberto, o parser levanta `SyntaxError` e
todo o payload RSC dali em diante é descartado. A hidratação morre: o HTML
aparece, mas nada responde a clique. No `/admin` isso era o painel "quebrado";
em `/noticias`, uma página pública inteira sem interatividade.

Pior: a resposta corrompida ia para o cache do KV e ficava servida assim até a
próxima revalidação.

### A causa

`createInlinedDataReadableStream`, em
`dist/server/app-render/use-flight-response.js`, cria o stream do payload como
**byte stream** (`type: 'bytes'`). Cada `<script>self.__next_f.push(…)</script>`
é enfileirado inteiro, mas um byte stream pode ser entregue ao consumidor em
pedaços — e no runtime da Cloudflare ele vem em blocos de ~4096 bytes.

Do outro lado, `createFlightDataInjectionTransformStream` mistura dois
produtores no mesmo controller: o laço que lê esse stream e o `transform` que
repassa o HTML do Fizz. Entre as leituras ele **cede a vez de propósito** para
o HTML passar primeiro:

```js
// We want to prioritize HTML over RSC data.
if (!delayDataUntilFirstHtmlChunk && !htmlStreamFinished) {
    await atLeastOneTask();
}
controller.enqueue(value);
```

Quando o script vinha partido, o HTML entrava no meio dele.

Na retomada de PPR o `delayDataUntilFirstHtmlChunk` é `false` (a casca não é
vazia), então essa cessão acontece a cada leitura — daí a corrupção atingir
justamente as páginas retomadas.

Sob Node puro não acontece: os pedaços não são partidos do mesmo jeito. Por
isso só quebrava em produção, e o `next start` local passava limpo.

### A correção

Tirar o `type: 'bytes'`. Sem o modo byte, cada leitura devolve um script
inteiro, e ceder a vez para o HTML entre scripts é seguro.

O patch mexe em dois lugares porque **quem roda em produção é o runtime
pré-compilado**, não a fonte legível:

- `dist/server/app-render/use-flight-response.js` e a versão ESM (usadas pelo
  `next dev` e por ferramentas);
- `dist/compiled/next-server/app-page*.runtime.{prod,dev}.js` — estes são os que
  o OpenNext empacota no Worker.

### Como foi verificado

Com o worker rodando em workerd local, renders frios de `/noticias` e das
quatro abas do `/admin`:

| | antes | depois |
|---|---|---|
| renders frios corrompidos | 19/20 | 0/48 |
| 1ª requisição após boot do worker | corrompia sempre | 0/6 |

### Quando remover

Quando o Next corrigir isso lá em cima. Para checar: veja se
`createInlinedDataReadableStream` ainda cria o stream com `type: 'bytes'` e se
`createFlightDataInjectionTransformStream` ainda tem o `await atLeastOneTask()`
antes do `enqueue`. Se qualquer um dos dois sumir, teste sem o patch antes de
descartá-lo.

Numa atualização do Next o `pnpm install` falha alto se o patch não aplicar —
é o comportamento desejado: melhor o deploy parar do que voltar a publicar
página corrompida sem ninguém perceber.
