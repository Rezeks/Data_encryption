"""Caesar cipher — shift each letter by a fixed number of positions."""

from . import BaseCipher, register_cipher

_RU_LOWER = "абвгдежзийклмнопрстуфхцчшщъыьэюя"
_RU_UPPER = _RU_LOWER.upper()
_EN_LOWER = "abcdefghijklmnopqrstuvwxyz"
_EN_UPPER = _EN_LOWER.upper()


def _shift_char(ch: str, shift: int) -> str:
    """Shift a single character within its alphabet, leave others untouched."""
    for alphabet in (_RU_LOWER, _RU_UPPER, _EN_LOWER, _EN_UPPER):
        if ch in alphabet:
            idx = alphabet.index(ch)
            return alphabet[(idx + shift) % len(alphabet)]
    return ch


@register_cipher
class Caesar(BaseCipher):
    name = "Шифр Цезаря"
    description = (
        "Каждая буква сдвигается на фиксированное число позиций в алфавите. "
        "Поддерживает русский и английский алфавит."
    )
    params_schema = [
        {
            "id": "shift",
            "label": "Сдвиг",
            "type": "number",
            "min": 1,
            "max": 33,
            "default": 3,
            "hint": "Количество позиций для сдвига (1–33)",
        }
    ]

    def encrypt(self, text: str, **params) -> str:
        shift = int(params.get("shift", 3))
        return "".join(_shift_char(ch, shift) for ch in text)

    def decrypt(self, text: str, **params) -> str:
        shift = int(params.get("shift", 3))
        return "".join(_shift_char(ch, -shift) for ch in text)
