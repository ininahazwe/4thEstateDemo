import psycopg2
import sys

# CONFIGURATION DU PORT DOCKER
DB_CONFIG = {
    'host': '127.0.0.1',
    'port': 5433,        # On utilise le port du tunnel
    'database': 'odk_mti',
    'user': 'postgres',
    'password': 'postgres'
}

def import_now():
    conn = None
    try:
        print("--- Tentative Port 5433 ---")
        conn = psycopg2.connect(**DB_CONFIG, connect_timeout=5)
        cur = conn.cursor()
        print("✅ CONNEXION RÉUSSIE !")

        # SQL d'insertion rapide pour CitiFM
        cur.execute("INSERT INTO regions (name) VALUES ('Greater Accra') ON CONFLICT DO NOTHING;")
        cur.execute("INSERT INTO outlets (name, region_id) SELECT 'CitiFM', id FROM regions WHERE name='Greater Accra' ON CONFLICT DO NOTHING;")
        cur.execute("UPDATE outlet_indices SET mti_score = 50.0 WHERE outlet_id = (SELECT id FROM outlets WHERE name='CitiFM');")

        conn.commit()
        print("🚀 Données injectées !")
    except Exception as e:
        # On force l'affichage sans crash d'encodage
        print(f"❌ Erreur réelle : {e}".encode('ascii', 'replace').decode())
    finally:
        if conn: conn.close()

if __name__ == "__main__":
    import_now()