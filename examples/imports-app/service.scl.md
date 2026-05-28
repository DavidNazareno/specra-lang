# Imports Booking App

This root contract file carries shared intent and imports the reservation feature slice.

```specra
import "./features/reservations.scl.md"

service ImportsBookingApp
goal: Manage reservations with a contract split by feature files

constraint auth_required: true
constraint audited: true

target runtime: generic
target database: postgres
```
