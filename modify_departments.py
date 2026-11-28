#!/usr/bin/env python3
"""List, add or remove a department (Fachbereich) in the code and in the database.

  python modify_departments.py --list
  python modify_departments.py --delete fb-logistik
  python modify_departments.py --add fb-neu --ger "FB Neu" --eng "DP New" --fra "DP Nouveau"

Removing a department that journal entries still use changes nothing: the script lists those entries.
The database must be running (./zskarte.sh start). The database is changed through docker.
At the end the script asks whether to run ./zskarte.sh restart -b, because the app and the server
are built from these files.
"""

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent
SCHEMA = REPO / "zskarte/packages/server/src/api/journal-entry/content-types/journal-entry/schema.json"
TYPES = REPO / "zskarte/packages/app/src/app/journal/journal.types.ts"
TRANSLATIONS = REPO / "zskarte/packages/app/src/app/state/translations/journal.translations.ts"
GENERATED = REPO / "zskarte/packages/server/types/generated/contentTypes.d.ts"

CONTAINER = "postgresql-zskarte"
DB_USER = "postgres"
DB_NAME = "zskarte"
STORE_KEY = "strapi_content_types_schema"
ENUM_PATH = ["api::journal-entry.journal-entry", "attributes", "department", "enum"]

NAME_RE = re.compile(r"[a-z][a-z0-9-]*")
FORBIDDEN_LABEL_CHARS = re.compile(r"['\\\r\n]")
LANGUAGES = ("de", "en", "fr")

TYPES_LIST = re.compile(r"(export const DepartmentValues = \[\n)(.*?)(\] as const;)", re.S)
GENERATED_LIST = re.compile(r"(department: Schema\.Attribute\.Enumeration<\n      \[\n)(.*?)(      \]\n)", re.S)


class ScriptError(Exception):
    """A problem the user can fix; the script prints it and changes nothing."""


class DatabaseError(ScriptError):
    pass


def read_text(path: Path) -> str:
    with open(path, encoding="utf-8") as file:
        return file.read()


def write_text(path: Path, text: str) -> None:
    with open(path, "w", encoding="utf-8", newline="\n") as file:
        file.write(text)


def read_departments() -> list[str]:
    return json.loads(read_text(SCHEMA))["attributes"]["department"]["enum"]


def block_pattern(name: str) -> re.Pattern:
    """Matches the label block of one department, from its key line to its closing line."""
    return re.compile(rf"^  (?:'{re.escape(name)}'|{re.escape(name)}): \{{\n.*?^  \}},\n", re.M | re.S)


def read_labels(translations: str, name: str) -> dict[str, str]:
    match = block_pattern(name).search(translations)
    if match is None:
        return {}
    return dict(re.findall(r"^    (de|en|fr): '([^']*)',$", match.group(0), re.M))


def label_block(name: str, labels: dict[str, str]) -> str:
    lines = [f"  '{name}': {{"]
    lines += [f"    {language}: '{labels[language]}'," for language in LANGUAGES]
    lines.append("  },")
    return "".join(f"{line}\n" for line in lines)


def translations_without(translations: str, name: str) -> str:
    return block_pattern(name).sub("", translations, count=1)


def translations_with(translations: str, name: str, labels: dict[str, str], after: str) -> str:
    match = block_pattern(after).search(translations)
    if match is None:
        raise ScriptError(f"no label block for {after} in {TRANSLATIONS.name}")
    return translations[: match.end()] + label_block(name, labels) + translations[match.end() :]


def schema_with(schema_text: str, departments: list[str]) -> str:
    schema = json.loads(schema_text)
    schema["attributes"]["department"]["enum"] = departments
    return json.dumps(schema, indent=2, ensure_ascii=False) + "\n"


def types_with(types_text: str, departments: list[str]) -> str:
    items = "".join(f"  '{name}',\n" for name in departments)
    return TYPES_LIST.sub(lambda match: match.group(1) + items + match.group(3), types_text, count=1)


def generated_with(generated_text: str, departments: list[str]) -> str:
    items = "".join(f"        '{name}',\n" for name in departments)
    return GENERATED_LIST.sub(lambda match: match.group(1) + items + match.group(3), generated_text, count=1)


def run_sql(sql: str, variables: dict[str, str]) -> list[list[str]]:
    """Runs SQL in the database container. Values go in as psql variables, never into the SQL text."""
    command = ["docker", "exec", "-i", CONTAINER, "psql", "-U", DB_USER, "-d", DB_NAME,
               "-v", "ON_ERROR_STOP=1", "-At", "-F", "\t"]
    for key, value in variables.items():
        command += ["-v", f"{key}={value}"]
    try:
        result = subprocess.run(command, input=sql, capture_output=True, text=True, encoding="utf-8", check=False)
    except FileNotFoundError as error:
        raise DatabaseError("docker is not installed or not on the PATH") from error
    if result.returncode != 0:
        raise DatabaseError(result.stderr.strip())
    return [line.split("\t") for line in result.stdout.splitlines() if line]


def require_database() -> None:
    try:
        run_sql("select 1;", {})
    except DatabaseError as error:
        raise DatabaseError(f"database not reachable ({error}). Start the stack first: ./zskarte.sh start") from error


