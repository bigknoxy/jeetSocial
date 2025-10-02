def test_smoke_importable():
    import importlib

    importlib.import_module("app")
    assert True
