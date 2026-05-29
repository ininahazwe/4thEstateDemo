#!/usr/bin/env python3
"""
load_kobo_csv.py
Charge les données CSV de Kobo Toolbox dans PostgreSQL
Format: CSV avec délimiteur ';' (export Kobo Ghana MTI)
Usage: python3 load_kobo_csv.py --file data.csv
"""

import csv
import argparse
import psycopg2
from datetime import datetime
import sys
import re

# Configuration PostgreSQL
DB_CONFIG = {
    'host': 'localhost',
    'port': 5432,
    'user': 'odk',
    'password': 'odk2026',
    'database': 'mti_db'
}

# Mapping des colonnes CSV aux questions MTI
# Colonnes de confiance/évaluation media
MTI_COLUMN_MAP = {
    'Gives accurate information': ('accuracy', 'accuracy'),
    'Verifies info before publishing': ('verification', 'verification'),
    'Fair and balanced': ('fair_balanced', 'fair_balanced'),
    'Independent from politics': ('independence', 'independence'),
    'Serves public interest': ('public_interest', 'public_interest'),
    'Corrects mistakes': ('corrections', 'corrections'),
}

# Poids des dimensions (basés sur MFWA MTI)
DIMENSION_WEIGHTS = {
    'accuracy': 0.20,
    'verification': 0.20,
    'independence': 0.20,
    'fair_balanced': 0.15,
    'public_interest': 0.15,
    'corrections': 0.10
}

def parse_likert(value):
    """
    Parse une échelle Likert et retourne un score 0-100
    Formats acceptés: Agree/Disagree, Strongly agree/disagree, etc.
    """
    if value is None or value.strip() == '':
        return None

    value_str = value.strip().lower()

    likert_map = {
        'strongly agree': 100,
        'agree': 75,
        'neither agree nor disagree': 50,
        'disagree': 25,
        'strongly disagree': 0,
        'oui': 100,
        'yes': 100,
        'non': 0,
        'no': 0,
    }

    if value_str in likert_map:
        return likert_map[value_str]

    return None

def parse_trust_score(value):
    """Parse le score de confiance (0-10) et le convertit en 0-100"""
    if value is None or value.strip() == '':
        return None

    try:
        score = int(value.strip())
        if 0 <= score <= 10:
            return score * 10  # 5 → 50, 10 → 100
        return None
    except ValueError:
        return None

def calculate_mti_score(row):
    """Calcule le score MTI à partir d'une ligne CSV"""
    dimension_scores = {}

    for col_name, (dimension, weight) in MTI_COLUMN_MAP.items():
        if col_name in row:
            score = parse_likert(row[col_name])
            if score is not None:
                if dimension not in dimension_scores:
                    dimension_scores[dimension] = []
                dimension_scores[dimension].append(score)

    # Ajouter le score de confiance général (0-10 scale)
    if 'Trust this outlet (0-10)?' in row:
        trust_score = parse_trust_score(row['Trust this outlet (0-10)?'])
        if trust_score is not None:
            if 'accuracy' not in dimension_scores:
                dimension_scores['accuracy'] = []
            dimension_scores['accuracy'].append(trust_score)

    # Calculer la moyenne par dimension
    avg_dimension_scores = {}
    for dim, scores in dimension_scores.items():
        if scores:
            avg_dimension_scores[dim] = sum(scores) / len(scores)

    if not avg_dimension_scores:
        return None, {}

    # Calculer le score MTI pondéré
    weighted_total = sum(
        avg_dimension_scores.get(dim, 0) * DIMENSION_WEIGHTS[dim]
        for dim in DIMENSION_WEIGHTS.keys()
    )

    # Remplir les dimensions manquantes avec moyenne globale (pour ne pas pénaliser)
    for dim in DIMENSION_WEIGHTS.keys():
        if dim not in avg_dimension_scores:
            avg_dimension_scores[dim] = weighted_total

    return weighted_total, avg_dimension_scores

