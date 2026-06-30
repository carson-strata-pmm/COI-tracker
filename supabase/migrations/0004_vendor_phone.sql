-- Add contact_phone to vendors for SMS upload reminders.
alter table vendors add column if not exists contact_phone text;
