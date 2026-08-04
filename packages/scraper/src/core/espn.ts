/**
 * Host da API pública da ESPN.
 *
 * Em 04/08/2026 todos os jobs passaram a falhar com HTTP 403. A causa não era
 * nossa: a ESPN pôs o Akamai na frente de `site.api.espn.com` e passou a negar
 * TODO caminho daquele host — 403 em news, schedule, standings e scoreboard,
 * do IP do runner e de conexão residencial igual, com UA de bot ou de Chrome.
 * Não é rate limit nem bloqueio de datacenter: é o host inteiro fechado.
 *
 * `site.web.api.espn.com` é o host que o próprio site da ESPN consome e serve
 * exatamente os mesmos caminhos, com o mesmo formato de resposta (conferido
 * campo a campo em news, schedule, standings, scoreboard e summary).
 *
 * Fica como constante única porque o bloqueio pode se repetir no host novo:
 * assim a troca é uma linha, e não uma caça a URL espalhada por três arquivos.
 */
export const ESPN_API = "https://site.web.api.espn.com";
