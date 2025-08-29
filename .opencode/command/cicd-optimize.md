---
description: Optimize GitHub Actions workflow for better performance
agent: cicd-agent
model: github-copilot/gpt-4.1
---
Optimize the GitHub Actions workflow in .github/workflows/ci.yml:
- Add proper caching for dependencies
- Implement parallel job execution where possible
- Optimize Docker layer caching
- Add conditional builds for faster PR checks
- Suggest matrix builds for multiple Python versions

Show the optimized workflow YAML with explanations.
