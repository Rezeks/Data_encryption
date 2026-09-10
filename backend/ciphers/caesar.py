"""Caesar cipher implementations:
1. Caesar — classic version (spaces and punctuation preserved untouched).
2. CaesarSpaces — version with spaces included in the alphabet (space is the 34th symbol).
"""

from . import BaseCipher, register_cipher

# 33 letters of the standard Russian alphabet (including 'ё' at position 7)
_RU_LOWER = "абвгдеёжзийклмнопрстуфхцчшщъыьэюя"
_RU_UPPER = _RU_LOWER.upper()

# 26 letters of the English alphabet
_EN_LOWER = "abcdefghijklmnopqrstuvwxyz"
_EN_UPPER = _EN_LOWER.upper()


# ═══════════════════════════════════════════════════════════════════════════
#  Helper: Classic shift (without spaces)
# ═══════════════════════════════════════════════════════════════════════════

def _shift_char_no_spaces(ch: str, shift: int) -> str:
    """Shift a single character within its alphabet (33 for RU, 26 for EN).
    Spaces, punctuation and unknown symbols are left untouched.
    """
    for alphabet in (_RU_LOWER, _RU_UPPER, _EN_LOWER, _EN_UPPER):
        if ch in alphabet:
            idx = alphabet.index(ch)
            return alphabet[(idx + shift) % len(alphabet)]
    return ch


# ═══════════════════════════════════════════════════════════════════════════
#  Helper: Extended shift (with space as 34th symbol)
# ═══════════════════════════════════════════════════════════════════════════

def _find_nearest_letter_type(text: str, idx: int) -> str:
    """Find the case and alphabet type of the nearest letter around index `idx`.
    Returns one of: 'ru_upper', 'ru_lower', 'en_upper', 'en_lower', or 'ru_lower' (default).
    """
    n = len(text)
    # Check backwards first, then forwards
    for distance in range(1, max(idx + 1, n - idx)):
        # Check backward
        back_idx = idx - distance
        if 0 <= back_idx < n:
            ch = text[back_idx]
            if ch in _RU_UPPER:
                return "ru_upper"
            if ch in _RU_LOWER:
                return "ru_lower"
            if ch in _EN_UPPER:
                return "en_upper"
            if ch in _EN_LOWER:
                return "en_lower"

        # Check forward
        fwd_idx = idx + distance
        if 0 <= fwd_idx < n:
            ch = text[fwd_idx]
            if ch in _RU_UPPER:
                return "ru_upper"
            if ch in _RU_LOWER:
                return "ru_lower"
            if ch in _EN_UPPER:
                return "en_upper"
            if ch in _EN_LOWER:
                return "en_lower"

    # Default to Russian lowercase
    return "ru_lower"


def _shift_text_with_spaces(text: str, shift: int) -> str:
    """Shift characters where space is the 34th symbol in Russian (or 27th in English).

    Alphabet for Russian (len = 34):
      Index 0..32: 'а'..'я' (or 'А'..'Я')
      Index 33 (34th symbol): ' ' (space)

    Alphabet for English (len = 27):
      Index 0..25: 'a'..'z' (or 'A'..'Z')
      Index 26 (27th symbol): ' ' (space)
    """
    result = []
    for i, ch in enumerate(text):
        if ch in _RU_LOWER:
            idx = _RU_LOWER.index(ch)
            new_idx = (idx + shift) % 34
            result.append(" " if new_idx == 33 else _RU_LOWER[new_idx])

        elif ch in _RU_UPPER:
            idx = _RU_UPPER.index(ch)
            new_idx = (idx + shift) % 34
            result.append(" " if new_idx == 33 else _RU_UPPER[new_idx])

        elif ch in _EN_LOWER:
            idx = _EN_LOWER.index(ch)
            new_idx = (idx + shift) % 27
            result.append(" " if new_idx == 26 else _EN_LOWER[new_idx])

        elif ch in _EN_UPPER:
            idx = _EN_UPPER.index(ch)
            new_idx = (idx + shift) % 27
            result.append(" " if new_idx == 26 else _EN_UPPER[new_idx])

        elif ch == " ":
            # Space is shifted according to the surrounding context
            ltype = _find_nearest_letter_type(text, i)
            if ltype == "ru_upper":
                new_idx = (33 + shift) % 34
                result.append(" " if new_idx == 33 else _RU_UPPER[new_idx])
            elif ltype == "en_upper":
                new_idx = (26 + shift) % 27
                result.append(" " if new_idx == 26 else _EN_UPPER[new_idx])
            elif ltype == "en_lower":
                new_idx = (26 + shift) % 27
                result.append(" " if new_idx == 26 else _EN_LOWER[new_idx])
            else:  # ru_lower default
                new_idx = (33 + shift) % 34
                result.append(" " if new_idx == 33 else _RU_LOWER[new_idx])

        else:
            # Punctuation, newlines and digits stay untouched
            result.append(ch)

    return "".join(result)


# ═══════════════════════════════════════════════════════════════════════════
#  Class: Caesar (без пробелов)
# ═══════════════════════════════════════════════════════════════════════════

@register_cipher
class Caesar(BaseCipher):
    name = "Шифр Цезаря (без пробелов)"
    description = (
        "Классический шифр Цезаря. Буквы сдвигаются на N позиций в алфавите "
        "(33 русские буквы, 26 английских). Пробелы между словами и знаки препинания "
        "сохраняются без изменений."
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
        return "".join(_shift_char_no_spaces(ch, shift) for ch in text)

    def decrypt(self, text: str, **params) -> str:
        shift = int(params.get("shift", 3))
        return "".join(_shift_char_no_spaces(ch, -shift) for ch in text)


# ═══════════════════════════════════════════════════════════════════════════
#  Class: CaesarSpaces (с пробелами, 34-й символ)
# ═══════════════════════════════════════════════════════════════════════════

@register_cipher
class CaesarSpaces(BaseCipher):
    name = "Шифр Цезаря (с пробелами)"
    description = (
        "Шифр Цезаря с расширенным алфавитом из 34 символов (33 русские буквы + пробел "
        "в качестве 34-го символа). Пробелы между буквами полноценно участвуют в шифровании: "
        "буква может перейти в пробел, а пробел — в букву."
    )
    params_schema = [
        {
            "id": "shift",
            "label": "Сдвиг",
            "type": "number",
            "min": 1,
            "max": 34,
            "default": 3,
            "hint": "Количество позиций для сдвига (1–34, пробел — 34-й символ)",
        }
    ]

    def encrypt(self, text: str, **params) -> str:
        shift = int(params.get("shift", 3))
        return _shift_text_with_spaces(text, shift)

    def decrypt(self, text: str, **params) -> str:
        shift = int(params.get("shift", 3))
        return _shift_text_with_spaces(text, -shift)
