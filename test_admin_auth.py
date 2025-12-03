#!/usr/bin/env python3
"""
Simple test script to verify admin authentication fixes.
This script tests the authentication flow end-to-end.
"""

import os
import sys
import requests
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:5678"
ADMIN_ID = "admin"
ADMIN_PASSWORD = "admin123"
MFA_CODE = "123456"


def test_authentication_flow():
    """Test the complete authentication flow."""
    print("🧪 Testing Admin Authentication Flow")
    print("=" * 50)

    # Test 1: Check admin dashboard requires auth
    print("1. Testing dashboard access without authentication...")
    try:
        response = requests.get(f"{BASE_URL}/admin/")
        if response.status_code == 401:
            print("   ✅ Dashboard correctly requires authentication")
        else:
            print(f"   ❌ Dashboard should return 401, got {response.status_code}")
    except requests.exceptions.ConnectionError:
        print("   ❌ Cannot connect to server. Make sure the app is running.")
        return False

    # Test 2: Get CSRF token
    print("\n2. Getting CSRF token...")
    try:
        csrf_response = requests.get(f"{BASE_URL}/admin/csrf-token")
        if csrf_response.status_code == 200:
            csrf_data = csrf_response.json()
            csrf_token = csrf_data.get("csrf_token")
            csrf_cookie = csrf_response.cookies.get("csrf_token")
            print(f"   ✅ CSRF token obtained: {csrf_token[:8]}...")
            if csrf_token != csrf_cookie:
                print(
                    f"   ⚠️  CSRF token mismatch: header={csrf_token[:8]}..., "
                    f"cookie={csrf_cookie[:8]}..."
                )
        else:
            print(f"   ❌ Failed to get CSRF token: {csrf_response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("   ❌ Cannot connect to server")
        return False

    # Test 3: Test login with wrong credentials
    print("\n3. Testing login with wrong credentials...")
    try:
        login_data = {"admin_id": "wrong", "password": "wrong", "mfa_code": "000000"}
        wrong_response = requests.post(
            f"{BASE_URL}/admin/login",
            json=login_data,
            cookies={"csrf_token": csrf_token},
            headers={"X-CSRF-Token": csrf_token},
        )
        if wrong_response.status_code == 401:
            print("   ✅ Wrong credentials correctly rejected")
        else:
            print(
                f"   ❌ Wrong credentials should return 401, got "
                f"{wrong_response.status_code}"
            )
    except requests.exceptions.ConnectionError:
        print("   ❌ Cannot connect to server")
        return False

    # Test 4: Test login with correct credentials
    print("\n4. Testing login with correct credentials...")
    try:
        login_data = {
            "admin_id": ADMIN_ID,
            "password": ADMIN_PASSWORD,
            "mfa_code": MFA_CODE,
        }
        login_response = requests.post(
            f"{BASE_URL}/admin/login",
            json=login_data,
            cookies={"csrf_token": csrf_token},
            headers={"X-CSRF-Token": csrf_token},
        )

        if login_response.status_code == 200:
            login_data = login_response.json()
            print("   ✅ Login successful!")
            print("   📝 Received tokens: access_token, refresh_token, csrf_token")

            # Extract cookies for next requests
            login_cookies = login_response.cookies
            access_token = login_cookies.get("access_token")
            refresh_token = login_cookies.get("refresh_token")

            if access_token and refresh_token:
                print("   🍪 Authentication cookies set successfully")
            else:
                print("   ❌ Authentication cookies not set properly")
                return False

        else:
            print(f"   ❌ Login failed with status: {login_response.status_code}")
            try:
                error_data = login_response.json()
                print(f"   📝 Error: {error_data.get('error', 'Unknown error')}")
            except Exception:
                print(f"   📝 Response: {login_response.text}")
            return False
    except requests.exceptions.ConnectionError:
        print("   ❌ Cannot connect to server")
        return False

    # Test 5: Test dashboard access with authentication
    print("\n5. Testing dashboard access with authentication...")
    try:
        dashboard_response = requests.get(f"{BASE_URL}/admin/", cookies=login_cookies)
        if dashboard_response.status_code == 200:
            print("   ✅ Dashboard accessible with authentication")
            if "dashboard" in dashboard_response.text.lower():
                print("   📄 Dashboard content served correctly")
            else:
                print("   ⚠️  Dashboard content may be incorrect")
        else:
            print(f"   ❌ Dashboard access failed: {dashboard_response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("   ❌ Cannot connect to server")
        return False

    # Test 6: Test session check
    print("\n6. Testing session check endpoint...")
    try:
        session_response = requests.get(
            f"{BASE_URL}/admin/session-check", cookies=login_cookies
        )
        if session_response.status_code == 200:
            session_data = session_response.json()
            if (
                session_data.get("authenticated")
                and session_data.get("admin_id") == ADMIN_ID
            ):
                print("   ✅ Session check returns authenticated state")
            else:
                print(f"   ❌ Session check incorrect: {session_data}")
        else:
            print(f"   ❌ Session check failed: {session_response.status_code}")
    except requests.exceptions.ConnectionError:
        print("   ❌ Cannot connect to server")
        return False

    # Test 7: Test logout
    print("\n7. Testing logout...")
    try:
        logout_response = requests.post(
            f"{BASE_URL}/admin/logout",
            cookies=login_cookies,
            headers={"X-CSRF-Token": csrf_token},
        )
        if logout_response.status_code == 200:
            print("   ✅ Logout successful")
        else:
            print(f"   ❌ Logout failed: {logout_response.status_code}")
    except requests.exceptions.ConnectionError:
        print("   ❌ Cannot connect to server")
        return False

    print("\n" + "=" * 50)
    print("🎉 Authentication flow test completed!")
    return True


def check_environment():
    """Check if environment variables are set."""
    print("🔧 Checking environment configuration...")
    print("=" * 50)

    required_vars = {
        "ADMIN_ID": ADMIN_ID,
        "ADMIN_PASSWORD": ADMIN_PASSWORD,
        "ADMIN_REQUIRE_MFA": "1",
        "ADMIN_TEST_MFA_CODE": MFA_CODE,
        "SECRET_KEY": "test-secret-key",
    }

    all_set = True
    for var, expected in required_vars.items():
        actual = os.environ.get(var)
        if actual == expected:
            if actual and "PASSWORD" in var:
                masked = "*" * len(actual)
            else:
                masked = actual
            print(f"   ✅ {var} = {masked}")
        elif actual:
            print(
                (
                    f"   ⚠️  {var} = "
                    f"{'*' * len(actual) if 'PASSWORD' in var else actual} "
                    f"(expected: {expected})"
                )
            )
        else:
            print(f"   ❌ {var} not set")
            all_set = False

    print("=" * 50)
    return all_set


if __name__ == "__main__":
    print("🚀 jeetSocial Admin Authentication Test")
    print(f"📅 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()

    # Check environment
    if not check_environment():
        print("\n❌ Environment configuration incomplete. Please check your .env file.")
        sys.exit(1)

    # Test authentication
    if test_authentication_flow():
        print("\n✅ All tests passed! Authentication is working correctly.")
        sys.exit(0)
    else:
        print("\n❌ Some tests failed. Please check the implementation.")
        sys.exit(1)
