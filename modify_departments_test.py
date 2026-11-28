import unittest

import modify_departments as md

TRANSLATIONS_SAMPLE = """export const translations = {
  stabschef: {
    de: 'Stabschef',
    en: 'Chief staff',
    fr: 'Chef du personnel',
  },
  'fb-lage': {
    de: 'FB Lage',
    en: 'DP Location',
    fr: 'DP localisation',
  },
};
"""

TYPES_SAMPLE = """export const DepartmentValues = [
  'stabschef',
  'fb-lage',
] as const;
export type Department = (typeof DepartmentValues)[number] | null;
"""

GENERATED_SAMPLE = """    department: Schema.Attribute.Enumeration<
      [
        'stabschef',
        'fb-lage',
      ]
    >;
    entryStatus: Schema.Attribute.Enumeration<
"""


class ReadTest(unittest.TestCase):
    def test_labels_are_read_per_department(self):
        self.assertEqual(
            md.read_labels(TRANSLATIONS_SAMPLE, "fb-lage"),
            {"de": "FB Lage", "en": "DP Location", "fr": "DP localisation"},
        )

    def test_unknown_department_has_no_labels(self):
        self.assertEqual(md.read_labels(TRANSLATIONS_SAMPLE, "fb-nope"), {})


class TranslationsTest(unittest.TestCase):
    def test_removing_a_department_removes_only_its_block(self):
        result = md.translations_without(TRANSLATIONS_SAMPLE, "fb-lage")
        self.assertNotIn("fb-lage", result)
        self.assertIn("stabschef: {", result)

    def test_added_block_goes_after_the_given_department(self):
        labels = {"de": "FB Neu", "en": "DP New", "fr": "DP Nouveau"}
        result = md.translations_with(TRANSLATIONS_SAMPLE, "fb-neu", labels, after="fb-lage")
        self.assertTrue(result.index("'fb-neu': {") > result.index("'fb-lage': {"))
        self.assertEqual(md.read_labels(result, "fb-neu"), labels)
        self.assertEqual(result.count("  },\n"), TRANSLATIONS_SAMPLE.count("  },\n") + 1)


class ListsTest(unittest.TestCase):
    def test_types_list_is_replaced(self):
        result = md.types_with(TYPES_SAMPLE, ["stabschef", "fb-neu"])
        self.assertIn("  'stabschef',\n  'fb-neu',\n] as const;", result)
        self.assertNotIn("'fb-lage'", result)

    def test_generated_list_is_replaced(self):
        result = md.generated_with(GENERATED_SAMPLE, ["fb-neu"])
        self.assertIn("        'fb-neu',\n      ]\n    >;", result)
        self.assertIn("entryStatus", result)

    def test_schema_keeps_the_other_attributes(self):
        schema = '{\n  "attributes": {\n    "department": {\n      "type": "enumeration",\n      "enum": ["a"]\n    },\n    "isKeyMessage": {\n      "type": "boolean"\n    }\n  }\n}\n'
        result = md.schema_with(schema, ["a", "b"])
        self.assertIn('"enum": [\n        "a",\n        "b"\n      ]', result)
        self.assertIn('"isKeyMessage"', result)


class ValidationTest(unittest.TestCase):
    labels = {"de": "FB Neu", "en": "DP New", "fr": "DP Nouveau"}

    def test_valid_name_and_labels_pass(self):
        md.validate_new_department("fb-neu", self.labels)

    def test_name_must_start_with_a_letter_and_use_safe_characters(self):
        for name in ["", "1fb", "FB-neu", "fb neu", "fb_neu", "fb'neu"]:
            with self.subTest(name=name), self.assertRaises(md.ScriptError):
                md.validate_new_department(name, self.labels)

    def test_label_with_quote_is_refused(self):
        with self.assertRaises(md.ScriptError):
            md.validate_new_department("fb-neu", {**self.labels, "en": "Dad's"})

    def test_empty_label_is_refused(self):
        with self.assertRaises(md.ScriptError):
            md.validate_new_department("fb-neu", {**self.labels, "fr": "  "})


class StoredRowTest(unittest.TestCase):
    def test_one_row_gives_its_id(self):
        self.assertEqual(md.single_row_id([["7"]]), "7")

    def test_two_rows_are_refused(self):
        with self.assertRaises(md.DatabaseError):
            md.single_row_id([["7"], ["8"]])

    def test_no_row_is_refused(self):
        with self.assertRaises(md.DatabaseError):
            md.single_row_id([])


class ArgumentsTest(unittest.TestCase):
    def test_add_needs_all_three_labels(self):
        with self.assertRaises(SystemExit):
            md.parse_args(["--add", "fb-neu", "--ger", "x"])

    def test_exactly_one_action(self):
        with self.assertRaises(SystemExit):
            md.parse_args(["--list", "--delete", "fb-lage"])

    def test_labels_without_add_are_refused(self):
        with self.assertRaises(SystemExit):
            md.parse_args(["--delete", "fb-lage", "--ger", "x"])


class RepoFilesTest(unittest.TestCase):
    """Writing the unchanged list back must not change the real files."""

    def test_schema_round_trip(self):
        text = md.read_text(md.SCHEMA)
        self.assertEqual(md.schema_with(text, md.read_departments()), text)

    def test_types_round_trip(self):
        text = md.read_text(md.TYPES)
        self.assertEqual(md.types_with(text, md.read_departments()), text)

    def test_generated_round_trip(self):
        text = md.read_text(md.GENERATED)
        self.assertEqual(md.generated_with(text, md.read_departments()), text)


if __name__ == "__main__":
    unittest.main()
