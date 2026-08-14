# Drizzle ORM Integration

This project uses Drizzle ORM with SQLite for type-safe database operations, following the atidone repository structure.

## Quick Start

1. **Initialize the database:**

   ```bash
   pnpm db:push
   ```

2. **Seed with sample data:**

   ```bash
   pnpm db:seed
   ```

3. **Open Drizzle Studio (Database GUI):**
   ```bash
   pnpm db:studio
   ```

## Available Scripts

### Database Management

- `pnpm db:generate` - Generate migrations from schema changes
- `pnpm db:migrate` - Run pending migrations
- `pnpm db:push` - Push schema changes directly to database (development)
- `pnpm db:studio` - Open Drizzle Studio web interface
- `pnpm db:drop` - Drop database tables
- `pnpm db:check` - Check for schema drift
- `pnpm db:up` - Apply migrations
- `pnpm db:seed` - Seed database with sample data
- `pnpm db:reset` - Reset database (delete + push + seed)

## Database Schema

The schema is defined in `server/db/schema.ts`. Main tables:

- **users** / **user_profiles** — accounts with role (`user`, `moderator`, `admin`), email verification, and profile data
- **user_tokens** — email verification and password-reset tokens
- **posts** / **post_categories** / **post_tags** — blog posts with JSON-translated `title`, `slug`, `content`, and `shortDescription` per locale, plus many-to-many categories and tags
- **categories** / **tags** — with localized names and slugs
- **media** / **media_folders** — media library with folders, generated thumbnails (`parent_id` self-reference), and `public`/`private` privacy
- **media_usage** — tracks where media is used (profile, posts, ...)
- **user_permissions** — per-feature access control (`create`, `read`, `update`, `delete`)

## Usage Examples

### In Server API Routes

```typescript
// server/api/users/index.get.ts
import { db, schema } from "../../db";

export default defineEventHandler(async () => {
  const allUsers = await db.select().from(schema.users);
  return allUsers;
});
```

### With Validation

```typescript
// server/api/users/index.post.ts
import { z } from "zod";
import { db, schema } from "../../db";

const BodySchema = z.object({
  name: z.string().min(1).max(100),
  email: z.email(),
});

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { name, email } = BodySchema.parse(body);

  const newUser = await db
    .insert(schema.users)
    .values({
      name,
      email,
      createdAt: new Date(),
    })
    .returning();

  return newUser[0];
});
```

### With Relations

```typescript
// server/api/posts/index.get.ts
import { db, schema } from "../../db";
import { eq } from "drizzle-orm";

export default defineEventHandler(async () => {
  const posts = await db
    .select({
      id: schema.posts.id,
      title: schema.posts.title,
      content: schema.posts.content,
      author: {
        name: schema.users.name,
        email: schema.users.email,
      },
    })
    .from(schema.posts)
    .leftJoin(schema.users, eq(schema.posts.userId, schema.users.id));

  return posts;
});
```

## Adding New Tables

1. **Define schema in `server/db/schema.ts`:**

   ```typescript
   export const newTable = sqliteTable("new_table", {
     id: integer("id").primaryKey(),
     name: text("name").notNull(),
     createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
   });
   ```

2. **Generate migration:**

   ```bash
   pnpm db:generate
   ```

3. **Apply migration:**
   ```bash
   pnpm db:migrate
   ```

## Development Workflow

1. **For schema changes during development:**

   ```bash
   pnpm db:push  # Pushes schema changes directly
   ```

2. **For production-ready changes:**
   ```bash
   pnpm db:generate  # Generate migration
   pnpm db:migrate   # Apply migration
   ```

## File Structure

```
server/
├── db/
│   ├── index.ts            # Database connection & exports
│   ├── schema.ts           # Table definitions
│   ├── seed.ts             # Seed data script
│   └── migrations/         # Generated migration files
└── api/                    # API routes that import from server/db
app/types/
└── db.ts                  # TypeScript type exports (derived from schema)
database.db                # SQLite database file (root)
drizzle.config.ts          # Drizzle configuration
```

## Configuration

The database configuration is in `drizzle.config.ts`. Current setup:

> **Note:** when `NODE_ENV=test` the config will point to `database.test.db`
> so your test suite uses an isolated SQLite file and won't overwrite the
> primary database.

- **Database:** SQLite (`./database.db`) - located in project root
- **Schema:** `./server/db/schema.ts`
- **Migrations:** `./server/db/migrations`

## Key Differences from Other Patterns

This setup follows the **atidone repository structure**:

- Server-side only database access (no client-side plugins/composables)
- Direct imports from `server/db` in API routes
- Clean schema definitions without mixed validation logic
- Simplified table structure with straightforward field types
- Direct data returns (no wrapper objects with success/data)

## Production Notes

- For production, consider using PostgreSQL or MySQL
- Update `drizzle.config.ts` for production database
- Use proper environment variables for database credentials
- Always use migrations (`db:migrate`) instead of `db:push` in production