def load_kobo_csv(csv_file):
    """Charge le fichier CSV et insère les données dans PostgreSQL"""

    # Lire le CSV
    try:
        with open(csv_file, 'r', encoding='utf-8') as f:
            # Déterminer le délimiteur
            sample = f.read(1024)
            f.seek(0)
            dialect = csv.Sniffer().sniff(sample, delimiters=';,\t')
            f.seek(0)
            reader = csv.DictReader(f, dialect=dialect)
            rows = list(reader)
    except FileNotFoundError:
        print(f"❌ Erreur : Fichier '{csv_file}' non trouvé")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Erreur lors de la lecture du CSV: {e}")
        sys.exit(1)

    print(f"📊 {len(rows)} réponse(s) trouvée(s)")

    if len(rows) == 0:
        print("⚠️  Le fichier CSV est vide")
        sys.exit(1)

    # Connexion PostgreSQL
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        print("✅ Connecté à PostgreSQL")
    except psycopg2.Error as e:
        print(f"❌ Erreur de connexion PostgreSQL: {e}")
        print(f"   Vérifie que PostgreSQL tourne sur localhost:5432")
        sys.exit(1)

    try:
        for idx, row in enumerate(rows, 1):
            print(f"\n📝 Traitement réponse {idx}/{len(rows)}")

            # Extraire les données de base
            outlet_name = row.get('Which outlet do you trust most?', f'Outlet {idx}').strip()
            region = row.get('Region', 'Unknown').strip()
            district = row.get('District / MMDA', '').strip()
            community = row.get('Community / locality', '').strip()
            location = f"{district}, {region}" if district else region

            # Info respondent
            respondent_name = f"Respondent {idx}"  # Pas de nom dans ce formulaire
            respondent_age = row.get('Age (completed years)', '').strip()
            respondent_gender = row.get('Sex', '').strip()
            respondent_email = ''  # Pas d'email dans ce formulaire
            respondent_phone = ''

            # Calculer le score MTI
            overall_mti, dimension_scores = calculate_mti_score(row)

            if overall_mti is None:
                print(f"  ⚠️  Impossible de calculer le score MTI (données insuffisantes)")
                continue

            submission_time = row.get('_submission_time', datetime.now().isoformat())

            print(f"  ✓ Outlet: {outlet_name}")
            print(f"  ✓ Région: {region}")
            print(f"  ✓ Score MTI global: {overall_mti:.1f}%")
            print(f"  ✓ Dimensions: {', '.join(f'{d}={s:.0f}%' for d, s in dimension_scores.items())}")

            # Insérer ou mettre à jour outlet
            cursor.execute("""
                INSERT INTO outlets (name, location, date_created)
                VALUES (%s, %s, %s)
                ON CONFLICT (name) DO UPDATE SET location = EXCLUDED.location
                RETURNING id
            """, (outlet_name, location, datetime.now()))
            outlet_id = cursor.fetchone()[0]

            # Insérer ou mettre à jour respondent
            respondent_data = f"Age:{respondent_age}, Gender:{respondent_gender}"
            cursor.execute("""
                INSERT INTO respondents (outlet_id, name, email, phone, date_created)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (outlet_id, email) DO UPDATE SET name = EXCLUDED.name
                RETURNING id
            """, (outlet_id, respondent_name, respondent_email or f"respondent{idx}@survey.local",
                  respondent_phone, datetime.now()))
            respondent_id = cursor.fetchone()[0]

            # Insérer response globale
            cursor.execute("""
                INSERT INTO responses (outlet_id, respondent_id, mti_score, submission_date, raw_data)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id
            """, (outlet_id, respondent_id, overall_mti, submission_time,
                  str({k: v for k, v in row.items() if k not in ['_id', '_uuid', '_submission_time']})))
            response_id = cursor.fetchone()[0]

            # Insérer les scores par dimension
            for dimension, score in dimension_scores.items():
                cursor.execute("""
                    INSERT INTO dimension_scores (response_id, dimension, score)
                    VALUES (%s, %s, %s)
                    ON CONFLICT (response_id, dimension) DO UPDATE SET score = EXCLUDED.score
                """, (response_id, dimension, score))

            conn.commit()
            print(f"  ✅ Réponse {idx} chargée avec succès")

        print(f"\n✅ Chargement complet ! {len(rows)} réponse(s) traitée(s)")

        # Afficher un résumé
        cursor.execute("SELECT COUNT(*) FROM outlets")
        outlet_count = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM responses")
        response_count = cursor.fetchone()[0]
        cursor.execute("SELECT AVG(mti_score) FROM responses")
        avg_mti = cursor.fetchone()[0]

        print(f"\n📊 Résumé base de données:")
        print(f"   Outlets : {outlet_count}")
        print(f"   Réponses : {response_count}")
        print(f"   Score MTI moyen : {avg_mti:.1f}% (cible MFWA: 70%)")

        # Afficher par région
        cursor.execute("""
            SELECT o.location, COUNT(*), AVG(r.mti_score)
            FROM responses r
            JOIN outlets o ON r.outlet_id = o.id
            GROUP BY o.location
            ORDER BY AVG(r.mti_score) DESC
        """)
        print(f"\n📍 Scores par région:")
        for location, count, avg_score in cursor.fetchall():
            status = "✅" if avg_score >= 70 else "⚠️"
            print(f"   {status} {location}: {avg_score:.1f}% ({count} réponse(s))")

    except psycopg2.Error as e:
        print(f"❌ Erreur lors de l'insertion: {e}")
        conn.rollback()
        sys.exit(1)
    finally:
        cursor.close()
        conn.close()

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Charge les données CSV Kobo dans PostgreSQL')
    parser.add_argument('--file', '-f', required=True, help='Chemin du fichier CSV Kobo')
    args = parser.parse_args()

    load_kobo_csv(args.file)