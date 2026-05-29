

# Créer le script d'import complet pour le projet MFWA MTI
# Basé sur le schéma SQL (Option A) et le CSV Kobo

script_content = '''#!/usr/bin/env python3
"""
load_kobo_mti.py
Charge les données CSV Kobo Toolbox dans PostgreSQL (schéma MFWA MTI)
Utilise docker exec pour éviter les problèmes de connexion TCP sur Mac
Usage: python3 load_kobo_mti.py --file kobo_data.csv
"""

import csv
import argparse
import subprocess
import json
from datetime import datetime
import sys
import re

# Configuration PostgreSQL (Docker)
DB_USER = "postgres"
DB_NAME = "mfwa_mti"
DB_CONTAINER = "odk_postgres"

# Mapping des colonnes CSV Kobo vers le schéma SQL
# Le CSV utilise des noms de colonnes avec espaces et guillemets
COLUMN_MAP = {
    # Respondent info
    'Interview ID': 'interview_id',
    'Enumerator ID': 'enumerator_id',
    'Region': 'region',
    'District / MMDA': 'district',
    'Community / locality': 'community',
    'Urban or rural': 'residence_type',
    'Age (completed years)': 'age',
    'Sex': 'sex',
    'Education level': 'education',
    'Employment status': 'employment',
    'Internet access frequency': 'internet_access',
    'Main language for news': 'news_language',
    'Working radio in household?': 'hh_radio',
    'Working TV in household?': 'hh_tv',
    'How interested in news?': 'news_interest',
    'Days followed news (last 7)': 'news_days_7',
    'Used radio (last 7 days)?': 'use_radio',
    'How often radio?': 'radio_freq',
    'Used TV (last 7 days)?': 'use_tv',
    'How often TV?': 'tv_freq',
    'Used online (last 7 days)?': 'use_online',
    'How often online?': 'online_freq',
    'Used social media (last 7 days)?': 'use_social',
    'How often social media?': 'social_freq',
    'Interview start time': 'started_at',
    'Interview end time': 'completed_at',
    'Interview date': 'interview_date',

    # Outlet ratings
    'Which outlet do you trust most?': 'outlet_name',
    'Trust this outlet (0-10)?': 'overall_trust',
    'Gives accurate information': 'accuracy',
    'Verifies info before publishing': 'verification',
    'Fair and balanced': 'fair_balanced',
    'Independent from politics': 'independence',
    'Serves public interest': 'public_interest',
    'Corrects mistakes': 'corrections',
    'Political alignment': 'political_alignment',
    'Political interests shape content?': 'political_influence_freq',
}

# Mapping Likert → score numérique (1-5)
LIKERT_MAP = {
    'strongly agree': 5,
    'agree': 4,
    'neither agree nor disagree': 3,
    'disagree': 2,
    'strongly disagree': 1,
}

# Mapping booléens
BOOL_MAP = {
    'yes': True, 'oui': True, 'no': False, 'non': False,
    'true': True, 'false': False,
}

# Mapping fréquence
FREQ_MAP = {
    'always': 'always', 'often': 'often', 'sometimes': 'sometimes',
    'rarely': 'rarely', 'never': 'never',
}

# Mapping alignement politique
ALIGNMENT_MAP = {
    'ndc-aligned': 'ndc', 'npp-aligned': 'npp', 'independent': 'independent',
    'dk': 'dk', "don\\'t know": 'dk', 'dont know': 'dk',
}

def run_docker_sql(sql_command, fetch=True):
    """Exécuter une commande SQL via docker exec"""
    try:
        # Échapper les apostrophes pour le shell
        safe_sql = sql_command.replace("'", "'\\''")
        cmd = f"docker exec {DB_CONTAINER} psql -U {DB_USER} -d {DB_NAME} -c '{safe_sql}'"
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=30)
        return result.returncode, result.stdout.strip(), result.stderr.strip()
    except Exception as e:
        return 1, "", str(e)

def run_docker_sql_file(sql_file_content):
    """Exécuter un bloc SQL via docker exec avec heredoc"""
    try:
        # Créer un fichier temp dans le container
        cmd = f"docker exec {DB_CONTAINER} psql -U {DB_USER} -d {DB_NAME} -c \"{sql_file_content.replace(chr(34), chr(92)+chr(34))}\""
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=30)
        return result.returncode, result.stdout.strip(), result.stderr.strip()
    except Exception as e:
        return 1, "", str(e)

def parse_likert(value):
    """Convertir une réponse Likert en score 1-5"""
    if not value:
        return None
    val = value.strip().lower()
    return LIKERT_MAP.get(val)

def parse_bool(value):
    """Convertir une réponse oui/non en booléen"""
    if not value:
        return None
    val = value.strip().lower()
    return BOOL_MAP.get(val)

def parse_freq(value):
    """Convertir une fréquence"""
    if not value:
        return None
    val = value.strip().lower()
    return FREQ_MAP.get(val)

def parse_alignment(value):
    """Convertir l'alignement politique"""
    if not value:
        return None
    val = value.strip().lower()
    return ALIGNMENT_MAP.get(val, val)

def get_or_create_region(region_name):
    """Récupérer ou créer une région"""
    sql = f"SELECT id FROM regions WHERE name = '{region_name}' LIMIT 1;"
    rc, out, err = run_docker_sql(sql)

    if rc == 0 and out:
        lines = out.strip().split('\\n')
        for line in lines:
            line = line.strip()
            if line.isdigit():
                return int(line)

    # Créer la région si elle n'existe pas
    sql = f"INSERT INTO regions (name) VALUES ('{region_name}') RETURNING id;"
    rc, out, err = run_docker_sql(sql)

    if rc == 0 and out:
        lines = out.strip().split('\\n')
        for line in lines:
            line = line.strip()
            if line.isdigit():
                return int(line)

    return None

def get_or_create_district(district_name, region_id):
    """Récupérer ou créer un district"""
    if not district_name:
        return None

    sql = f"SELECT id FROM districts WHERE name = '{district_name}' AND region_id = {region_id} LIMIT 1;"
    rc, out, err = run_docker_sql(sql)

    if rc == 0 and out:
        lines = out.strip().split('\\n')
        for line in lines:
            line = line.strip()
            if line.isdigit():
                return int(line)

    # Créer le district
    sql = f"INSERT INTO districts (name, region_id) VALUES ('{district_name}', {region_id}) RETURNING id;"
    rc, out, err = run_docker_sql(sql)

    if rc == 0 and out:
        lines = out.strip().split('\\n')
        for line in lines:
            line = line.strip()
            if line.isdigit():
                return int(line)

    return None

def get_or_create_outlet(outlet_name, region_id=None):
    """Récupérer ou créer un outlet"""
    # Nettoyer le nom
    clean_name = outlet_name.strip()
    if '(' in clean_name:
        clean_name = clean_name.split('(')[0].strip()

    sql = f"SELECT id FROM outlets WHERE name = '{clean_name}' LIMIT 1;"
    rc, out, err = run_docker_sql(sql)

    if rc == 0 and out:
        lines = out.strip().split('\\n')
        for line in lines:
            line = line.strip()
            if line.isdigit():
                return int(line)

    # Créer l'outlet
    outlet_type = 'radio' if 'fm' in clean_name.lower() or 'radio' in clean_name.lower() else 'unknown'
    sql = f"INSERT INTO outlets (name, outlet_type, region_id, is_active) VALUES ('{clean_name}', '{outlet_type}', {region_id if region_id else 'NULL'}, true) RETURNING id;"
    rc, out, err = run_docker_sql(sql)

    if rc == 0 and out:
        lines = out.strip().split('\\n')
        for line in lines:
            line = line.strip()
            if line.isdigit():
                return int(line)

    return None

def load_kobo_csv(csv_file):
    """Charge le fichier CSV et insère les données dans PostgreSQL"""

    print(f"📊 Lecture de {csv_file}...")

    # Lire le CSV avec délimiteur ;
    try:
        with open(csv_file, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f, delimiter=';')
            rows = list(reader)
    except Exception as e:
        print(f"❌ Erreur lecture CSV: {e}")
        sys.exit(1)

    print(f"✅ {len(rows)} réponse(s) trouvée(s)")

    if len(rows) == 0:
        print("⚠️  CSV vide")
        sys.exit(1)

    # Afficher les colonnes trouvées
    print(f"\\n📋 Colonnes trouvées:")
    for col in rows[0].keys():
        mapped = COLUMN_MAP.get(col, '---')
        print(f"   {col[:50]:<50} → {mapped}")

    success_count = 0
    error_count = 0

    for idx, row in enumerate(rows, 1):
        print(f"\\n📝 Traitement réponse {idx}/{len(rows)}")

        try:
            # === 1. EXTRAIRE LES DONNÉES ===

            # Respondent
            interview_id = row.get('Interview ID', f'INT_{idx}')
            enumerator_id = row.get('Enumerator ID', '')
            region_name = row.get('Region', 'Unknown')
            district_name = row.get('District / MMDA', '')
            community = row.get('Community / locality', '')
            residence_type = row.get('Urban or rural', '').lower()

            age = row.get('Age (completed years)', '')
            age = int(age) if age.isdigit() else None

            sex = row.get('Sex', '').lower()
            education = row.get('Education level', '')
            employment = row.get('Employment status', '')
            internet_access = row.get('Internet access frequency', '')
            news_language = row.get('Main language for news', '')

            hh_radio = parse_bool(row.get('Working radio in household?', ''))
            hh_tv = parse_bool(row.get('Working TV in household?', ''))

            news_interest = row.get('How interested in news?', '').lower().replace(' ', '_')
            news_days_7 = row.get('Days followed news (last 7)', '')
            news_days_7 = int(news_days_7) if news_days_7.isdigit() else None

            use_radio = parse_bool(row.get('Used radio (last 7 days)?', ''))
            radio_freq = parse_freq(row.get('How often radio?', ''))
            use_tv = parse_bool(row.get('Used TV (last 7 days)?', ''))
            tv_freq = parse_freq(row.get('How often TV?', ''))
            use_online = parse_bool(row.get('Used online (last 7 days)?', ''))
            online_freq = parse_freq(row.get('How often online?', ''))
            use_social = parse_bool(row.get('Used social media (last 7 days)?', ''))
            social_freq = parse_freq(row.get('How often social media?', ''))

            # Dates
            interview_date = row.get('Interview date', '')
            started_at = row.get('Interview start time', '')
            completed_at = row.get('Interview end time', '')

            # Outlet
            outlet_name = row.get('Which outlet do you trust most?', f'Outlet_{idx}')
            overall_trust = row.get('Trust this outlet (0-10)?', '')
            overall_trust = int(overall_trust) if overall_trust.isdigit() else None

            # Dimensions MTI (Likert 1-5)
            accuracy = parse_likert(row.get('Gives accurate information', ''))
            verification = parse_likert(row.get('Verifies info before publishing', ''))
            fair_balanced = parse_likert(row.get('Fair and balanced', ''))
            independence = parse_likert(row.get('Independent from politics', ''))
            public_interest = parse_likert(row.get('Serves public interest', ''))
            corrections = parse_likert(row.get('Corrects mistakes', ''))

            political_alignment = parse_alignment(row.get('Political alignment', ''))
            political_influence = parse_freq(row.get('Political interests shape content?', ''))

            print(f"   ✓ Outlet: {outlet_name}")
            print(f"   ✓ Région: {region_name}")
            print(f"   ✓ Dimensions: accuracy={accuracy}, verification={verification}, fair={fair_balanced}, indep={independence}, public={public_interest}, corr={corrections}")

            # === 2. INSÉRER DANS POSTGRESQL ===

            # Récupérer/créer région
            region_id = get_or_create_region(region_name)
            if not region_id:
                print(f"   ⚠️  Impossible de créer la région {region_name}")
                error_count += 1
                continue

            # Récupérer/créer district
            district_id = get_or_create_district(district_name, region_id)

            # Récupérer/créer outlet
            outlet_id = get_or_create_outlet(outlet_name, region_id)
            if not outlet_id:
                print(f"   ⚠️  Impossible de créer l'outlet {outlet_name}")
                error_count += 1
                continue

            # Insérer respondent
            # Construire la requête SQL pour respondent
            respondent_sql = f"""
                INSERT INTO respondents (
                    interview_id, enumerator_id, region_id, district_id, residence_type,
                    age, sex, education, employment, internet_access, news_language,
                    hh_radio, hh_tv, news_interest, news_days_7,
                    use_radio, radio_freq, use_tv, tv_freq, use_online, online_freq, use_social, social_freq,
                    interview_date, started_at, completed_at, is_complete
                ) VALUES (
                    '{interview_id}', '{enumerator_id}', {region_id}, {district_id if district_id else 'NULL'}, '{residence_type}',
                    {age if age else 'NULL'}, '{sex}', '{education}', '{employment}', '{internet_access}', '{news_language}',
                    {hh_radio if hh_radio is not None else 'NULL'}, {hh_tv if hh_tv is not None else 'NULL'}, '{news_interest}', {news_days_7 if news_days_7 else 'NULL'},
                    {use_radio if use_radio is not None else 'NULL'}, '{radio_freq if radio_freq else ''}', {use_tv if use_tv is not None else 'NULL'}, '{tv_freq if tv_freq else ''}', {use_online if use_online is not None else 'NULL'}, '{online_freq if online_freq else ''}', {use_social if use_social is not None else 'NULL'}, '{social_freq if social_freq else ''}',
                    '{interview_date}', '{started_at}', '{completed_at}', true
                )
                ON CONFLICT (interview_id) DO UPDATE SET
                    enumerator_id = EXCLUDED.enumerator_id,
                    region_id = EXCLUDED.region_id,
                    district_id = EXCLUDED.district_id,
                    completed_at = EXCLUDED.completed_at,
                    is_complete = true
                RETURNING id;
            """

            rc, out, err = run_docker_sql(respondent_sql)

            respondent_id = None
            if rc == 0 and out:
                lines = out.strip().split('\\n')
                for line in lines:
                    line = line.strip()
                    if line.isdigit():
                        respondent_id = int(line)
                        break

            if not respondent_id:
                print(f"   ⚠️  Erreur insertion respondent: {err}")
                error_count += 1
                continue

            print(f"   ✓ Respondent ID: {respondent_id}")

            # Insérer outlet_ratings
            ratings_sql = f"""
                INSERT INTO outlet_ratings (
                    respondent_id, outlet_id, overall_trust,
                    accuracy, verification, fair_balanced, independence, public_interest, corrections,
                    political_alignment, political_influence_freq, is_primary_outlet
                ) VALUES (
                    {respondent_id}, {outlet_id}, {overall_trust if overall_trust else 'NULL'},
                    {accuracy if accuracy else 'NULL'}, {verification if verification else 'NULL'}, {fair_balanced if fair_balanced else 'NULL'}, {independence if independence else 'NULL'}, {public_interest if public_interest else 'NULL'}, {corrections if corrections else 'NULL'},
                    '{political_alignment if political_alignment else ''}', '{political_influence if political_influence else ''}', true
                )
                ON CONFLICT (respondent_id, outlet_id) DO UPDATE SET
                    overall_trust = EXCLUDED.overall_trust,
                    accuracy = EXCLUDED.accuracy,
                    verification = EXCLUDED.verification,
                    fair_balanced = EXCLUDED.fair_balanced,
                    independence = EXCLUDED.independence,
                    public_interest = EXCLUDED.public_interest,
                    corrections = EXCLUDED.corrections,
                    political_alignment = EXCLUDED.political_alignment,
                    political_influence_freq = EXCLUDED.political_influence_freq
                RETURNING id;
            """

            rc, out, err = run_docker_sql(ratings_sql)

            if rc != 0:
                print(f"   ⚠️  Erreur insertion ratings: {err}")
                error_count += 1
                continue

            print(f"   ✓ Ratings insérés")
            success_count += 1

        except Exception as e:
            print(f"   ❌ Erreur: {str(e)}")
            error_count += 1
            continue

    # === 3. CALCULER LES INDICES MTI ===
    print(f"\\n🔢 Calcul des indices MTI...")
    calc_sql = "SELECT * FROM calculate_outlet_indices();"
    rc, out, err = run_docker_sql(calc_sql)

    if rc == 0:
        print(f"✅ Indices MTI calculés")
    else:
        print(f"⚠️  Erreur calcul MTI: {err}")

    # === 4. RÉSUMÉ ===
    print(f"\\n{'='*60}")
    print(f"📊 RÉSUMÉ")
    print(f"{'='*60}")
    print(f"✅ Réponses traitées avec succès: {success_count}")
    print(f"❌ Erreurs: {error_count}")

    # Vérifier les données dans la base
    verify_sql = "SELECT COUNT(*) FROM respondents;"
    rc, out, err = run_docker_sql(verify_sql)
    if rc == 0 and out:
        print(f"\\n📋 Vérification base de données:")
        for line in out.strip().split('\\n'):
            if line.strip().isdigit():
                print(f"   Respondents: {line.strip()}")

    verify_sql = "SELECT COUNT(*) FROM outlet_ratings;"
    rc, out, err = run_docker_sql(verify_sql)
    if rc == 0 and out:
        for line in out.strip().split('\\n'):
            if line.strip().isdigit():
                print(f"   Outlet ratings: {line.strip()}")

    verify_sql = "SELECT COUNT(*) FROM outlet_indices;"
    rc, out, err = run_docker_sql(verify_sql)
    if rc == 0 and out:
        for line in out.strip().split('\\n'):
            if line.strip().isdigit():
                print(f"   Outlet indices (MTI): {line.strip()}")

    # Afficher le classement MTI
    print(f"\\n🏆 CLASSEMENT MTI:")
    rank_sql = "SELECT name, mti_score, mti_rank, respondent_count FROM v_outlet_rankings WHERE mti_score IS NOT NULL;"
    rc, out, err = run_docker_sql(rank_sql)
    if rc == 0 and out:
        lines = out.strip().split('\\n')
        for line in lines[2:]:  # Skip header lines
            parts = line.split('|')
            if len(parts) >= 4:
                name = parts[0].strip()
                mti = parts[1].strip()
                rank = parts[2].strip()
                count = parts[3].strip()
                print(f"   #{rank} {name}: MTI={mti} (N={count})")

    print(f"\\n✅ Import terminé!")

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Charge les données CSV Kobo dans PostgreSQL (schéma MFWA MTI)')
    parser.add_argument('--file', '-f', required=True, help='Chemin du fichier CSV Kobo')
    args = parser.parse_args()

    load_kobo_csv(args.file)
'''

# Sauvegarder le script
with open('/mnt/agents/output/load_kobo_mti.py', 'w') as f:
    f.write(script_content)

print("✅ Script load_kobo_mti.py créé avec succès!")
print(f"📁 Emplacement: /mnt/agents/output/load_kobo_mti.py")
print(f"📊 Taille: {len(script_content)} caractères")