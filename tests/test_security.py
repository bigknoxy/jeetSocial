import json
import pytest


def test_no_critical_vulnerabilities():
    """Test that the Trivy scan reports no CRITICAL vulnerabilities."""
    try:
        with open("reports/trivy/phase1.json", "r") as f:
            data = json.load(f)
    except FileNotFoundError:
        pytest.fail(
            "Trivy report not found. Run 'trivy image jeetsocial:phase1 "
            "--format json --output reports/trivy/phase1.json' first."
        )

    count = {"CRITICAL": 0, "HIGH": 0}

    for result in data.get("Results", []):
        for vuln in result.get("Vulnerabilities", []):
            severity = vuln.get("Severity")
            if severity in count:
                count[severity] += 1

    # Assertions for post-remediation state
    assert count["CRITICAL"] == 0, f"Found {count['CRITICAL']} CRITICAL vulnerabilities"
    assert count["HIGH"] <= 537, (
        f"Found {count['HIGH']} HIGH vulnerabilities, expected <= 537 "
        "(50% reduction from 1074)"
    )
