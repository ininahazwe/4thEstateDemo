"""
MFWA MTI Dashboard API - Windows Version
Port: 5001
DB: localhost:5433 (odk_mti)
"""

from flask import Flask, jsonify
from flask_cors import CORS
import psycopg2
from psycopg2.extras import RealDictCursor
import time

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

DB_CONFIG = {
    'host': 'localhost',
    'port': 5433,
    'database': 'odk_mti',
    'user': 'postgres',
    'password': 'postgres',
    'connect_timeout': 10
}

def get_db_connection():
    """Connexion avec retry"""
    for attempt in range(3):
        try:
            conn = psycopg2.connect(**DB_CONFIG)
            print(f"✅ DB connected (attempt {attempt + 1})")
            return conn
        except psycopg2.OperationalError as e:
            print(f"⚠️  Attempt {attempt + 1}/3 failed: {e}")
            if attempt < 2:
                time.sleep(2)
            else:
                return None

@app.route('/api/health', methods=['GET'])
def health():
    """Health check endpoint"""
    conn = get_db_connection()
    if conn:
        conn.close()
        return jsonify({'status': 'OK', 'db': 'connected'}), 200
    return jsonify({'status': 'ERROR', 'db': 'disconnected'}), 500

@app.route('/api/dashboard', methods=['GET'])
def dashboard():
    """Get all outlets with MTI scores"""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500

    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)

        query = """
            SELECT
                o.id,
                o.name,
                COALESCE(oi.mti_score, 0)::float as mti_score,
                COALESCE(oi.respondent_count, 0)::int as respondent_count,
                COALESCE(oi.accuracy, 0)::float as accuracy,
                COALESCE(oi.verification, 0)::float as verification,
                COALESCE(oi.independence, 0)::float as independence
            FROM outlets o
            LEFT JOIN outlet_indices oi ON o.id = oi.outlet_id
            ORDER BY COALESCE(oi.mti_score, 0) DESC
        """

        cur.execute(query)
        outlets = [dict(row) for row in cur.fetchall()]
        cur.close()
        conn.close()

        print(f"✅ Dashboard: {len(outlets)} outlets")
        return jsonify({'outlets': outlets, 'count': len(outlets)}), 200

    except Exception as e:
        print(f"❌ Error: {type(e).__name__}: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("\n" + "="*60)
    print("🚀 MFWA MTI Dashboard API (Windows)")
    print("="*60)
    print(f"Database: localhost:5433 (odk_mti)")
    print(f"API: http://localhost:5001")
    print("\nEndpoints:")
    print("  GET /api/health      - Check connection")
    print("  GET /api/dashboard   - Get all outlets")
    print("="*60 + "\n")

    app.run(host='0.0.0.0', port=5001, debug=True, use_reloader=False)