#!/usr/bin/env bash
# scripts/security/pre-commit-gitleaks.sh
set -euo pipefail

echo "🔍 Running Gitleaks secret scan on staged changes..."

if ! command -v gitleaks &> /dev/null; then
  if [ -f "$HOME/.local/bin/gitleaks" ]; then
    export PATH="$HOME/.local/bin:$PATH"
  else
    echo "⚠️  gitleaks binary not found in PATH. Please install gitleaks to prevent accidental secret commits."
    exit 0
  fi
fi

# Run protect against staged changes
if ! gitleaks protect --staged --verbose; then
  echo ""
  echo "❌ COMMIT REJECTED: Gitleaks detected sensitive tokens or secrets staged for commit!"
  echo "👉 Remove the secret, add it to your local environment file (.env.local), and try again."
  exit 1
fi

echo "✅ Gitleaks: No secrets detected in staged changes."
exit 0
