import unittest

from search_text import escape_like


class EscapeLikeTest(unittest.TestCase):
    def test_plain_text_is_unchanged(self):
        self.assertEqual(escape_like("Bern"), "Bern")

    def test_percent_matches_only_a_percent_sign(self):
        self.assertEqual(escape_like("%"), r"\%")

    def test_underscore_matches_only_an_underscore(self):
        self.assertEqual(escape_like("a_b"), r"a\_b")

    def test_backslash_is_escaped_first(self):
        self.assertEqual(escape_like(r"\%"), r"\\\%")


if __name__ == "__main__":
    unittest.main()
