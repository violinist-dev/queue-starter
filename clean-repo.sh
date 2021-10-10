set -e

if [ $(git status -s | wc -c) -ne 0 ]; then
    echo "Working tree is not clean:"
    git status
    exit 1
fi
