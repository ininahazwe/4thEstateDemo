#!/usr/bin/env python3
"""
MTI Database Setup - Creates tables and imports test data
Run: python3 setup_database.py
"""

import psycopg2
from psycopg2 import sql
import sys

# Database connection config
DB_CONFIG = {
    'host': 'localhost',
    'port': 5432,
    'database': 'odk_mti',
    'user': 'odk',
    'password': 'odk2026'
}

def create_schema(conn):
    """Create database schema"""
    cur = conn.cursor()

    print("📋 Creating tables...")

    try:
        # Drop existing tables if any (for fresh start)
        cur.execute("DROP TABLE IF EXISTS response_details CASCADE;")
        cur.execute("DROP TABLE IF EXISTS respondents CASCADE;")
        cur.execute("DROP TABLE IF EXISTS outlets CASCADE;")

        # Create outlets table
        cur.execute("""
            CREATE TABLE outlets (
                outlet_id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL UNIQUE,
                region VARCHAR(100),
                mti_score DECIMAL(5, 2) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        print("  ✅ outlets table created")

        # Create respondents table
        cur.execute("""
            CREATE TABLE respondents (
                respondent_id SERIAL PRIMARY KEY,
                outlet_id INTEGER NOT NULL REFERENCES outlets(outlet_id),
                respondent_name VARCHAR(255),
                respondent_email VARCHAR(255),
                survey_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        print("  ✅ respondents table created")

        # Create response_details table
        cur.execute("""
            CREATE TABLE response_details (
                response_id SERIAL PRIMARY KEY,
                respondent_id INTEGER NOT NULL REFERENCES respondents(respondent_id),
                dimension VARCHAR(100),
                score DECIMAL(5, 2),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        print("  ✅ response_details table created")

        # Create MTI calculation function
        cur.execute("""
            CREATE OR REPLACE FUNCTION calculate_mti_score(p_outlet_id INTEGER)
            RETURNS DECIMAL(5, 2) AS $$
            BEGIN
                RETURN (
                    SELECT ROUND(
                        (COALESCE(AVG(CASE WHEN dimension = 'accuracy' THEN score ELSE NULL END), 0) * 0.20) +
                        (COALESCE(AVG(CASE WHEN dimension = 'verification' THEN score ELSE NULL END), 0) * 0.20) +
                        (COALESCE(AVG(CASE WHEN dimension = 'independence' THEN score ELSE NULL END), 0) * 0.20) +
                        (COALESCE(AVG(CASE WHEN dimension = 'fair_balanced' THEN score ELSE NULL END), 0) * 0.15) +
                        (COALESCE(AVG(CASE WHEN dimension = 'public_interest' THEN score ELSE NULL END), 0) * 0.15) +
                        (COALESCE(AVG(CASE WHEN dimension = 'corrections' THEN score ELSE NULL END), 0) * 0.10), 2
                    )
                    FROM response_details rd
                    INNER JOIN respondents r ON rd.respondent_id = r.respondent_id
                    WHERE r.outlet_id = p_outlet_id
                );
            END;
            $$ LANGUAGE plpgsql;
        """)
        print("  ✅ calculate_mti_score function created")

        conn.commit()
        cur.close()
        return True

    except Exception as e:
        print(f"  ❌ Error creating schema: {e}")
        conn.rollback()
        cur.close()
        return False

def import_test_data(conn):
    """Import sample outlets"""
    cur = conn.cursor()

    print("\n📊 Importing test data...")

    outlets = [
        ('CitiFM', 'Greater Accra'),
        ('Adom FM', 'Ashanti'),
        ('Starr FM', 'Greater Accra'),
        ('UTV', 'Greater Accra'),
        ('TV3', 'Greater Accra'),
        ('Oman FM', 'Ashanti'),
        ('Peace FM', 'Greater Accra'),
        ('Metro FM', 'Greater Accra'),
        ('Kasapa FM', 'Greater Accra'),
        ('JoyFM', 'Greater Accra'),
        ('Rainbow FM', 'Ashanti'),
    ]

    try:
        for name, region in outlets:
            try:
                cur.execute(
                    "INSERT INTO outlets (name, region) VALUES (%s, %s)",
                    (name, region)
                )
                print(f"  ✅ Added: {name} ({region})")
            except psycopg2.IntegrityError:
                print(f"  ⚠️  {name} already exists, skipping")
                conn.rollback()

        conn.commit()

        # Add sample respondents and scores for CitiFM
        print("\n📝 Adding sample responses for CitiFM...")
        cur.execute("SELECT outlet_id FROM outlets WHERE name = 'CitiFM'")
        result = cur.fetchone()

        if result:
            outlet_id = result[0]

            # Create a sample respondent
            cur.execute(
                "INSERT INTO respondents (outlet_id, respondent_name, respondent_email) VALUES (%s, %s, %s) RETURNING respondent_id",
                (outlet_id, 'John Doe', 'john@citiradio.com')
            )
            respondent_id = cur.fetchone()[0]
            print(f"  ✅ Added respondent: John Doe (ID: {respondent_id})")

            # Add dimension scores (MTI framework: 6 dimensions)
            dimensions_scores = [
                ('accuracy', 45),
                ('verification', 50),
                ('independence', 55),
                ('fair_balanced', 48),
                ('public_interest', 52),
                ('corrections', 40),
            ]

            for dimension, score in dimensions_scores:
                cur.execute(
                    "INSERT INTO response_details (respondent_id, dimension, score) VALUES (%s, %s, %s)",
                    (respondent_id, dimension, score)
                )
                print(f"    ✅ {dimension}: {score}/100")

            conn.commit()

            # Calculate and update MTI score
            cur.execute(
                "SELECT calculate_mti_score(%s)",
                (outlet_id,)
            )
            mti_score = cur.fetchone()[0]

            cur.execute(
                "UPDATE outlets SET mti_score = %s WHERE outlet_id = %s",
                (mti_score, outlet_id)
            )
            conn.commit()

            print(f"\n  ✅ CitiFM MTI Score calculated: {mti_score}")

        cur.close()
        return True

    except Exception as e:
        print(f"  ❌ Error importing data: {e}")
        conn.rollback()
        cur.close()
        return False

def verify_setup(conn):
    """Verify database setup"""
    cur = conn.cursor()

    print("\n✅ Verification:")

    try:
        cur.execute("SELECT COUNT(*) FROM outlets")
        outlet_count = cur.fetchone()[0]
        print(f"  • Outlets: {outlet_count}")

        cur.execute("SELECT COUNT(*) FROM respondents")
        respondent_count = cur.fetchone()[0]
        print(f"  • Respondents: {respondent_count}")

        cur.execute("SELECT COUNT(*) FROM response_details")
        response_count = cur.fetchone()[0]
        print(f"  • Response details: {response_count}")

        cur.execute("SELECT name, mti_score FROM outlets WHERE mti_score > 0 ORDER BY mti_score DESC")
        scored_outlets = cur.fetchall()
        if scored_outlets:
            print(f"  • Outlets with scores:")
            for name, score in scored_outlets:
                print(f"    - {name}: {score}")

        cur.close()
        return True

    except Exception as e:
        print(f"  ❌ Verification error: {e}")
        cur.close()
        return False

def main():
    """Main setup function"""
    print("=" * 60)
    print("🚀 MTI Database Setup")
    print("=" * 60)

    try:
        print(f"\n📍 Connecting to: {DB_CONFIG['host']}:{DB_CONFIG['port']}/{DB_CONFIG['database']}")
        conn = psycopg2.connect(**DB_CONFIG)
        print("✅ Connected!")

        if not create_schema(conn):
            print("\n❌ Failed to create schema")
            return 1

        if not import_test_data(conn):
            print("\n❌ Failed to import data")
            return 1

        if not verify_setup(conn):
            print("\n⚠️  Verification issues")

        conn.close()

        print("\n" + "=" * 60)
        print("✅ Database setup complete!")
        print("=" * 60)
        print("\nYou can now:")
        print("  1. Start Flask API: python api.py")
        print("  2. Open dashboard: http://localhost:3000")
        return 0

    except psycopg2.OperationalError as e:
        print(f"\n❌ Database connection error: {e}")
        print("\nMake sure:")
        print("  • PostgreSQL is running: brew services list | grep postgres")
        print("  • Database 'odk_mti' exists")
        print("  • User 'odk' with password 'odk2026' exists")
        return 1
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        return 1

if __name__ == '__main__':
    sys.exit(main())