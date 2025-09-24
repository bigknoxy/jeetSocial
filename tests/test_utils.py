"""
test_utils.py
Unit tests for app/utils.py functions: generate_username, normalize_text, is_kind
"""

import re
from app.utils import generate_username, normalize_text, is_kind


def test_generate_username_format():
    username = generate_username()
    # Format: <Adjective><Animal><2-digit number>
    assert re.match(r"^[A-Za-z]+[A-Za-z]+\d{2}$", username)


def test_generate_username_randomness():
    usernames = {generate_username() for _ in range(20)}
    # Should be mostly unique
    assert len(usernames) > 15


def test_generate_username_non_identifiable():
    username = generate_username()
    # Should not be empty or a real name
    assert username
    assert not re.match(
        r"^[A-Z][a-z]+ [A-Z][a-z]+$", username
    )  # Not a real name format


def test_normalize_text_unicode():
    text = "b\\u0069got"
    norm = normalize_text(text)
    assert "bigot" in norm


def test_normalize_text_leet():
    text = "stup1d"
    norm = normalize_text(text)
    assert "stupid" in norm


def test_normalize_text_punctuation():
    text = "stupid!"
    norm = normalize_text(text)
    assert "stupid" in norm


def test_is_kind_positive():
    assert is_kind("You are awesome and kind!") is True
    assert is_kind("Keep going, you got this!") is True


def test_is_kind_negative():
    assert is_kind("You are stupid") is False
    assert is_kind("This is a neutral message.") is False
