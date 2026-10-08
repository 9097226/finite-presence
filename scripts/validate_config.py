#!/usr/bin/env python3
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONFIG = ROOT / "config" / "game_rules.json"


def validate(data: dict) -> list[str]:
    errors = []
    presence = data.get("presence", {})
    space = data.get("space", {})
    social = data.get("social", {})
    governance = data.get("governance", {})

    if presence.get("force_disconnect") is not False:
        errors.append("force_disconnect must remain false in v0.1")
    if not presence.get("rest_mode_enabled"):
        errors.append("rest_mode_enabled must be true")
    if presence.get("daily_minutes") != 45:
        errors.append("presence.daily_minutes must remain fixed at 45")
    if presence.get("banking_enabled") is not False:
        errors.append("presence.banking_enabled must remain false")
    if not space.get("commons_always_public"):
        errors.append("commons_always_public must be true")
    if not space.get("fail_closed"):
        errors.append("space.fail_closed must be true")
    if social.get("daily_login_rewards"):
        errors.append("daily_login_rewards conflicts with project principles")
    if social.get("streak_rewards"):
        errors.append("streak_rewards conflicts with project principles")
    if governance.get("public_access_unlimited_mutation"):
        errors.append("public commons cannot allow unlimited mutation")
    if not governance.get("permissions_revocable"):
        errors.append("permissions must be revocable")
    return errors


def main() -> int:
    data = json.loads(CONFIG.read_text(encoding="utf-8"))
    errors = validate(data)
    if errors:
        print("CONFIG INVALID")
        for error in errors:
            print(f"- {error}")
        return 1
    print("CONFIG VALID")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
