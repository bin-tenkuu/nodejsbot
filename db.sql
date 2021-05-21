-- COCShortKey
create table COCShortKey (
  key varchar(5) not null
    constraint COCShortKey_pk
      primary key,
  value varchar(10) not null
);
-- Members
create table Members (
  id integer(11) not null
    constraint id
      primary key,
  name varchar(7) default null,
  exp integer default 0,
  time integer(14) default 0,
  baned integer(1) default 0
);
-- PixivBan
create table PixivBan (
  id integer(10) not null
    constraint id
      primary key
);
-- pokeGroup
create table pokeGroup (
  id integer
    constraint pokeGroup_pk
      primary key autoincrement,
  text varchar(255) not null
);

create unique index pokeGroup_id_uindex
  on pokeGroup (id);