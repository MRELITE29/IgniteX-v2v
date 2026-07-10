# SafeSphere — Database Schema

SafeSphere uses Supabase (PostgreSQL). Every table lives in the `public` schema,
has **Row Level Security (RLS) enabled**, and is scoped to the signed-in user via
`auth.uid()`. Users can only ever read or write their own rows.

All tables reference the authenticated user through a `user_id` column that maps
to `auth.users.id` (Supabase's managed auth table).

---

## Tables

### `profiles`
Stores the user's personal information.

| Column       | Type        | Purpose                                  |
| ------------ | ----------- | ---------------------------------------- |
| `id`         | uuid (PK)   | Row identifier                           |
| `user_id`    | uuid        | Owner — references the auth user         |
| `full_name`  | text        | User's display name                      |
| `email`      | text        | Contact email                            |
| `phone`      | text        | Contact phone number                     |
| `address`    | text        | Home / saved address                     |
| `created_at` | timestamptz | Creation timestamp                       |

### `guardian_contacts`
The user's trusted guardians / emergency contacts.

| Column         | Type        | Purpose                                        |
| -------------- | ----------- | ---------------------------------------------- |
| `id`           | uuid (PK)   | Row identifier                                 |
| `user_id`      | uuid        | Owner — references the auth user               |
| `name`         | text        | Guardian's name                                |
| `relationship` | text        | Role / relationship (e.g. "Sister", "Friend")  |
| `phone`        | text        | Guardian's phone number                        |
| `priority`     | integer     | Notification order (lower = notified first)    |
| `created_at`   | timestamptz | Creation timestamp                             |

### `safety_sessions`
A Guardian Shield journey with its computed route intelligence.

| Column           | Type        | Purpose                                            |
| ---------------- | ----------- | -------------------------------------------------- |
| `id`             | uuid (PK)   | Row identifier                                     |
| `user_id`        | uuid        | Owner — references the auth user                   |
| `status`         | text        | `active` / `completed` / `escalated`               |
| `start_location` | text        | Journey origin                                     |
| `destination`    | text        | Journey destination                                |
| `safety_score`   | integer     | Computed 0–100 safety score                        |
| `risk_level`     | text        | `low` / `medium` / `high`                          |
| `explanation`    | text        | Human-readable reasoning for the score             |
| `started_at`     | timestamptz | Journey start time                                 |
| `ended_at`       | timestamptz | Journey end time (null while active)               |

### `incidents`
Records raised during escalation or emergencies.

| Column       | Type        | Purpose                                          |
| ------------ | ----------- | ------------------------------------------------ |
| `id`         | uuid (PK)   | Row identifier                                   |
| `user_id`    | uuid        | Owner — references the auth user                 |
| `session_id` | uuid        | Optional link to the `safety_sessions` row       |
| `risk_level` | text        | `low` / `medium` / `high`                        |
| `location`   | text        | Where the incident occurred                      |
| `status`     | text        | `open` / `resolved`                              |
| `created_at` | timestamptz | Creation timestamp                               |

### `threat_scans`
Results of the AI Threat Scanner.

| Column       | Type        | Purpose                                          |
| ------------ | ----------- | ------------------------------------------------ |
| `id`         | uuid (PK)   | Row identifier                                   |
| `user_id`    | uuid        | Owner — references the auth user                 |
| `message`    | text        | The analysed message                             |
| `risk_score` | integer     | AI risk score 0–100                              |
| `analysis`   | text        | Recommended action / summary                     |
| `created_at` | timestamptz | Creation timestamp                               |

---

## Relationships

- Every table → `auth.users` via `user_id` (one user has many rows).
- `incidents.session_id` → `safety_sessions.id` (an incident may belong to a session).

## Row Level Security

RLS is enabled on all tables. Each table has an owner policy of the form:

```sql
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id)
```

This guarantees a user can only `SELECT`, `INSERT`, `UPDATE`, and `DELETE` their
own rows for every table. The `authenticated` role is granted table privileges;
the `anon` role has no access (all data is user-scoped and private).