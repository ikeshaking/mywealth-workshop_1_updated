-- ===========================================================================
-- Mabel — seed data for a live Supabase project (optional).
--
-- Demo mode does NOT need this file — it seeds the browser store instead.
-- Use this only when running against a real Supabase project and you want a
-- pre-populated demo account.
--
-- Prerequisites: create an auth user first (via the Supabase dashboard or API)
-- and replace :demo_user below with that user's UUID, e.g. in psql:
--   \set demo_user '00000000-0000-0000-0000-000000000000'
-- Dates use CURRENT_DATE offsets so the demo always looks current.
-- ===========================================================================

insert into user_preferences (user_id, preferred_name, household_type, focus_areas,
  notification_preference, proactive_suggestions, permission_level, currency, onboarded)
values (:'demo_user', 'Alex', 'family', array['bill','renewal','subscription','family']::category[],
  'important', true, 'approve', 'GBP', true)
on conflict (user_id) do nothing;

insert into life_items (user_id, title, original_input, summary, category, status, priority,
  due_date, context, recommended_action, approval_required, confidence_score, inferred)
values
  (:'demo_user', 'Car registration', 'I need to sort my car rego soon.',
   'Renew your Toyota RAV4 registration before it lapses.', 'renewal', 'needs_attention', 'high',
   current_date + 12, 'Toyota RAV4 · Plate 1ABC23 · Service NSW',
   'Confirm the amount and prepare the renewal.', true, 0.82,
   '{"due_date":true,"priority":true}'::jsonb),

  (:'demo_user', 'Electricity bill', 'Electricity bill £89.99 due tomorrow',
   'Your electricity bill is due tomorrow.', 'bill', 'scheduled', 'high',
   current_date + 1, '£89.99 with Sparked Energy', 'Pay before the due date.', false, 0.95, '{}'::jsonb),

  (:'demo_user', 'Cancel gym membership', 'I keep paying for a gym membership I do not use.',
   'You haven''t used this in 45 days. Cancellation prepared.', 'subscription', 'ready_for_approval', 'medium',
   null, '£29.95/month · renews in 4 days', 'Approve the cancellation.', true, 0.88, '{}'::jsonb),

  (:'demo_user', 'Book the kids'' dentist', 'I need to book the kids into the dentist.',
   'Needs to know who and when before proposing times.', 'family', 'needs_information', 'medium',
   null, null, 'Tell Mabel which children and preferred timing.', true, 0.7, '{}'::jsonb),

  (:'demo_user', 'Council rates', 'Council rates due soon',
   'Quarterly council rates payment.', 'bill', 'scheduled', 'medium',
   current_date + 9, '£1,234.00 · quarterly', 'Set aside funds.', false, 0.92, '{}'::jsonb),

  (:'demo_user', 'Organise travel insurance', 'I should probably organise travel insurance.',
   'Want Mabel to find options?', 'travel', 'captured', 'low',
   null, null, 'Share your trip dates.', false, 0.6, '{"priority":true}'::jsonb),

  (:'demo_user', 'School permission form', 'Sign and return the school trip permission form',
   'Sign and return before the deadline.', 'document', 'needs_attention', 'high',
   current_date + 2, 'Year 3 museum trip', 'Sign the form.', false, 0.85, '{}'::jsonb);
