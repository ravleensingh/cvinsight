from __future__ import annotations

import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent
MODEL_DIRS = ["ml1", "ml2", "ml3", "ml4"]


def main() -> int:
    failures: list[str] = []

    for model_dir in MODEL_DIRS:
        script = ROOT / model_dir / "train.py"
        print(f"\n{'=' * 80}")
        print(f"Training {model_dir}: {script}")
        print(f"{'=' * 80}")
        result = subprocess.run([sys.executable, str(script)], cwd=ROOT, check=False)
        if result.returncode != 0:
            failures.append(model_dir)

    if failures:
        print(f"\nTraining failed for: {', '.join(failures)}")
        return 1

    print("\nAll models trained successfully.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

