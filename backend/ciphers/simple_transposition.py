"""Simple columnar transposition cipher."""

from . import BaseCipher, register_cipher
import math


def _key_order(key: str) -> list[int]:
    """Return column read-order derived from the keyword.

    Letters are numbered in alphabetical order; ties are broken left-to-right.
    Example: key='ЗЕБРА' → sorted unique chars: Б=0, Е=1, З=2, Р=3, А → wait,
    we sort (char, original_index) pairs so identical chars preserve order.
    """
    indexed = sorted(enumerate(key), key=lambda pair: pair[1])
    order = [0] * len(key)
    for rank, (orig_idx, _char) in enumerate(indexed):
        order[orig_idx] = rank
    return order


@register_cipher
class SimpleTransposition(BaseCipher):
    name = "Простая перестановка"
    description = (
        "Текст записывается в строки по длине ключевого слова, "
        "затем считывается по столбцам в алфавитном порядке букв ключа."
    )
    params_schema = [
        {
            "id": "key",
            "label": "Ключевое слово",
            "type": "text",
            "default": "КЛЮЧ",
            "hint": "Слово, определяющее порядок столбцов",
        }
    ]

    # ------------------------------------------------------------------ #
    #  Encrypt
    # ------------------------------------------------------------------ #
    def encrypt(self, text: str, **params) -> str:
        key = params.get("key", "КЛЮЧ")
        if not key:
            raise ValueError("Ключ не может быть пустым")

        cols = len(key)
        order = _key_order(key)

        # Pad text to fill the last row
        padding = (cols - len(text) % cols) % cols
        padded = text + " " * padding
        rows = len(padded) // cols

        # Build the grid
        grid: list[list[str]] = []
        for r in range(rows):
            grid.append(list(padded[r * cols : r * cols + cols]))

        # Read columns in the order defined by the key
        result: list[str] = []
        for target_rank in range(cols):
            col_idx = order.index(target_rank)
            for r in range(rows):
                result.append(grid[r][col_idx])

        return "".join(result)

    # ------------------------------------------------------------------ #
    #  Decrypt
    # ------------------------------------------------------------------ #
    def decrypt(self, text: str, **params) -> str:
        key = params.get("key", "КЛЮЧ")
        if not key:
            raise ValueError("Ключ не может быть пустым")

        cols = len(key)
        order = _key_order(key)
        rows = math.ceil(len(text) / cols)

        # Fill columns in key-order
        grid: list[list[str]] = [[""] * cols for _ in range(rows)]
        idx = 0
        for target_rank in range(cols):
            col_idx = order.index(target_rank)
            for r in range(rows):
                if idx < len(text):
                    grid[r][col_idx] = text[idx]
                    idx += 1

        # Read rows left-to-right
        return "".join("".join(row) for row in grid).rstrip()
