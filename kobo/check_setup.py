#!/usr/bin/env python
"""
Test script pour vérifier que tout est prêt avant de lancer l'API
"""

import sys

print("\n" + "="*60)
print("🔍 MFWA MTI - Pre-Flight Checks")
print("="*60 + "\n")

# Test 1: Python version
print("1️⃣  Python version...")
py_version = f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}"
if sys.version_info >= (3, 9):
    print(f"   ✅ Python {py_version} (OK)")
else:
    print(f"   ❌ Python {py_version} (Besoin 3.9+)")
    sys.exit(1)

# Test 2: psycopg2
print("\n2️⃣  psycopg2 module...")
try:
    import psycopg2
    print(f"   ✅ psycopg2 {psycopg2.__version__} (Installé)")
except ImportError:
    print("   ❌ psycopg2 NOT installed")
    print("   Solution: pip install psycopg2-binary==2.9.12")
    sys.exit(1)

# Test 3: Flask
print("\n3️⃣  Flask & CORS...")
try:
    import flask
    import flask_cors
    print(f"   ✅ Flask {flask.__version__} (OK)")
    print(f"   ✅ Flask-CORS (OK)")
except ImportError as e:
    print(f"   ❌ Missing: {e}")
    sys.exit(1)

# Test 4: Other imports
print("\n4️⃣  Other dependencies...")
try:
    import requests
    import dotenv
    print(f"   ✅ requests (OK)")
    print(f"   ✅ python-dotenv (OK)")
except ImportError as e:
    print(f"   ❌ Missing: {e}")
    sys.exit(1)

# Test 5: PostgreSQL connection
print("\n5️⃣  PostgreSQL connection...")
try:
    conn = psycopg2.connect(
        host='localhost',
        port=5433,
        user='postgres',
        password='postgres',
        database='odk_mti',
        connect_timeout=5
    )
    print("   ✅ Connected to localhost:5433")

    # Check tables
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM outlets")
    count = cur.fetchone()[0]
    print(f"   ✅ outlets table exists ({count} records)")

    cur.execute("SELECT COUNT(*) FROM outlet_indices")
    count = cur.fetchone()[0]
    print(f"   ✅ outlet_indices table exists ({count} records)")

    conn.close()
except psycopg2.OperationalError as e:
    print(f"   ❌ Connection failed: {e}")
    print("   → Docker + PostgreSQL not running?")
    print("   → Run: docker-compose up -d")
    sys.exit(1)
except psycopg2.ProgrammingError as e:
    print(f"   ❌ SQL Error: {e}")
    print("   → Tables not initialized?")
    sys.exit(1)

print("\n" + "="*60)
print("✅ ALL CHECKS PASSED!")
print("="*60)
print("\nYou can now run: python api_simple.py")
print("="*60 + "\n")