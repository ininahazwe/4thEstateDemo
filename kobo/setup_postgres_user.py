#!/usr/bin/env python3
"""
Setup PostgreSQL user and database - Initial setup script
Run: python3 setup_postgres_user.py
"""

import psycopg2
from psycopg2 import sql, OperationalError
import sys

def create_user_and_db():
    """Create user 'odk' and database 'odk_mti'"""

    # Try different connection approaches
    connection_attempts = [
        # Try default postgres user
        {
            'host': 'localhost',
            'port': 5432,
            'user': 'postgres',
            'password': '',
            'database': 'postgres'
        },
        # Try with no password, trust auth
        {
            'host': 'localhost',
            'port': 5432,
            'user': 'postgres',
            'database': 'postgres'
        },
        # Try current user (may work with peer auth)
        {
            'host': 'localhost',
            'port': 5432,
            'database': 'postgres'
        },
    ]

    conn = None
    for attempt_num, config in enumerate(connection_attempts, 1):
        try:
            print(f"🔍 Connection attempt {attempt_num}...", end=" ")
            # Remove empty password if not needed
            if 'password' in config and not config['password']:
                del config['password']

            conn = psycopg2.connect(**config)
            print("✅")
            break
        except OperationalError as e:
            print(f"❌ ({str(e)[:50]}...)")

    if not conn:
        print("\n❌ Could not connect to PostgreSQL")
        print("\nTroubleshooting:")
        print("1. Ensure PostgreSQL is running: brew services list")
        print("2. Check PostgreSQL installation: psql --version")
        print("3. Verify socket location: ls /tmp/.s.PGSQL.5432")
        return False

    print("✅ Connected to PostgreSQL!")
    cur = conn.cursor()

    try:
        # Check if 'odk' user already exists
        print("\n📋 Checking for existing user 'odk'...")
        cur.execute("SELECT 1 FROM pg_user WHERE usename = 'odk'")
        if cur.fetchone():
            print("  ⚠️  User 'odk' already exists")
        else:
            print("  Creating user 'odk'...")
            cur.execute("CREATE USER odk WITH PASSWORD 'odk2026'")
            print("  ✅ User 'odk' created")

        # Check if database already exists
        print("\n📋 Checking for existing database 'odk_mti'...")
        cur.execute("SELECT 1 FROM pg_database WHERE datname = 'odk_mti'")
        if cur.fetchone():
            print("  ⚠️  Database 'odk_mti' already exists")
        else:
            print("  Creating database 'odk_mti'...")
            # Must commit before creating database
            conn.commit()
            cur.close()
            conn.close()

            # Reconnect and create DB
            conn = psycopg2.connect(**connection_attempts[0])
            cur = conn.cursor()
            cur.execute("CREATE DATABASE odk_mti OWNER odk")
            print("  ✅ Database 'odk_mti' created")

        # Grant privileges
        print("\n📋 Granting privileges...")
        cur.execute("ALTER ROLE odk CREATEDB")
        cur.execute("GRANT ALL PRIVILEGES ON DATABASE odk_mti TO odk")
        print("  ✅ Privileges granted")

        conn.commit()
        print("\n✅ User and database setup complete!")

        # Test new connection
        print("\n🧪 Testing connection with new credentials...")
        try:
            test_conn = psycopg2.connect(
                host='localhost',
                port=5432,
                database='odk_mti',
                user='odk',
                password='odk2026'
            )
            test_conn.close()
            print("✅ Connection test successful!")
            return True
        except Exception as e:
            print(f"⚠️  Connection test failed: {e}")
            return False

    except Exception as e:
        print(f"❌ Error: {e}")
        return False
    finally:
        cur.close()
        conn.close()

if __name__ == '__main__':
    print("=" * 50)
    print("🚀 PostgreSQL Initial Setup")
    print("=" * 50)

    success = create_user_and_db()

    if success:
        print("\n" + "=" * 50)
        print("✅ Ready for database initialization!")
        print("=" * 50)
        print("\nNext step:")
        print("  python3 setup_database.py")
        sys.exit(0)
    else:
        sys.exit(1)