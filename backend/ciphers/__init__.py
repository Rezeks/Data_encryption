"""
Cipher plugin system.

To add a new cipher:
1. Create a new file in this directory (e.g. vigenere.py)
2. Inherit from BaseCipher
3. Decorate with @register_cipher
4. That's it — the API and frontend will pick it up automatically.
"""

from abc import ABC, abstractmethod
from typing import Any
import importlib
import pkgutil


class BaseCipher(ABC):
    """Base class for all ciphers."""

    name: str = ""
    description: str = ""
    params_schema: list[dict[str, Any]] = []

    @abstractmethod
    def encrypt(self, text: str, **params) -> str:
        """Encrypt the given text with the provided parameters."""
        ...

    @abstractmethod
    def decrypt(self, text: str, **params) -> str:
        """Decrypt the given text with the provided parameters."""
        ...

    def get_info(self) -> dict:
        """Return cipher metadata for the frontend."""
        return {
            "id": self.__class__.__name__.lower(),
            "name": self.name,
            "description": self.description,
            "params": self.params_schema,
        }


# ---------------------------------------------------------------------------
# Registry
# ---------------------------------------------------------------------------

_registry: dict[str, BaseCipher] = {}


def register_cipher(cls: type[BaseCipher]) -> type[BaseCipher]:
    """Decorator that registers a cipher class in the global registry."""
    instance = cls()
    _registry[instance.__class__.__name__.lower()] = instance
    return cls


def get_cipher(cipher_id: str) -> BaseCipher | None:
    """Look up a cipher by its ID."""
    return _registry.get(cipher_id)


def list_ciphers() -> list[dict]:
    """Return metadata for all registered ciphers."""
    return [cipher.get_info() for cipher in _registry.values()]


# ---------------------------------------------------------------------------
# Auto-discovery: import every module in this package so that @register_cipher
# decorators execute at import time.
# ---------------------------------------------------------------------------

def _discover() -> None:
    package_path = __path__  # type: ignore[name-defined]
    for _importer, module_name, _ispkg in pkgutil.iter_modules(package_path):
        importlib.import_module(f".{module_name}", __name__)


_discover()
