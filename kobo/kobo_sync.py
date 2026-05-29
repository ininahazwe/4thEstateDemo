#!/usr/bin/env python3
"""
Kobo Toolbox → PostgreSQL Sync Script (Docker Version for Mac)
Récupère les réponses du formulaire Kobo et les enregistre dans PostgreSQL
Calcule automatiquement les scores MTI selon les 6 dimensions
VERSION MODIFIÉE POUR DOCKER SUR MAC
"""

import requests
import json
import subprocess
from datetime import datetime
import os
from dotenv import load_dotenv
import logging
from typing import Dict, List, Any

# Configuration logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/kobo_sync.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Charger variables d'environnement
load_dotenv()

KOBO_API_URL = "https://kobo.humanitarianresponse.info/api/v2"
KOBO_TOKEN = os.getenv('KOBO_API_TOKEN')
KOBO_FORM_NAME = "MFWA Media Trust Barometer - Ghana (Demo)"

if not KOBO_TOKEN:
    raise ValueError("❌ KOBO_API_TOKEN not set in .env file")

# Headers pour les requêtes Kobo
headers = {
    "Authorization": f"Token {KOBO_TOKEN}",
    "Accept": "application/json"
}

def run_docker_sql(sql_command):
    """Exécuter une commande SQL dans le container Docker"""
    try:
        cmd = f'docker exec odk_postgres psql -U postgres -d mfwa_mti -c "{sql_command}"'
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=30)
        return result.returncode, result.stdout.strip(), result.stderr.strip()
    except Exception as e:
        return 1, "", str(e)

