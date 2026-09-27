# Guia do Diagnóstico (PDF)

`Moulis-Guia-Diagnostico-Maturidade.pdf` — guia de uso da ferramenta + metodologia + conceitos do Manual de Data Governance, para compartilhar com a equipe e clientes.

O conteúdo da metodologia vem dos mesmos arquivos usados no app (`src/model/framework.ts` e `src/model/concepts.ts`), então app e guia ficam sempre alinhados.

Para regenerar depois de mudar perguntas ou textos:

1. `node --experimental-strip-types scripts/build-guide.ts` → gera `docs/guia/guia.html` (as imagens ficam em `docs/guia/img/`).
2. Abra `guia.html` no Chrome → Imprimir → *Salvar como PDF*, papel A4, margens padrão, **Gráficos de fundo** ligado.
