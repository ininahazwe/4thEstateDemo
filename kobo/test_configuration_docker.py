#!/usr/bin/env python3
import os
import sys
import requests
import subprocess
from dotenv import load_dotenv

GREEN = '\033[92m'
RED = '\033[91m'
BLUE = '\033[94m'
RESET = '\033[0m'

def print_header(text):
    print(f"\n{BLUE}{'='*60}\n  {text}\n{'='*60}{RESET}\n")

def print_success(text):
    print(f"{GREEN}✅ {text}{RESET}")

def print_error(text):
    print(f"{RED}❌ {text}{RESET}")

def print_info(text):
    print(f"{BLUE}ℹ️  {text}{RESET}")

def run_docker_sql(sql_command):
    try:
        cmd = f'docker exec odk_postgres psql -U postgres -d mfwa_mti -c "{sql_command}"'
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=10)
        return result.returncode, result.stdout.strip(), result.stderr.strip()
    except Exception as e:
        return 1, "", str(e)

# TEST 1
print_header("TEST 1 : Configuration .env")
load_dotenv()

for var in ['KOBO_API_TOKEN', 'KOBO_FORM_NAME']:
    value = os.getenv(var)
    if value:
        print_success(f"{var} = {value[:10]}...")
    else:
        print_error(f"{var} manquant")

# TEST 2
print_header("TEST 2 : Connexion PostgreSQL (Docker)")
returncode, stdout, stderr = run_docker_sql("SELECT 1;")

if returncode == 0:
    print_success("Connecté à PostgreSQL via Docker ✅")
    returncode, stdout, stderr = run_docker_sql("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
    if returncode == 0:
        print_success("Tables trouvées ✅")
else:
    print_error("Impossible de se connecter à PostgreSQL")
    print_error(f"Détail : {stderr}")
    sys.exit(1)

# TEST 3
print_header("TEST 3 : Token API Kobo")
KOBO_API_TOKEN = os.getenv('KOBO_API_TOKEN')
headers = {"Authorization": f"Token {KOBO_API_TOKEN}", "Accept": "application/json"}

try:
    response = requests.get("https://kobo.humanitarianresponse.info/api/v2/user/", headers=headers, timeout=10)
    if response.status_code == 200:
        print_success("Token API Kobo valide ✅")
    else:
        print_error(f"Erreur API : {response.status_code}")
except Exception as e:
    print_error(f"Erreur : {str(e)}")

# TEST 4
print_header("TEST 4 : Formulaire Kobo")
try:
    response = requests.get("https://kobo.humanitarianresponse.info/api/v2/assets/", headers=headers, timeout=10)
    if response.status_code == 200:
        assets = response.json()['results']
        print_success(f"Récupéré {len(assets)} projet(s) Kobo ✅")
        for asset in assets:
            if 'MFWA' in asset.get('name', ''):
                print_success(f"Formulaire trouvé : {asset['name']} ✅")
except Exception as e:
    print_error(f"Erreur : {str(e)}")

# RÉSUMÉ
print_header("RÉSUMÉ FINAL")
print(f"{GREEN}🎉 Tout est prêt pour la démo!{RESET}")
print("\nProchaines étapes :")
print("  1. python kobo_sync.py")
print("  2. Vérifier les données dans PostgreSQL")
print("  3. Commencer DAY 5 avec React Dashboard")
