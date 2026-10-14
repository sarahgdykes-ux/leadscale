update public.leads
set lead = lead - 'email' - 'phone' - 'rawSourceData',
    raw_source_data = '{}'::jsonb;