import psycopg2

try:
    print("Tentative de connexion au port 5432...")
    conn = psycopg2.connect(
        host="127.0.0.1",
        port=5433,
        user="postgres",
        password="postgres",
        database="odk_mti",
        connect_timeout=3
    )
    print("✅ CA MARCHE !")
    conn.close()
except Exception as e:
    print("❌ ERREUR DE CONNEXION")
    # On affiche l'erreur proprement sans crash d'encodage
    import traceback
    traceback.print_exc()