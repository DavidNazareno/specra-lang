# `.scl` Language Guide

Specra source files use the `.scl` extension.

## Top-level statements

Allowed top-level statements:

- `service Name`
- `goal: text`
- `entity Name ... end`
- `operation name(InputA, InputB) -> Output`
- `expectation name ... end`
- `constraint key: value`
- `target key: value`

Anything else is rejected by the parser.

## Entities

Entity blocks define structured domain types.

```txt
entity Reservation
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
operation createReservation(Reservation) -> Reservation
operation assignTable(Reservation, TableAssignment) -> Result
```

Rules:

- Operation names must be identifiers.
- Inputs are a comma-separated list of type names.
- Output must be an identifier.

## Expectations

Expectations define behavior that later verification can check.

```txt
expectation createReservation_success
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

This strictness is intentional. The current goal is to keep `.scl` small, explicit, and easy to validate.
