# Group Ordering Feature Setup

This feature enables drag-and-drop reordering of groups in the Backlog view with persistence across sessions.

## Database Setup

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard
2. Navigate to the **SQL Editor**
3. Click **New Query**
4. Copy and paste the following SQL:

```sql
-- Create user_group_orders table
CREATE TABLE user_group_orders (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  group_orders jsonb DEFAULT '{}'::jsonb,
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE user_group_orders ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Users can manage their own group orders"
  ON user_group_orders
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

5. Click **Run**

### Option 2: Using Supabase CLI

Run this command in your project directory:

```bash
supabase migration new create_user_group_orders_table
```

Then paste the SQL from Option 1 into the created migration file and run:

```bash
supabase db push
```

## How It Works

- Group order is stored as a JSONB object: `{ "backlog": ["Group1", "Group2", ...] }`
- Drag group headers in the Backlog view to reorder them
- The order persists across browser sessions
- Ungrouped todos remain available but can be reordered alongside other groups

## Features

- **Drag & Drop Groups**: Grab the drag handle on group headers to reorder
- **Persistence**: Order is saved automatically to the database
- **Automatic**: New groups are added to the order list as they're created
- **Works per category**: Currently supports backlog; can be extended to other views

## Troubleshooting

If you see an error like "user_group_orders table does not exist":

1. Make sure you've created the table in your Supabase database
2. Run the SQL setup from Option 1 or Option 2 above
3. Refresh your app

If group ordering isn't persisting:

1. Check your browser's console for error messages
2. Verify the table exists in Supabase
3. Check that RLS policies are correctly configured
4. Ensure your user is authenticated
