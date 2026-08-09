from __future__ import annotations

import sys
from pathlib import Path


MODEL_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(MODEL_DIR))

from compare import compare_algorithms


if __name__ == "__main__":
    compare_algorithms()
