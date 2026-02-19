# Ensure backend/ is first in sys.path so backend modules (main, db, models, etc.)
# take precedence over any root-level modules with the same name (e.g., main.py from Phase I).
import sys
from pathlib import Path

_backend_dir = str(Path(__file__).parent.resolve())
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)
elif sys.path[0] != _backend_dir:
    sys.path.remove(_backend_dir)
    sys.path.insert(0, _backend_dir)
