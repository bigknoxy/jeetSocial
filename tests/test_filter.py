from app.utils import is_hateful

def test_hate_filter_blocks():
    assert is_hateful('I hate you')
    assert is_hateful('You are a bigot')
    assert is_hateful('slur1')
    assert is_hateful('slur2')

def test_hate_filter_allows():
    assert not is_hateful('I love everyone')
    assert not is_hateful('This is a nice day')
