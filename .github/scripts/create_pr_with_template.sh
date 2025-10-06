#!/usr/bin/env bash
set -e

# Usage: create_pr_with_template.sh "PR Title" [head_branch] [base_branch]
# If head_branch is omitted, uses current git branch. Base defaults to "main".

TEMPLATE_FILE=".github/pull_request_template.md"

if [ -z "$1" ]; then
  echo "Usage: $0 \"PR Title\" [head_branch] [base_branch]"
  exit 1
fi

PR_TITLE="$1"
HEAD_BRANCH="${2:-$(git rev-parse --abbrev-ref HEAD)}"
BASE_BRANCH="${3:-main}"

if [ -f "$TEMPLATE_FILE" ]; then
  PR_BODY=$(cat "$TEMPLATE_FILE")
else
  PR_BODY=""
fi

# Create PR using GitHub CLI, using the template as the body
gh pr create --title "$PR_TITLE" --body "$PR_BODY" --head "$HEAD_BRANCH" --base "$BASE_BRANCH"
