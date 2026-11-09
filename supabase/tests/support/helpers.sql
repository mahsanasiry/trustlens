create schema tests;
grant usage on schema tests to public;

create table tests.results (id serial primary key, passed boolean not null, label text not null);
grant all on tests.results to public;
grant all on sequence tests.results_id_seq to public;

create function tests.id(p_name text) returns uuid
language sql immutable as $$ select md5('trustlens-test-' || p_name)::uuid $$;

create function tests.record(p_passed boolean, p_label text) returns void
language plpgsql as $$
begin
  insert into tests.results (passed, label) values (p_passed, p_label);
end
$$;

create function tests.as_user(p_name text) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', tests.id(p_name)::text, true);
  set local role authenticated;
end
$$;

create function tests.as_anon() returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', '', true);
  set local role anon;
end
$$;

create function tests.as_service() returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', '', true);
  set local role service_role;
end
$$;

create function tests.reset() returns void
language plpgsql as $$
begin
  reset role;
  perform set_config('request.jwt.claim.sub', '', true);
end
$$;

create function tests.eq(p_actual anyelement, p_expected anyelement, p_label text) returns void
language plpgsql as $$
begin
  perform tests.record(
    p_actual is not distinct from p_expected,
    case when p_actual is not distinct from p_expected then p_label
      else p_label || ' (expected ' || coalesce(p_expected::text, 'null') || ', got ' || coalesce(p_actual::text, 'null') || ')' end
  );
end
$$;

create function tests.ok(p_condition boolean, p_label text) returns void
language plpgsql as $$
begin
  perform tests.record(coalesce(p_condition, false), p_label);
end
$$;

create function tests.throws(p_sql text, p_sqlstate text, p_label text) returns void
language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    perform tests.record(
      sqlstate = p_sqlstate,
      case when sqlstate = p_sqlstate then p_label
        else p_label || ' (expected ' || p_sqlstate || ', got ' || sqlstate || ': ' || sqlerrm || ')' end
    );
    return;
  end;
  perform tests.record(false, p_label || ' (nothing was raised)');
end
$$;

create function tests.affected(p_sql text) returns integer
language plpgsql as $$
declare
  v_rows integer;
begin
  execute p_sql;
  get diagnostics v_rows = row_count;
  return v_rows;
end
$$;

create function tests.finish() returns void
language plpgsql as $$
declare
  v_failed integer;
  v_total integer;
  r record;
begin
  select count(*) filter (where not passed), count(*) into v_failed, v_total from tests.results;
  for r in select label from tests.results where not passed order by id loop
    raise warning 'FAIL: %', r.label;
  end loop;
  raise notice '% of % checks passed', v_total - v_failed, v_total;
  if v_failed > 0 then
    raise exception '% check(s) failed', v_failed;
  end if;
end
$$;
