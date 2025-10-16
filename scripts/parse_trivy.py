#!/usr/bin/env python3
"""Simple parser to summarize CRITICAL/HIGH vulnerabilities in Trivy JSON."""
import json
import sys


def summarize(path):
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    results = []
    for res in data.get("Results", []):
        target = res.get("Target")
        for vuln in res.get("Vulnerabilities", []) or []:
            sev = vuln.get("Severity")
            if sev in ("CRITICAL", "HIGH"):
                results.append(
                    {
                        "Target": target,
                        "VulnerabilityID": vuln.get("VulnerabilityID"),
                        "PkgName": vuln.get("PkgName"),
                        "InstalledVersion": vuln.get("InstalledVersion"),
                        "FixedVersion": vuln.get("FixedVersion"),
                        "Severity": sev,
                        "Title": vuln.get("Title"),
                        "Layer": (
                            vuln.get("Layer", {}).get("DiffID")
                            if vuln.get("Layer")
                            else None
                        ),
                    }
                )
    return results


if __name__ == "__main__":
    path = sys.argv[1] if len(sys.argv) > 1 else "reports/trivy/phase1.json"
    items = summarize(path)
    print(json.dumps(items, indent=2))
