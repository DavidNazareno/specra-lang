# `.scl.md` Language Guide

Specra source files now prefer the `.scl.md` extension. Legacy plain `.scl` files are still supported.

In `.scl.md` files, Specra reads only fenced code blocks labeled `specra`.

````md
# Example

```specra
service: ExampleApp
goal: Describe the core workflow
```
````

## Top-level statements

Allowed top-level statements:

- `import "./relative/path.scl.md"`
- `service Name` or `service: Name`
- `goal: text`
- `entity Name ... end` or `entity Name: ... end`
- `operation name(InputA, InputB) -> Output` or `operation name: ... end`
- `expectation name ... end` or `expectation name: ... end`
- `constraint key: value`
- `target key: value`

Anything else is rejected by the parser.

## Imports

Use imports to split a contract across multiple `.scl.md` files.

```txt
import "./features/hello-world.scl.md"
import "./shared/auth.scl.md"
```

Rules:

- Imports must be a whole line: `import "./relative/path.scl.md"`
- Imported paths are resolved relative to the file that declares them
- Imports are recursive
- Circular imports are rejected
- When you run Specra against a folder such as `specra/`, root `.scl.md` files act as entrypoints and their imports pull in the rest of the contract graph

## Entities

Entity blocks define structured domain types.

```txt
entity Reservation:
id: UUID
customerName: string
date: string
partySize: number
status: string
end
```

Rules:

- Entity names must be identifiers.
- Field names must be identifiers.
- Field types must be identifiers.
- Every entity block must end with `end`.

## Operations

Operations define intended behavior at the contract level.

```txt
operation createReservation:
input: Reservation
output: Reservation
end

operation assignTable:
input: Reservation, TableAssignment
output: Result
end
```

Rules:

- Operation names must be identifiers.
- Inputs are a comma-separated list of type names.
- Output must be an identifier.
- Legacy single-line syntax like `operation createReservation(Reservation) -> Reservation` is still supported.

## Expectations

Expectations define behavior that later verification can check.

```txt
expectation createReservation_success:
operation: createReservation
auth: valid
input customerName: "Ana"
input date: "2026-06-01T20:00:00Z"
input partySize: 4
expect outcome: success
expect output.status: "pending"
end
```

Allowed lines inside an `expectation` block:

- `operation: operationName`
- `auth: valid|missing|optional`
- `input fieldName: value`
- `expect outcome: success|unauthorized|error`
- `expect output.fieldName: value`

Rules:

- Every expectation block must end with `end`.
- Every expectation must reference a known operation.
- Every expectation must contain at least one assertion.
- Input fields are validated against the primary input entity of the referenced operation.

## Scalar values

The current parser supports:

- strings
- integers
- booleans

Quoted strings are unwrapped by the parser.

## Constraints and targets

Constraints and targets are simple key-value pairs today.

```txt
constraint auth_required: true
constraint p95_latency_ms: 200

target runtime: generic
target database: postgres
```

Keys must be identifiers.

## Current built-in types

- `UUID`
- `Money`
- `string`
- `number`
- `boolean`

## Parsing model

Specra currently enforces a strict block grammar:

- no nested entity blocks
- no nested expectation blocks
- no top-level fields
- no free-form lines inside expectation blocks

This strictness is intentional. The current goal is to keep Specra contracts small, explicit, and easy to validate.
