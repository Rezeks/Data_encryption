"""Block transposition cipher — permute characters within fixed-size blocks."""

from . import BaseCipher, register_cipher

# Standard Russian 33-letter alphabet from Table 1
RU_ALPHABET = "АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ"
RU_MAP = {ch: i + 1 for i, ch in enumerate(RU_ALPHABET)}

EN_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
EN_MAP = {ch: i + 1 for i, ch in enumerate(EN_ALPHABET)}


def get_char_rank(ch: str) -> int:
    upper = ch.upper()
    if upper in RU_MAP:
        return RU_MAP[upper]
    if upper in EN_MAP:
        return EN_MAP[upper] + 100
    return ord(upper) + 1000


def keyword_to_permutation(keyword: str) -> list[int]:
    """Convert a keyword into 0-based block transposition indices.
    
    Letters are ranked in ascending order according to Table 1 (1 to 33).
    Identical letters are ordered left-to-right.
    """
    cleaned = "".join(keyword.split())
    if not cleaned:
        raise ValueError("Ключевое слово не может быть пустым")

    # Sort indices by (alphabet_number, original_index)
    indexed = sorted(
        enumerate(cleaned),
        key=lambda item: (get_char_rank(item[1]), item[0]),
    )
    # The order of original positions gives the reading order
    return [item[0] for item in indexed]


def permutation_to_string(perm: list[int]) -> str:
    """Format 0-based indices as a 1-based comma-separated string."""
    return ",".join(str(p + 1) for p in perm)


def _parse_permutation(perm_str: str) -> list[int]:
    """Parse a comma-separated permutation string like '3,1,4,2' into 0-based indices."""
    parts = [p.strip() for p in perm_str.split(",") if p.strip()]
    perm = [int(x) - 1 for x in parts]  # convert to 0-based

    n = len(perm)
    if sorted(perm) != list(range(n)):
        raise ValueError(
            f"Перестановка должна содержать числа от 1 до {n} без повторений. "
            f"Получено: {perm_str}"
        )
    return perm


def _invert_permutation(perm: list[int]) -> list[int]:
    """Return the inverse permutation."""
    inv = [0] * len(perm)
    for i, p in enumerate(perm):
        inv[p] = i
    return inv


@register_cipher
class BlockTransposition(BaseCipher):
    name = "Блочная перестановка"
    description = (
        "Текст разбивается на блоки фиксированного размера. "
        "Внутри каждого блока символы переставляются по правилу, заданному ключевым словом "
        "(в порядке возрастания алфавитных номеров букв по Таблице 1) или числовой перестановкой."
    )
    params_schema = [
        {
            "id": "keyword",
            "label": "Ключевое слово (ключ)",
            "type": "text",
            "default": "КЛЮЧ",
            "hint": "Слово, определяющее перестановку в блоке (например: КЛЮЧ, ГАММА, ПОЛЕ)",
        },
    ]

    def _get_perm(self, params: dict) -> list[int]:
        keyword = str(params.get("keyword", "")).strip()
        perm_str = str(params.get("permutation", "")).strip()

        if keyword:
            return keyword_to_permutation(keyword)
        if perm_str:
            return _parse_permutation(perm_str)
        return keyword_to_permutation("КЛЮЧ")

    def encrypt(self, text: str, **params) -> str:
        perm = self._get_perm(params)
        block_size = len(perm)

        # Pad if needed
        padding = (block_size - len(text) % block_size) % block_size
        padded = text + " " * padding

        result: list[str] = []
        for i in range(0, len(padded), block_size):
            block = padded[i : i + block_size]
            result.append("".join(block[p] for p in perm))

        return "".join(result)

    def decrypt(self, text: str, **params) -> str:
        perm = self._get_perm(params)
        inv = _invert_permutation(perm)
        block_size = len(perm)

        padding = (block_size - len(text) % block_size) % block_size
        padded = text + " " * padding

        result: list[str] = []
        for i in range(0, len(padded), block_size):
            block = padded[i : i + block_size]
            result.append("".join(block[p] for p in inv))

        return "".join(result).rstrip()

