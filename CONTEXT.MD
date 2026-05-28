Resumen
Specra es un lenguaje de especificación orientado a IA. La dirección actual del proyecto no es compilar apps completas por sí solo, sino actuar como contrato estricto entre intención humana, implementación asistida por IA y verificación. La extensión del lenguaje es .scl, el proyecto está en 0.1.0, y el repo ya está preparado para publicarse como open source.
Qué ya está hecho
El repo usa pnpm + Nx + TypeScript + Biome. Hay un parser y validador de .scl, un AST, un IR normalizado, generación de contexto para IA, expectations verificables, un verificador base y un extractor TypeScript basado en snapshots.
Paquetes actuales:
@specra/ast: tipos del documento
@specra/core: parser y validator
@specra/ir: modelo semántico normalizado + verification plan
@specra/ai-context: artefactos para agentes + brief
@specra/verifier: compara observed results contra expectations
@specra/verifier-typescript: convierte snapshots TypeScript-friendly en observed results
@specra/cli: comandos del usuario
CLI actual:
specra inspect <file.scl>
specra check <file.scl>
specra context <file.scl>
specra snapshot-template <file.scl>
specra extract-typescript <file.scl> --impl <snapshot.json>
specra generate <file.scl> --out <folder>
specra verify <file.scl> --results <observed-results.json>
Sintaxis .scl actual
Soporta:
service
goal
entity ... end
operation
expectation ... end
constraint
target
Dentro de expectation:
operation:
auth: valid|missing|optional
input field: value
expect outcome: success|unauthorized|error
expect output.field: value
Ejemplo funcional
Hay un ejemplo en:
examples/booking-app/app.scl
Fixtures/tests:
tests/specra.test.mjs
tests/fixtures
Artefactos que genera hoy
specra.json
SUMMARY.md
verification-plan.json
ai-context.json
AI-BRIEF.md
Verificación actual
El flujo actual es:
.scl define intención y expectations
Specra genera contexto y plan de verificación
una implementación produce un snapshot o observed results
specra verify compara observed results con expectations
Hoy el extractor TypeScript no analiza código arbitrario aún; usa un snapshot estructurado como puente.
Infra open source ya preparada
Ya están:
README
docs de superficie estable, lenguaje, verificación, publicación y versionado
CHANGELOG
CODE_OF_CONDUCT
CONTRIBUTING
templates de GitHub para issues/PR
Changesets
GitHub Actions para CI y Versioning
Archivos importantes:
README.md
docs/current-stable-surface.md
docs/language-scl.md
docs/verification-workflow.md
docs/versioning-and-releases.md
docs/publishing-checklist.md
Qué falta
Lo principal pendiente antes de una interacción más real con IA:
una fachada cómoda tipo @specra/sdk
un loop local end-to-end menos manual
un extractor TypeScript real desde código o tests, no solo snapshot
más ejemplos reales
quizá un comando orquestador para trial local
Siguiente paso recomendado
Crear:
@specra/sdk
un ejemplo examples/local-trial
y un flujo donde la IA lea app.scl, obtenga ai-context, produzca implementación o snapshot, y luego Specra verifique automáticamente
Estado técnico
La base compila y valida. Los comandos que ya se han usado y funcionan son:
pnpm build
pnpm check
pnpm lint
pnpm test
pnpm specra context ...
pnpm specra generate ...
pnpm specra verify ...
Idea central
La filosofía actual del proyecto es:
Specra no deja que la IA haga lo que quiera; le da una estructura pequeña, validable y verificable para implementar dentro de límites claros.
Si quieres, en el siguiente chat puedes pedirme directamente:
crea @specra/sdk y un local-trial para empezar a probar Specra con IA de verdad