def find_affected_entries(department: str) -> list[list[str]]:
    sql = (
        "select document_id, message_number, sender, message_subject from journal_entries "
        "where department = :'department' order by message_number;"
    )
    return run_sql(sql, {"department": department})


def update_stored_schema(departments: list[str]) -> None:
    """Strapi keeps a copy of the content type schema in the database. It is updated here to match the code."""
    path = "ARRAY[" + ",".join(f"'{part}'" for part in ENUM_PATH) + "]"
    sql = (
        f"update strapi_core_store_settings set value = jsonb_set(value::jsonb, {path}, :'enum_json'::jsonb)::text "
        "where key = :'store_key' returning id;"
    )
    rows = run_sql(sql, {"enum_json": json.dumps(departments), "store_key": STORE_KEY})
    if len(rows) != 1:
        raise DatabaseError(f"stored schema row '{STORE_KEY}' not found ({len(rows)} rows updated)")


def print_affected(department: str, rows: list[list[str]]) -> None:
    print(f"{department} is still used by {len(rows)} journal entries. Nothing was changed.")
    print("document_id\tmessage_number\tsender\tmessage_subject")
    for row in rows:
        print("\t".join(row))
    print("Move these entries to another department first, then run the script again.")


def show_list() -> None:
    translations = read_text(TRANSLATIONS)
    for name in read_departments():
        labels = read_labels(translations, name)
        print(f"{name:<30} {labels.get('de', '?')}: {labels.get('en', '?')}, {labels.get('fr', '?')}")


def apply_changes(departments: list[str], translations: str) -> None:
    update_stored_schema(departments)
    write_text(SCHEMA, schema_with(read_text(SCHEMA), departments))
    write_text(TYPES, types_with(read_text(TYPES), departments))
    write_text(TRANSLATIONS, translations)
    write_text(GENERATED, generated_with(read_text(GENERATED), departments))
    print(f"Changed {SCHEMA.name}, {TYPES.name}, {TRANSLATIONS.name}, {GENERATED.name} and the database.")


def delete_department(name: str) -> int:
    departments = read_departments()
    if name not in departments:
        raise ScriptError(f"{name} is not a department")
    require_database()
    affected = find_affected_entries(name)
    if affected:
        print_affected(name, affected)
        return 1
    remaining = [department for department in departments if department != name]
    apply_changes(remaining, translations_without(read_text(TRANSLATIONS), name))
    return 0


def validate_new_department(name: str, labels: dict[str, str]) -> None:
    if not NAME_RE.fullmatch(name):
        raise ScriptError("the name must start with a letter and use only lowercase letters, digits and hyphens")
    for language, text in labels.items():
        if not text.strip():
            raise ScriptError(f"the {language} label is empty")
        if FORBIDDEN_LABEL_CHARS.search(text):
            raise ScriptError(f"the {language} label may not contain ' or \\ or line breaks")


def add_department(name: str, labels: dict[str, str]) -> int:
    validate_new_department(name, labels)
    departments = read_departments()
    if name in departments:
        raise ScriptError(f"{name} already exists")
    require_database()
    translations = translations_with(read_text(TRANSLATIONS), name, labels, after=departments[-1])
    apply_changes(departments + [name], translations)
    return 0


def ask_restart() -> None:
    try:
        answer = input("Run ./zskarte.sh restart -b now? [Y/n] ")
    except EOFError:
        answer = "n"
    if answer.strip().lower() in ("", "y", "yes"):
        subprocess.run(["bash", "zskarte.sh", "restart", "-b"], cwd=REPO, check=False)
    else:
        print("Not restarted. Run ./zskarte.sh restart -b to apply the change.")


def parse_args(argv: list[str] | None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="List, add or remove a department (Fachbereich).")
    parser.add_argument("--list", action="store_true", help="show every department with its labels")
    parser.add_argument("--delete", metavar="NAME", help="remove a department")
    parser.add_argument("--add", metavar="NAME", help="add a department")
    parser.add_argument("--ger", help="German label (with --add)")
    parser.add_argument("--eng", help="English label (with --add)")
    parser.add_argument("--fra", help="French label (with --add)")
    args = parser.parse_args(argv)
    if [args.list, args.delete is not None, args.add is not None].count(True) != 1:
        parser.error("use exactly one of --list, --delete, --add")
    if args.add is None and any([args.ger, args.eng, args.fra]):
        parser.error("the labels are only used with --add")
    if args.add is not None and not all([args.ger, args.eng, args.fra]):
        parser.error("--add needs --ger, --eng and --fra")
    return args


def run(args: argparse.Namespace) -> int:
    if args.list:
        show_list()
        return 0
    if args.delete is not None:
        return delete_department(args.delete)
    labels = {"de": args.ger, "en": args.eng, "fr": args.fra}
    return add_department(args.add, labels)


def main(argv: list[str] | None = None) -> int:
    sys.stdout.reconfigure(encoding="utf-8")
    args = parse_args(argv)
    try:
        status = run(args)
    except ScriptError as error:
        print(f"Error: {error}", file=sys.stderr)
        return 1
    if status == 0 and not args.list:
        ask_restart()
    return status


if __name__ == "__main__":
    sys.exit(main())
