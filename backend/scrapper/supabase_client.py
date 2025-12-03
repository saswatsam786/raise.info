"""
Supabase Integration Module for Salary Scraper
Handles all database operations with Supabase
"""

import os
from supabase import create_client, Client
from datetime import datetime
from typing import List, Dict, Optional, Any
import logging
import requests

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SupabaseClient:
    def __init__(self):
        """Initialize Supabase client with environment variables"""
        self.url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
        self.key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

        if not self.url or not self.key:
            raise ValueError(
                "Missing Supabase credentials. "
                "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables."
            )

        self.client: Client = create_client(self.url, self.key)
        # Base URL of the Next.js app API (used to reuse aggregation logic)
        # Defaults to local dev URL; can be overridden in env.
        self.api_base_url = os.environ.get("SALARIS_API_URL", "http://localhost:3000")
        logger.info("Supabase client initialized successfully")

    def company_exists(self, company_name: str) -> bool:
        """Check if a company already exists in the database"""
        try:
            response = self.client.table("companies").select("id").eq("name", company_name).execute()
            return len(response.data) > 0
        except Exception as e:
            logger.error(f"Error checking if company exists: {e}")
            return False

    def get_or_create_company(self, company_name: str, display_name: str = None) -> str:
        """
        Get existing company ID or create a new company
        Returns: company_id (UUID)
        """
        try:
            # Check if company exists
            response = self.client.table("companies").select("id").eq("name", company_name).execute()

            if response.data:
                company_id = response.data[0]["id"]
                logger.info(f"Company '{company_name}' found with ID: {company_id}")
                return company_id

            # Create new company
            slug = company_name.lower().replace(" ", "-")
            company_data = {
                "name": company_name,
                "slug": slug,
                "display_name": display_name or company_name,
                "is_active": True
            }

            response = self.client.table("companies").insert(company_data).execute()
            company_id = response.data[0]["id"]
            logger.info(f"Company '{company_name}' created with ID: {company_id}")
            return company_id

        except Exception as e:
            logger.error(f"Error in get_or_create_company: {e}")
            raise

    def has_recent_scrape(self, company_name: str, source_platform: str, hours: int = 168) -> bool:
        """
        Check if company was scraped recently from this source
        hours: Consider data stale after this many hours (default 168 = 1 week)
        """
        try:
            response = self.client.table("scrape_history").select("completed_at").eq(
                "company_name", company_name
            ).eq(
                "source_platform", source_platform
            ).eq(
                "status", "success"
            ).order("completed_at", desc=True).limit(1).execute()

            if not response.data:
                return False

            last_scrape = datetime.fromisoformat(response.data[0]["completed_at"].replace("Z", "+00:00"))
            hours_since_scrape = (datetime.now(last_scrape.tzinfo) - last_scrape).total_seconds() / 3600

            is_recent = hours_since_scrape < hours
            if is_recent:
                logger.info(
                    f"Company '{company_name}' from '{source_platform}' "
                    f"was scraped {hours_since_scrape:.1f} hours ago. Skipping."
                )
            return is_recent

        except Exception as e:
            logger.error(f"Error checking recent scrape: {e}")
            return False

    def start_scrape(self, company_name: str, source_platform: str, company_id: str = None) -> str:
        """
        Record the start of a scraping operation
        Returns: scrape_history_id
        """
        try:
            scrape_data = {
                "company_id": company_id,
                "company_name": company_name,
                "source_platform": source_platform,
                "status": "in_progress",
                "started_at": datetime.utcnow().isoformat()
            }

            response = self.client.table("scrape_history").insert(scrape_data).execute()
            scrape_id = response.data[0]["id"]
            logger.info(f"Started scrape for '{company_name}' from '{source_platform}' (ID: {scrape_id})")
            return scrape_id

        except Exception as e:
            logger.error(f"Error starting scrape: {e}")
            raise

    def complete_scrape(
        self,
        scrape_id: str,
        status: str,
        records_scraped: int = 0,
        error_message: str = None
    ):
        """Update scrape history record when scraping completes"""
        try:
            update_data = {
                "status": status,
                "records_scraped": records_scraped,
                "completed_at": datetime.utcnow().isoformat()
            }

            if error_message:
                update_data["error_message"] = error_message

            self.client.table("scrape_history").update(update_data).eq("id", scrape_id).execute()
            logger.info(f"Scrape {scrape_id} completed with status: {status}, records: {records_scraped}")

        except Exception as e:
            logger.error(f"Error completing scrape: {e}")

    def insert_salaries(self, salaries: List[Dict[str, Any]]) -> int:
        """
        Insert salary records via the aggregation endpoint.
        Returns: number of records successfully processed
        """
        if not salaries:
            return 0

        processed = 0

        for salary in salaries:
            try:
                # Map normalized scraper record to the CreateSalaryInput shape
                payload = {
                    "company": salary.get("company_name", ""),
                    "role": salary.get("designation", ""),
                    "location": salary.get("location", ""),
                    "yearsOfExperience": (
                        str(salary.get("years_of_experience"))
                        if salary.get("years_of_experience") is not None
                        else ""
                    ),
                    "baseSalary": str(salary.get("base_salary") or ""),
                    "bonus": str(salary.get("bonus") or ""),
                    "stockCompensation": str(salary.get("stock_compensation") or ""),
                    "totalCompensation": str(salary.get("total_compensation") or ""),
                    # Treat scraper data as full-time salary entries by default
                    "type": "fulltime",
                    "employmentType": "Full-time",
                    # Internship/university-specific fields left empty
                    "duration": "",
                    "stipend": "",
                    "university": "",
                    "year": "",
                }

                resp = requests.post(
                    f"{self.api_base_url}/api/salaries",
                    json=payload,
                    timeout=15,
                )

                if resp.status_code == 201:
                    processed += 1
                else:
                    logger.error(
                        "Failed to POST salary to API: status=%s, body=%s",
                        resp.status_code,
                        resp.text,
                    )
            except Exception as e:
                logger.error(f"Error inserting salary via API: {e}")
                logger.error(f"Offending record: {salary}")

        logger.info(f"Processed {processed} salary records via API")
        return processed

    def salary_exists(
        self,
        company_name: str,
        designation: str,
        location: str,
        source_platform: str
    ) -> bool:
        """Check if a specific salary record already exists"""
        try:
            response = self.client.table("salaries").select("id").eq(
                "company_name", company_name
            ).eq(
                "designation", designation
            ).eq(
                "location", location
            ).eq(
                "source_platform", source_platform
            ).limit(1).execute()

            return len(response.data) > 0

        except Exception as e:
            logger.error(f"Error checking salary existence: {e}")
            return False

    def get_existing_salaries(self, company_name: str, source_platform: str) -> List[Dict]:
        """Get all existing salary records for a company from a specific source"""
        try:
            response = self.client.table("salaries").select(
                "designation, location"
            ).eq(
                "company_name", company_name
            ).eq(
                "source_platform", source_platform
            ).execute()

            return response.data

        except Exception as e:
            logger.error(f"Error getting existing salaries: {e}")
            return []

    def update_data_source_last_scraped(self, source_platform: str):
        """Update the last scraped timestamp for a data source"""
        try:
            self.client.table("data_sources").update({
                "last_scraped_at": datetime.utcnow().isoformat()
            }).eq("name", source_platform).execute()

        except Exception as e:
            logger.error(f"Error updating data source: {e}")

    def delete_old_salaries(self, company_name: str, source_platform: str, days: int = 30):
        """Delete salary records older than specified days"""
        try:
            cutoff_date = datetime.utcnow().timestamp() - (days * 24 * 60 * 60)

            response = self.client.table("salaries").delete().eq(
                "company_name", company_name
            ).eq(
                "source_platform", source_platform
            ).lt(
                "created_at", datetime.fromtimestamp(cutoff_date).isoformat()
            ).execute()

            count = len(response.data) if response.data else 0
            if count > 0:
                logger.info(f"Deleted {count} old salary records for {company_name}")

        except Exception as e:
            logger.error(f"Error deleting old salaries: {e}")