class KoboSyncManager:
    """Gérer la synchronisation Kobo → PostgreSQL"""

    def __init__(self):
        self.submissions_synced = 0
        self.submissions_skipped = 0

    def get_kobo_assets(self) -> List[Dict]:
        """Récupérer tous les projets Kobo"""
        try:
            response = requests.get(f"{KOBO_API_URL}/assets/", headers=headers)
            response.raise_for_status()
            assets = response.json()['results']
            logger.info(f"✅ Found {len(assets)} Kobo projects")
            return assets
        except Exception as e:
            logger.error(f"❌ Error fetching Kobo assets: {str(e)}")
            return []

    def get_kobo_submissions(self, asset_id: str) -> List[Dict]:
        """Récupérer les réponses d'un formulaire"""
        try:
            url = f"{KOBO_API_URL}/assets/{asset_id}/data/"
            response = requests.get(url, headers=headers)
            response.raise_for_status()
            submissions = response.json()['results']
            logger.info(f"📊 Found {len(submissions)} submissions for asset {asset_id}")
            return submissions
        except Exception as e:
            logger.error(f"❌ Error fetching submissions: {str(e)}")
            return []

    def get_or_create_outlet(self, outlet_name: str) -> int:
        """Créer ou récupérer un outlet par son nom"""
        try:
            # Chercher outlet existant
            sql = f"SELECT id FROM outlets WHERE name = '{outlet_name}' LIMIT 1;"
            returncode, stdout, stderr = run_docker_sql(sql)

            if returncode == 0 and stdout and "id" not in stdout.lower():
                lines = stdout.strip().split('\n')
                if len(lines) >= 3:
                    outlet_id = int(lines[-2].strip())
                    return outlet_id

            # Créer nouveau outlet
            sql = f"INSERT INTO outlets (name, location, created_at) VALUES ('{outlet_name}', 'Ghana', '{datetime.now().isoformat()}') RETURNING id;"
            returncode, stdout, stderr = run_docker_sql(sql)

            if returncode == 0:
                lines = stdout.strip().split('\n')
                if len(lines) >= 3:
                    outlet_id = int(lines[-2].strip())
                    logger.info(f"✅ Created outlet: {outlet_name} (ID: {outlet_id})")
                    return outlet_id

            logger.error(f"❌ Error creating outlet {outlet_name}")
            return None

        except Exception as e:
            logger.error(f"❌ Error getting/creating outlet {outlet_name}: {str(e)}")
            return None

    def calculate_mti_score(self, submission: Dict[str, Any]) -> Dict[str, float]:
        """
        Calculer les scores MTI basés sur les réponses Kobo

        Dimensions MTI (poids) :
        - Accuracy (20%) : Q_accuracy_*
        - Verification (20%) : Q_verification_*
        - Independence (20%) : Q_independence_*
        - Fair & Balanced (15%) : Q_fairness_*
        - Public Interest (15%) : Q_public_*
        - Corrections (10%) : Q_corrections_*
        """

        scores = {
            'accuracy': 0,
            'verification': 0,
            'independence': 0,
            'fair_balanced': 0,
            'public_interest': 0,
            'corrections': 0
        }

        try:
            # Fonction helper pour trouver questions par préfixe
            def get_dimension_score(dimension_prefix: str, keys: List[str]) -> float:
                """Moyenne des réponses pour une dimension (échelle 1-5)"""
                dimension_questions = [
                    submission.get(k, 0)
                    for k in keys
                    if k in submission
                ]

                if not dimension_questions:
                    return 0

                # Convertir en float et normaliser (0-100)
                try:
                    numeric_answers = [float(x) for x in dimension_questions]
                    avg = sum(numeric_answers) / len(numeric_answers)
                    # Si échelle 1-5, convertir en 0-100
                    return (avg - 1) * 25 if avg >= 1 else 0
                except (ValueError, TypeError):
                    return 0

            # Chercher les questions pour chaque dimension
            accuracy_keys = [k for k in submission.keys() if 'accuracy' in k.lower()]
            scores['accuracy'] = get_dimension_score('accuracy', accuracy_keys)

            verification_keys = [k for k in submission.keys() if 'verification' in k.lower()]
            scores['verification'] = get_dimension_score('verification', verification_keys)

            independence_keys = [k for k in submission.keys() if 'independence' in k.lower()]
            scores['independence'] = get_dimension_score('independence', independence_keys)

            fairness_keys = [k for k in submission.keys() if 'fair' in k.lower() or 'balanced' in k.lower()]
            scores['fair_balanced'] = get_dimension_score('fairness', fairness_keys)

            public_keys = [k for k in submission.keys() if 'public' in k.lower() or 'interest' in k.lower()]
            scores['public_interest'] = get_dimension_score('public', public_keys)

            corrections_keys = [k for k in submission.keys() if 'correction' in k.lower()]
            scores['corrections'] = get_dimension_score('corrections', corrections_keys)

            # Calcul final avec poids
            total_mti = (
                scores['accuracy'] * 0.20 +
                scores['verification'] * 0.20 +
                scores['independence'] * 0.20 +
                scores['fair_balanced'] * 0.15 +
                scores['public_interest'] * 0.15 +
                scores['corrections'] * 0.10
            )

            scores['total_mti'] = round(total_mti, 2)

            return scores

        except Exception as e:
            logger.error(f"❌ Error calculating MTI scores: {str(e)}")
            return {**scores, 'total_mti': 0}

    def sync_submission_to_db(self, submission: Dict, outlet_id: int) -> bool:
        """Enregistrer une soumission dans PostgreSQL"""
        try:
            submission_time = submission.get('_submission_time', datetime.now().isoformat())
            mti_scores = self.calculate_mti_score(submission)

            # Échapper les apostrophes dans le JSON
            raw_response = json.dumps(submission).replace("'", "''")

            sql = f"""
                INSERT INTO responses (
                    outlet_id,
                    submission_date,
                    raw_response,
                    accuracy,
                    verification,
                    independence,
                    fair_balanced,
                    public_interest,
                    corrections,
                    total_mti,
                    created_at
                ) VALUES (
                    {outlet_id},
                    '{submission_time}',
                    '{raw_response}',
                    {mti_scores['accuracy']},
                    {mti_scores['verification']},
                    {mti_scores['independence']},
                    {mti_scores['fair_balanced']},
                    {mti_scores['public_interest']},
                    {mti_scores['corrections']},
                    {mti_scores['total_mti']},
                    '{datetime.now().isoformat()}'
                )
                ON CONFLICT (outlet_id, submission_date)
                DO UPDATE SET
                    raw_response = EXCLUDED.raw_response,
                    accuracy = EXCLUDED.accuracy,
                    verification = EXCLUDED.verification,
                    independence = EXCLUDED.independence,
                    fair_balanced = EXCLUDED.fair_balanced,
                    public_interest = EXCLUDED.public_interest,
                    corrections = EXCLUDED.corrections,
                    total_mti = EXCLUDED.total_mti;
            """

            returncode, stdout, stderr = run_docker_sql(sql)

            if returncode == 0:
                self.submissions_synced += 1
                outlet_name = submission.get('outlet_name', 'Unknown')
                logger.info(f"✅ Synced: {outlet_name} - MTI: {mti_scores['total_mti']:.2f}")
                return True
            else:
                logger.error(f"❌ Error syncing submission: {stderr}")
                self.submissions_skipped += 1
                return False

        except Exception as e:
            logger.error(f"❌ Error syncing submission: {str(e)}")
            self.submissions_skipped += 1
            return False

    def run_sync(self):
        """Exécuter la synchronisation complète"""
        logger.info("=" * 60)
        logger.info("🔄 Kobo Sync Started")
        logger.info("=" * 60)

        try:
            # Récupérer les assets
            assets = self.get_kobo_assets()

            # Chercher le formulaire MFWA_MTI_Demo
            mfwa_asset = None
            for asset in assets:
                if KOBO_FORM_NAME in asset.get('name', ''):
                    mfwa_asset = asset
                    break

            if not mfwa_asset:
                logger.warning(f"⚠️ Form '{KOBO_FORM_NAME}' not found in Kobo")
                return

            logger.info(f"📋 Found form: {mfwa_asset['name']} (ID: {mfwa_asset['uid']})")

            # Récupérer les soumissions
            submissions = self.get_kobo_submissions(mfwa_asset['uid'])

            if not submissions:
                logger.info("ℹ️ No submissions to sync")
                return

            # Synchroniser chaque soumission
            for submission in submissions:
                outlet_name = submission.get('outlet_name', 'Unknown')

                outlet_id = self.get_or_create_outlet(outlet_name)
                if outlet_id:
                    self.sync_submission_to_db(submission, outlet_id)

            # Résumé
            logger.info("=" * 60)
            logger.info(f"✅ Sync Complete - {self.submissions_synced} synced, {self.submissions_skipped} skipped")
            logger.info("=" * 60)

        except Exception as e:
            logger.error(f"❌ Sync failed: {str(e)}")

def main():
    """Point d'entrée"""
    manager = KoboSyncManager()
    manager.run_sync()

if __name__ == "__main__":
    main()