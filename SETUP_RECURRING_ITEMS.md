# Recurring Items Feature Setup

This feature enables automatic creation of recurring todo items based on a repeat interval.

## How It Works

1. When a todo item with "Repeat every X days" > 0 is marked as completed:
   - A new todo item is automatically created with the same properties
   - The new item's due date is set to: completion date + X days
   - A link is maintained between the parent and child items

2. When a recurring todo is marked as incomplete again:
   - The automatically created child item is deleted

## Database Setup

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard
2. Navigate to the **SQL Editor**
3. Click **New Query**
4. Copy and paste the following SQL:

```sql
-- Add recurring_parent_id column to todos table
ALTER TABLE todos 
ADD COLUMN recurring_parent_id uuid REFERENCES todos(id) ON DELETE SET NULL;

-- Create index for faster lookups of child recurring items
CREATE INDEX idx_todos_recurring_parent_id ON todos(recurring_parent_id);
```

5. Click **Run**

### Option 2: Using Supabase CLI

Run this command in your project directory:

```bash
supabase migration new add_recurring_parent_id
```

Then paste the SQL from Option 1 into the created migration file and run:

```bash
supabase db push
```

## Features

- **Automatic Creation**: Complete a recurring item and a new one is automatically scheduled
- **Smart Deletion**: Uncomplete an item and its generated recurrence is removed
- **Flexible Intervals**: Set any number of days for the repeat interval
- **Preserves Properties**: New items inherit all settings (priority, group, description, etc.)

## Usage

1. Create or edit a todo item
2. Set "Repeat every X days" to a number greater than 0
3. Mark the item as complete
4. A new item will be created with a due date X days from today
5. If you uncheck the completed item, the generated recurring item will be deleted

## Troubleshooting

If recurring items aren't being created:

1. Check browser console for errors
2. Verify the `recurring_parent_id` column exists in the todos table
3. Ensure you're setting a "Repeat every X days" value > 0
4. Make sure your user is authenticated
