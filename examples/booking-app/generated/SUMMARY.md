# BookingApp

Manage restaurant reservations with a simple operational dashboard

## Entities
- Reservation: id:UUID, customerName:string, date:string, partySize:number, status:string
- TableAssignment: id:UUID, reservationId:UUID, tableLabel:string, assignedBy:string

## Operations
- createReservation(Reservation) -> Reservation
- assignTable(Reservation, TableAssignment) -> Result

## Expectations
- createReservation_success: operation=createReservation, assertions=2
- createReservation_requires_auth: operation=createReservation, assertions=1

## Constraints
- auth_required: true
- audited: true
- p95_latency_ms: 200

## Target
- runtime: generic
- database: postgres
