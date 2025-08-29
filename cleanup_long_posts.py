#!/usr/bin/env python3
"""
cleanup_long_posts.py

One-time script to clean up existing posts that exceed the 280 character limit.
This script can either delete or truncate posts that are too long.

Usage:
    python cleanup_long_posts.py --dry-run          # Preview changes (default)
    python cleanup_long_posts.py --delete           # Delete long posts
    python cleanup_long_posts.py --truncate         # Truncate long posts to 280 chars
    python cleanup_long_posts.py --help             # Show help

Safety:
- Always backup your database before running with --delete or --truncate
- Run with --dry-run first to see what will be affected
- The script will ask for confirmation before making changes

Author: jeetSocial Team
"""

import argparse
import sys
import os
from datetime import datetime

# Add the app directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "app"))

try:
    from app import create_app, db
    from app.models import Post
except ImportError as e:
    print(f"Error importing app modules: {e}")
    print("Make sure you're running this from the project root directory.")
    sys.exit(1)


def get_long_posts():
    """Query for posts that exceed 280 characters."""
    return Post.query.filter(db.func.length(Post.message) > 280).all()


def preview_changes(long_posts, action):
    """Show what changes will be made without executing them."""
    print(f"\n{'='*60}")
    print(f"DRY RUN: Preview of {action} action")
    print(f"{'='*60}")

    if not long_posts:
        print("✅ No posts found that exceed 280 characters.")
        return

    print(f"Found {len(long_posts)} posts that exceed 280 characters:")
    print()

    for i, post in enumerate(long_posts, 1):
        print(f"{i}. Post ID: {post.id}")
        print(f"   Username: {post.username}")
        print(f"   Created: {post.timestamp}")
        print(f"   Current length: {len(post.message)} characters")
        print(
            f"   Message preview: {post.message[:100]}{'...' if len(post.message) > 100 else ''}"
        )

        if action == "truncate":
            print(f"   → Will truncate to: {post.message[:280]}")
        elif action == "delete":
            print("   → Will be DELETED")
        print()

    print(f"Total posts to {action}: {len(long_posts)}")


def confirm_action(action, count):
    """Ask user to confirm the action."""
    print(f"\n{'⚠️'*10}  WARNING  {'⚠️'*10}")
    print(f"You are about to {action.upper()} {count} posts!")
    print("This action cannot be undone.")
    print("Make sure you have a backup of your database.")
    print()

    while True:
        response = (
            input(f"Type 'yes' to confirm {action} of {count} posts: ").strip().lower()
        )
        if response == "yes":
            return True
        elif response in ["no", "n"]:
            print("Operation cancelled.")
            return False
        else:
            print("Please type 'yes' to confirm or 'no' to cancel.")


def truncate_posts(long_posts):
    """Truncate posts to 280 characters."""
    truncated_count = 0

    for post in long_posts:
        original_length = len(post.message)
        post.message = post.message[:280]
        truncated_count += 1
        print(f"Truncated post {post.id}: {original_length} → 280 characters")

    try:
        db.session.commit()
        print(f"\n✅ Successfully truncated {truncated_count} posts.")
    except Exception as e:
        db.session.rollback()
        print(f"\n❌ Error during truncation: {e}")
        return False

    return True


def delete_posts(long_posts):
    """Delete posts that are too long."""
    deleted_count = 0

    for post in long_posts:
        print(f"Deleting post {post.id} ({len(post.message)} characters)")
        db.session.delete(post)
        deleted_count += 1

    try:
        db.session.commit()
        print(f"\n✅ Successfully deleted {deleted_count} posts.")
    except Exception as e:
        db.session.rollback()
        print(f"\n❌ Error during deletion: {e}")
        return False

    return True


def main():
    parser = argparse.ArgumentParser(
        description="Clean up posts that exceed 280 characters",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python cleanup_long_posts.py              # Dry run (preview)
  python cleanup_long_posts.py --delete     # Delete long posts
  python cleanup_long_posts.py --truncate   # Truncate long posts

⚠️  Always backup your database before using --delete or --truncate!
        """,
    )

    group = parser.add_mutually_exclusive_group()
    group.add_argument(
        "--delete", action="store_true", help="Delete posts that exceed 280 characters"
    )
    group.add_argument(
        "--truncate", action="store_true", help="Truncate posts to 280 characters"
    )
    group.add_argument(
        "--dry-run",
        action="store_true",
        default=True,
        help="Preview changes without making them (default)",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Skip confirmation prompts (use with caution!)",
    )

    args = parser.parse_args()

    # Determine action
    if args.delete:
        action = "delete"
        dry_run = False
    elif args.truncate:
        action = "truncate"
        dry_run = False
    else:
        action = "preview"
        dry_run = True

    print("jeetSocial - Long Posts Cleanup Script")
    print(f"Started at: {datetime.now()}")
    print(f"Action: {action}")
    print(f"Dry run: {dry_run}")
    print()

    # Create app and get database connection
    try:
        app = create_app()
    except Exception as e:
        print(f"❌ Failed to create app: {e}")
        print("Make sure your environment variables are set correctly.")
        sys.exit(1)

    with app.app_context():
        try:
            # Get posts that are too long
            long_posts = get_long_posts()

            if dry_run:
                preview_changes(long_posts, action)
                print("\n💡 To make actual changes, run with --delete or --truncate")
            else:
                # Show preview first
                preview_changes(long_posts, action)

                if not long_posts:
                    print("\n✅ No posts need cleanup.")
                    return

                # Confirm action
                if not args.force and not confirm_action(action, len(long_posts)):
                    return

                # Execute action
                print(f"\n🔄 Starting {action} operation...")
                success = False
                if action == "truncate":
                    success = truncate_posts(long_posts)
                elif action == "delete":
                    success = delete_posts(long_posts)
                else:
                    print(f"❌ Unknown action: {action}")
                    sys.exit(1)

                if success:
                    print(
                        f"\n🎉 {action.capitalize()} operation completed successfully!"
                    )
                else:
                    print(f"\n❌ {action.capitalize()} operation failed!")
                    sys.exit(1)

        except Exception as e:
            print(f"❌ Unexpected error: {e}")
            sys.exit(1)


if __name__ == "__main__":
    main()
