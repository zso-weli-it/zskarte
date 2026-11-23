import math
from dataclasses import dataclass
from typing import Callable
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from psycopg_pool import AsyncConnectionPool
from contextlib import asynccontextmanager
import os

from search_text import escape_like

pool = AsyncConnectionPool(
  "host=offlinekarte-search-db "
  f"port={os.environ.get('SEARCH_DB_PORT', 5432)} "
  f"user={os.environ.get('SEARCH_DB_USER', 'postgres')} "
  f"password={os.environ.get('SEARCH_DB_PASSWORD', 'postgres')} "
  , open=False
  , check=AsyncConnectionPool.check_connection)

SORT_ORIGIN_E = os.environ.get('SEARCH_SORT_ORIGIN_E', '8.30882407298')
SORT_ORIGIN_N = os.environ.get('SEARCH_SORT_ORIGIN_N', '47.3038127715')

@asynccontextmanager
async def lifespan(instance: FastAPI):
    await pool.open()
    yield
    await pool.close()

app = FastAPI(lifespan=lifespan)

app.add_middleware(CORSMiddleware, 
        allow_origins = ["*"],
        allow_credentials=False, allow_methods=['*'], allow_headers=['*'])

class QueryBuilder:
    def __init__(self, columns, table):
        self.query = f"select {columns} from {table} "
        self.args = ()
        self.conds = []
        self.order = ""
        self.limit = 50

    def _finish(self):
        self.query += "where " + " and ".join(self.conds) + " "
        self.query += self.order
        self.query += f"limit {self.limit};"
        return self.query, self.args

    def _extendArgs(self, *a):
        self.args = (*self.args, *a)

    def nameCheck(self, col, text):
        self.conds += [f"{col} like lower(%s || '%%')"]
        self._extendArgs(escape_like(text))
        return self

    def orderBy(self, col, bbox, sortbbox):
        if sortbbox and bbox is not None:
            self.order = (f"order by {col} <-> "
                           "ST_Transform(ST_Centroid("
                             "ST_MakeEnvelope(%s,%s,%s,%s,21781)), 4326) ")
            self._extendArgs(*bbox)
        else:
            self.order = (f"order by {col} <-> "
                          f"ST_Point({SORT_ORIGIN_E}, {SORT_ORIGIN_N}, 4326) ")
        return self

    def bbox(self, here, bbox):
        if bbox is None:
            return self
        self.conds += [f"ST_Within({here},"
                        "ST_Transform(ST_MakeEnvelope(%s,%s,%s,%s,21781), 4326))"]
        self._extendArgs(*bbox)
        return self

    def limitBy(self, limit):
        self.limit = limit
        return self

    async def execOn(self, curs):
        query, args = self._finish()
        await curs.execute(query, args)

POINT_ORT = "ST_Point(E :: double precision, N :: double precision, 4326)"
POINT_WGS84 = "wgs_point"

@dataclass(frozen=True)
class Source:
    """One searchable table: the query columns, how the name is matched, and how a row is labelled.
    The last two columns of every row are the longitude and latitude."""
    table: str
    columns: str
    name_column: str
    point: str
    label: Callable[[tuple], str]
    text: Callable[[str], str] = lambda text: text
    applies: Callable[[str], bool] = lambda text: True

# order matters: earlier sources fill the result list first
SOURCES = [
    Source("import.ortschaften", "ortschaftsname, PLZ, E, N", "PLZ", POINT_ORT,
           lambda r: f"<i>Ort</i> <b>{r[1]} {r[0]}</b>", applies=lambda text: text.isdigit()),
    Source("import.ortschaften", "ortschaftsname, PLZ, E, N", "lower(ortschaftsname)", POINT_ORT,
           lambda r: f"<i>Ort</i> <b>{r[1]} {r[0]}</b>"),
    Source("import.strassen", "STN_LABEL, ZIP_LABEL, ST_x(wgs_point), ST_y(wgs_point)", "full_str_lower", POINT_WGS84,
           lambda r: f"<i>Str</i> <b>{r[0]}</b>, {r[1]}", text=lambda text: text.replace(',', '')),
    Source("import.namen", "NAME, OBJEKTART, closest_town, closest_town_plz, ST_x(wgs_point), ST_y(wgs_point)",
           "full_name_lower", POINT_WGS84,
           lambda r: f"<i>{r[1]}</i> <b>{r[0]}</b>, <i>Nähe</i> {r[3]} {r[2]}", text=lambda text: text.replace(',', '')),
    Source("import.adressen", "STN_LABEL, ADR_NUMBER, ZIP_LABEL, ST_x(wgs_point), ST_y(wgs_point)",
           "full_addr_lower", POINT_WGS84,
           lambda r: f"<i>Adr</i> <b> {r[0]} {r[1]}</b>, {r[2]}", text=lambda text: text.replace(',', '')),
]

async def search_source(curs, source: Source, text, bbox, sortbbox, limit):
    if not source.applies(text):
        return []
    await (
      QueryBuilder(source.columns, source.table)
        .nameCheck(source.name_column, source.text(text))
        .bbox(source.point, bbox)
        .orderBy(source.point, bbox, sortbbox)
        .limitBy(limit)
        .execOn(curs)
    )
    return [attrdict(source.label(row), row[-2], row[-1]) for row in await curs.fetchall()]

def attrdict(label, lon, lat):
    return {"attrs" : {"label": label, "lon": lon, "lat": lat}}

@app.get("/search/")
async def func(type: str = "",
      searchText: str = "",
      bbox: str = None,
      sortbbox: bool = False,
      limit: int = 50):
    if bbox is not None:
        # only four finite numbers are allowed; anything else is ignored instead of failing in SQL
        try:
            bbox = [float(v) for v in bbox.split(',')]
            if len(bbox) != 4 or not all(math.isfinite(v) for v in bbox):
                raise ValueError("bbox needs four finite numbers")
        except ValueError:
            print("invalid bbox, ignored")
            bbox = None
            sortbbox = False
    limit = max(1, min(limit, 100))
    searchText = searchText.strip();
    if type != "locations" or len(searchText) < 2: return {"results": {}}
    async with pool.connection() as conn:
        async with conn.cursor() as curs:
            results = []
            for source in SOURCES:
                if len(results) >= limit:
                    break
                results += await search_source(curs, source, searchText, bbox, sortbbox, limit - len(results))
            return {"results": results}
    
