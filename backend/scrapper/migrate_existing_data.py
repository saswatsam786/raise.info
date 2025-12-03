"""
Migrate existing salary data from JSON files to Supabase
Run this once to import your existing data
"""

import json
import logging
from supabase_client import SupabaseClient, normalize_salary_data
from datetime import datetime

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def migrate_salaries_from_json(json_file_path: str, db: SupabaseClient):
    """
    Migrate salary data from JSON file to Supabase
    Expected format from salaries.json
    """
    try:
        with open(json_file_path, 'r') as f:
            salaries = json.load(f)

        logger.info(f"Loaded {len(salaries)} salary records from {json_file_path}")

        migrated_count = 0
        error_count = 0
        skipped_count = 0

        for salary_data in salaries:
            try:
                company_name = salary_data.get('company_name')
                if not company_name:
                    logger.warning(f"Skipping record with no company name: {salary_data}")
                    skipped_count += 1
                    continue

                # Get or create company
                company_id = db.get_or_create_company(company_name)

                # Check if this record already exists
                designation = salary_data.get('designation', 'Unknown')
                location = salary_data.get('location', 'India')

                if db.salary_exists(company_name, designation, location, 'manual'):
                    logger.info(f"Skipping existing record: {company_name} - {designation}")
                    skipped_count += 1
                    continue

                # Prepare compensation data
                compensation = {
                    'base': salary_data.get('avg_salary', 0),
                    'total_compensation': salary_data.get('avg_salary', 0)
                }

                # Normalize the salary record
                salary_record = normalize_salary_data(
                    company_id=company_id,
                    company_name=company_name,
                    designation=designation,
                    location=location,
                    source_platform='manual',
                    compensation=compensation,
                    years_of_experience=salary_data.get('yoe'),
                    min_salary=salary_data.get('min_salary'),
                    max_salary=salary_data.get('max_salary'),
                    data_points=salary_data.get('reports', 1)
                )

                # Insert into database
                db.insert_salaries([salary_record])
                migrated_count += 1

                if migrated_count % 10 == 0:
                    logger.info(f"Migrated {migrated_count} records so far...")

            except Exception as e:
                logger.error(f"Error migrating record: {salary_data.get('company_name', 'Unknown')} - {str(e)}")
                error_count += 1

        logger.info("\n" + "="*60)
        logger.info("MIGRATION SUMMARY")
        logger.info("="*60)
        logger.info(f"Total records: {len(salaries)}")
        logger.info(f"Successfully migrated: {migrated_count}")
        logger.info(f"Skipped (already exists): {skipped_count}")
        logger.info(f"Errors: {error_count}")
        logger.info("="*60)

    except FileNotFoundError:
        logger.error(f"File not found: {json_file_path}")
    except json.JSONDecodeError as e:
        logger.error(f"Error parsing JSON: {e}")
    except Exception as e:
        logger.error(f"Unexpected error: {e}")


def main():
    """Main migration function"""
    # Initialize Supabase client
    try:
        db = SupabaseClient()
    except ValueError as e:
        logger.error(f"Failed to initialize Supabase client: {e}")
        logger.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables")
        return

    # Path to your existing salary JSON file
    json_file = "../src/data/salaries.json"

    logger.info("Starting migration from JSON to Supabase...")
    migrate_salaries_from_json(json_file, db)
    logger.info("Migration completed!")


if __name__ == "__main__":
    main()
