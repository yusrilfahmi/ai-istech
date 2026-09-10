"""
common.py
---------------------
Fungsi utilitas yang dipakai di build_model.py dan predict.py
- validate_machine_name() untuk mencegah path traversal,
- resolve_model_path() untuk mencegah path traversal,
- dan machine_dir() untuk membuat folder

"""


import re
from pathlib import Path

MODELS_DIR = Path(__file__).parent.parent.parent / "models"
_SAFE_NAME_RE = re.compile(r"^[A-Za-z0-9_\-]+$")

class InvalidNameError(ValueError):
    pass

class InvalidModelPathError(ValueError):
    pass

def validate_machine_name(machine_name: str) -> str:
    if not machine_name or not _SAFE_NAME_RE.match(machine_name):
        raise InvalidNameError(
            "Nama mesin/seri mesin hanya boleh berisi huruf, angka, '-' dan '_' "
            f"(diterima: {machine_name!r})"
        )
    return machine_name

def resolve_model_path(machine_name: str, model_train: str) -> Path:
    validate_machine_name(machine_name)

    candidate = (MODELS_DIR / machine_name / model_train).resolve()
    models_root = MODELS_DIR.resolve()

    if models_root not in candidate.parents and candidate != models_root:
        raise InvalidModelPathError(f"model_train tidak valid: {model_train!r}")

    if not candidate.name.startswith(f"{machine_name}_") and candidate.parent.name != machine_name:
        raise InvalidModelPathError(
            f"model_train {model_train!r} tidak sesuai dengan machine_name {machine_name!r}"
        )

    if candidate.suffix != ".joblib":
        raise InvalidModelPathError("model_train harus berekstensi .joblib")

    return candidate

def machine_dir(machine_name: str) -> Path:
    validate_machine_name(machine_name)
    d = MODELS_DIR / machine_name
    d.mkdir(parents=True, exist_ok=True)
    return d
