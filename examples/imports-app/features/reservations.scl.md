# Reservations

```specra
entity Reservation:
id: UUID
customerName: string
date: string
partySize: number
status: string
end

entity TableAssignment:
id: UUID
reservationId: UUID
tableLabel: string
assignedBy: string
end

operation createReservation:
input: Reservation
output: Reservation
end

operation assignTable:
input: Reservation, TableAssignment
output: Result
end

expectation createReservation_success:
operation: createReservation
auth: valid
input customerName: "Ana"
input date: "2026-06-01T20:00:00Z"
input partySize: 4
expect outcome: success
expect output.status: "pending"
end

expectation createReservation_requires_auth:
operation: createReservation
auth: missing
input customerName: "Ana"
input date: "2026-06-01T20:00:00Z"
input partySize: 4
expect outcome: unauthorized
end
```
