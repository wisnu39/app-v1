# database/factories/

Test data factories — for development and testing use only.

## Planned Factories (future phases)

- `user.factory.ts`      — generate random users per role
- `tenant.factory.ts`    — generate test tenants
- `customer.factory.ts`  — generate test customers (Phase 4)
- `item.factory.ts`      — generate inventory items (Phase 5)
- `rental.factory.ts`    — generate rental orders (Phase 7)

## Usage Convention

Factories are standalone scripts — not imported into seeders.
Run independently for dev/test data population.

NEVER run factories against production database.
