import subprocess
import sys

# Run flask db upgrade
subprocess.run([sys.executable, "-m", "flask", "db", "upgrade"])

# Run gunicorn
subprocess.run(["gunicorn", "--bind", "0.0.0.0:5000", "app:create_app()"])
