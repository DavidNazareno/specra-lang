Service: BookingApp
Goal: Manage restaurant reservations with a simple operational dashboard

Rules for the implementing agent:
- Treat the .scl file as the source of truth.
- Implement every declared operation.
- Respect every constraint before optimizing for style.
- Ensure code behavior can satisfy every expectation.

Entities:
- Reservation: id:UUID, customerName:string, date:string, partySize:number, status:string
- TableAssignment: id:UUID, reservationId:UUID, tableLabel:string, assignedBy:string

Operations:
- createReservation(Reservation) -> Reservation
- assignTable(Reservation, TableAssignment) -> Result

Expectations:
- createReservation_success: operation=createReservation, auth=valid, assertions=outcome=success; output.status=pending
- createReservation_requires_auth: operation=createReservation, auth=missing, assertions=outcome=unauthorized

Constraints:
- auth_required: true
- audited: true
- p95_latency_ms: 200
