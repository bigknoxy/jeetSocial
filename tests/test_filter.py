import os
import pytest
from app.utils import is_hate_speech

@pytest.mark.parametrize("text,expected,reason", [
    ("You are stupid", True, "word_list"),
    ("STUPID!", True, "word_list"),
    ("bigot.", True, "word_list"),
    ("I am a bigot", True, "word_list"),
    ("You are a bigot!", True, "word_list"),
    ("You are a BiGoT", True, "word_list"),
    ("You are a bIgOt!", True, "word_list"),
    ("You are an idiot", True, "word_list"),
    ("You are a clown!", True, "word_list"),
    ("You are a nice person", False, None),
    ("I love everyone", False, None),
    ("Go away!", True, "word_list"),
    ("Nobody likes you.", True, "word_list"),
    ("You are a failure", True, "word_list"),
    ("You are a fAiLuRe!", True, "word_list"),
    ("You are a savage.", True, "word_list"),
    ("You are a monster!", True, "word_list"),
    ("You are a parasite", True, "word_list"),
    ("You are a cockroach", True, "word_list"),
    ("You are a rat", True, "word_list"),
    ("You are a snake", True, "word_list"),
    ("You are a worm", True, "word_list"),
    ("You are a leech", True, "word_list"),
    ("You are a bloodsucker", True, "word_list"),
    ("You are a menace", True, "word_list"),
    ("You are a threat", True, "word_list"),
    ("You are a danger", True, "word_list"),
    ("You are evil", True, "word_list"),
])
def test_word_list_filter(text, expected, reason):
    is_hate, why, details = is_hate_speech(text)
    assert is_hate == expected
    assert why == reason

def test_punctuation_and_case():
    assert is_hate_speech("STUPID!")[0] is True
    assert is_hate_speech("bigot.")[0] is True
    assert is_hate_speech("You are a BiGoT!")[0] is True

def test_edge_cases():
    assert is_hate_speech("I am a bigot")[0] is True
    assert is_hate_speech("You are a bigot!")[0] is True
    assert is_hate_speech("Nobody likes you.")[0] is True

def test_non_hateful():
    assert is_hate_speech("You are awesome!")[0] is False
    assert is_hate_speech("Have a great day!")[0] is False

