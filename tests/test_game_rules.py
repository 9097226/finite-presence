import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class GameRulesTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data = json.loads((ROOT / "config" / "game_rules.json").read_text(encoding="utf-8"))

    def test_daily_presence_is_fixed_at_45_minutes(self):
        self.assertEqual(self.data["presence"]["daily_minutes"], 45)

    def test_presence_time_does_not_accumulate(self):
        self.assertFalse(self.data["presence"]["banking_enabled"])

    def test_commons_is_always_public(self):
        self.assertTrue(self.data["space"]["commons_always_public"])

    def test_no_forced_disconnect(self):
        self.assertFalse(self.data["presence"]["force_disconnect"])
        self.assertTrue(self.data["presence"]["rest_mode_enabled"])

    def test_no_daily_pressure_rewards(self):
        self.assertFalse(self.data["social"]["daily_login_rewards"])
        self.assertFalse(self.data["social"]["streak_rewards"])

    def test_permissions_are_safe_by_default(self):
        self.assertTrue(self.data["space"]["fail_closed"])
        self.assertTrue(self.data["governance"]["permissions_revocable"])
        self.assertFalse(self.data["governance"]["public_access_unlimited_mutation"])


if __name__ == "__main__":
    unittest.main()
