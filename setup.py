from setuptools import setup, find_packages

setup(
    name="jeet",
    version="0.0.0",
    packages=find_packages(exclude=("tests", "e2e", "node_modules")),
)