# Helper function to normalize salary data
def normalize_salary_data(
    company_id: str,
    company_name: str,
    designation: str,
    location: str,
    source_platform: str,
    compensation: Dict[str, float],
    years_of_experience: Optional[int] = None,
    level: Optional[str] = None,
    data_points: int = 1,
    **kwargs
) -> Dict[str, Any]:
    """
    Normalize salary data into the database schema format
    """
    # Calculate total compensation
    total_comp = compensation.get('total_compensation', 0) or (
        compensation.get('base', 0) +
        compensation.get('bonus', 0) +
        compensation.get('stock', 0)
    )

    salary_record = {
        "company_id": company_id,
        "company_name": company_name,
        "designation": designation,
        "level": level,
        "location": location,
        "years_of_experience": years_of_experience,
        "base_salary": compensation.get('base', 0),
        "bonus": compensation.get('bonus', 0),
        "stock_compensation": compensation.get('stock', 0),
        "total_compensation": total_comp,
        "avg_salary": total_comp,
        "data_points_count": data_points,
        "source_platform": source_platform,
        "currency": "INR",
        "country": "India",
        "data_date": datetime.utcnow().date().isoformat(),
        "scraped_at": datetime.utcnow().isoformat()
    }

    # Add any additional fields
    for key, value in kwargs.items():
        if key in salary_record:
            continue
        salary_record[key] = value

    return salary_record
