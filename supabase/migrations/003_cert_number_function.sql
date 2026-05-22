-- Sequence for cert number generation
create sequence if not exists public.cert_number_seq
  start with 1
  increment by 1
  no maxvalue
  no cycle;

-- Function: next cert number in format MV{YYYY}{8-digit-zero-padded}
create or replace function public.generate_cert_number()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  next_val bigint;
  current_year text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  current_year := to_char(now(), 'YYYY');
  next_val := nextval('public.cert_number_seq');

  return 'MV' || current_year || lpad(next_val::text, 8, '0');
end;
$$;

revoke all on function public.generate_cert_number() from public;
grant execute on function public.generate_cert_number() to authenticated;
