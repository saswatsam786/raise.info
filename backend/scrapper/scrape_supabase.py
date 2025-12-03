"""
Enhanced Salary Scraper with Supabase Integration
Only scrapes companies that don't have recent data
"""

import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

import requests
import json
from bs4 import BeautifulSoup
import logging
from typing import List, Dict, Optional, Any
from datetime import datetime
from supabase_client import SupabaseClient, normalize_salary_data

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class SupabaseScraper:
    def __init__(self, supabase_client: SupabaseClient, debug_mode: bool = True):
        """Initialize scraper with Supabase client"""
        self._salary_URL = {
            "levels_fyi": "https://www.levels.fyi/companies/{company_name}/salaries/software-engineer/locations/india?country=113",
            "weekday": "https://www.weekday.works/salary/what-salary-does-{company_name}-pay",
            "ambitionbox": "https://www.ambitionbox.com/salaries/{company_name}-salaries"
        }
        self.db = supabase_client
        self._company = None
        self._company_id = None
        self.debug_mode = debug_mode
        self.debug_dir = "debug_output"
        
        # Create debug output directory if it doesn't exist
        if self.debug_mode:
            os.makedirs(self.debug_dir, exist_ok=True)

    def set_company(self, company_name: str):
        """Set company and get/create company ID"""
        self._company = company_name
        self._company_id = self.db.get_or_create_company(company_name)
        logger.info(f"Set company to: {company_name} (ID: {self._company_id})")

    def should_scrape(self, source_platform: str, hours: int = 168) -> bool:
        """
        Check if we should scrape this company from this source
        Returns False if company was scraped recently
        """
        if not self._company:
            raise ValueError("Company not set. Call set_company() first.")

        return not self.db.has_recent_scrape(self._company, source_platform, hours)

    def save_debug_data(self, source: str, raw_data: Any, processed_data: List[Dict] = None):
        """Save raw scraped data to a text file for analysis"""
        if not self.debug_mode or not self._company:
            return
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{self.debug_dir}/{self._company}_{source}_{timestamp}.txt"
        
        try:
            with open(filename, 'w', encoding='utf-8') as f:
                f.write(f"=" * 80 + "\n")
                f.write(f"Company: {self._company}\n")
                f.write(f"Source: {source}\n")
                f.write(f"Timestamp: {timestamp}\n")
                f.write(f"=" * 80 + "\n\n")
                
                # Write raw salary values (highlighting format issues)
                if 'raw_salary_values' in raw_data:
                    f.write("RAW SALARY VALUES (ORIGINAL FORMAT):\n")
                    f.write("-" * 80 + "\n")
                    for idx, raw_val in enumerate(raw_data['raw_salary_values'], 1):
                        f.write(f"\nRaw Value #{idx}:\n")
                        if 'rawValues' in raw_val:
                            # levels_fyi format
                            rv = raw_val['rawValues']
                            f.write(f"  Level: {raw_val.get('primaryLevelName', 'N/A')}\n")
                            f.write(f"  Base (raw): {rv.get('base', 'N/A')} (type: {type(rv.get('base')).__name__})\n")
                            f.write(f"  Bonus (raw): {rv.get('bonus', 'N/A')} (type: {type(rv.get('bonus')).__name__})\n")
                            f.write(f"  Stock (raw): {rv.get('stock', 'N/A')} (type: {type(rv.get('stock')).__name__})\n")
                            f.write(f"  Total (raw): {rv.get('total', 'N/A')} (type: {type(rv.get('total')).__name__})\n")
                            f.write(f"  Exchange Rate: {raw_data.get('exchange_rate', 'N/A')}\n")
                        elif 'salary' in raw_val:
                            # weekday format
                            f.write(f"  Role: {raw_val.get('role', 'N/A')}\n")
                            f.write(f"  Salary (raw): {raw_val.get('salary', 'N/A')} (type: {type(raw_val.get('salary')).__name__})\n")
                        f.write(f"  Years of Experience: {raw_val.get('yearsOfExperience', 'N/A')}\n")
                        f.write(f"  Location: {raw_val.get('location', 'N/A')}\n")
                    f.write("\n")
                
                # Write raw JSON data
                f.write("FULL RAW JSON DATA:\n")
                f.write("-" * 80 + "\n")
                f.write(json.dumps(raw_data, indent=2, ensure_ascii=False))
                f.write("\n\n")
                
                # Write processed salary records
                if processed_data:
                    f.write("PROCESSED SALARY RECORDS:\n")
                    f.write("-" * 80 + "\n")
                    for idx, record in enumerate(processed_data, 1):
                        f.write(f"\nRecord #{idx}:\n")
                        f.write(f"  Company: {record.get('company_name', 'N/A')}\n")
                        f.write(f"  Role: {record.get('designation', 'N/A')}\n")
                        f.write(f"  Location: {record.get('location', 'N/A')}\n")
                        f.write(f"  Base Salary: {record.get('base_salary', 'N/A')}\n")
                        f.write(f"  Bonus: {record.get('bonus', 'N/A')}\n")
                        f.write(f"  Stock: {record.get('stock_compensation', 'N/A')}\n")
                        f.write(f"  Total Compensation: {record.get('total_compensation', 'N/A')}\n")
                        f.write(f"  Years of Experience: {record.get('years_of_experience', 'N/A')}\n")
                        f.write(f"  Source Platform: {record.get('source_platform', 'N/A')}\n")
                        f.write(f"  Source URL: {record.get('source_url', 'N/A')}\n")
                
                f.write("\n" + "=" * 80 + "\n")
            
            logger.info(f"Debug data saved to: {filename}")
        except Exception as e:
            logger.error(f"Error saving debug data: {e}")

    def scrape_salary_levels_fyi(self) -> List[Dict]:
        """Scrape salary data from levels.fyi"""
        source = "levels_fyi"

        # Check if we should scrape
        if not self.should_scrape(source):
            logger.info(f"Skipping {source} for {self._company} (recently scraped)")
            return []

        scrape_id = self.db.start_scrape(self._company, source, self._company_id)

        try:
            company_name = self._company.lower()
            url = self._salary_URL[source].format(company_name=company_name)

            logger.info(f"Scraping {source} for {self._company}: {url}")
            r = requests.get(url, timeout=30)
            soup = BeautifulSoup(r.text, 'html.parser')
            next_data = soup.find('script', id='__NEXT_DATA__')

            if not next_data:
                logger.warning(f"No data found on {source} for {self._company}")
                self.db.complete_scrape(scrape_id, "failed", 0, "No __NEXT_DATA__ found")
                return []

            data = json.loads(next_data.string)
            data = data['props']['pageProps']

            salaries_raw = data.get('averages', [])
            exchange_rate = data.get('locationExchangeRate', 1)

            # Save raw data for debugging (before processing)
            # Extract raw salary values to see original format
            raw_salary_values = []
            for salary in salaries_raw:
                raw_values = salary.get('rawValues', {})
                raw_salary_values.append({
                    'primaryLevelName': salary.get('primaryLevelName'),
                    'secondaryLevelName': salary.get('secondaryLevelName'),
                    'rawValues': raw_values,
                    'yearsOfExperience': salary.get('yearsOfExperience'),
                    'location': salary.get('location'),
                    'numDataPoints': salary.get('numDataPoints'),
                    'full_record': salary  # Keep full record for analysis
                })
            
            self.save_debug_data(source, {
                'raw_data': data,
                'averages': salaries_raw,
                'raw_salary_values': raw_salary_values,
                'exchange_rate': exchange_rate,
                'url': url
            })

            salary_records = []

            for salary in salaries_raw:
                primary_level = salary.get('primaryLevelName', 'Unknown')
                secondary_level = salary.get('secondaryLevelName')
                level_name = f"{primary_level} ({secondary_level})" if secondary_level else primary_level

                # Extract compensation
                # Note: raw_values from levels.fyi are already in actual USD
                # We just multiply by exchange_rate to convert USD to INR
                raw_values = salary.get('rawValues', {})
                compensation = {
                    'base': raw_values.get('base', 0) * exchange_rate,
                    'bonus': raw_values.get('bonus', 0) * exchange_rate,
                    'stock': raw_values.get('stock', 0) * exchange_rate,
                    'total_compensation': raw_values.get('total', 0) * exchange_rate
                }

                # Get years of experience
                yoe = salary.get('yearsOfExperience')

                # Get location
                location = salary.get('location', 'India')

                # Normalize and create salary record
                salary_record = normalize_salary_data(
                    company_id=self._company_id,
                    company_name=self._company,
                    designation=f"Software Engineer - {level_name}",
                    location=location,
                    source_platform=source,
                    compensation=compensation,
                    years_of_experience=yoe,
                    level=primary_level,
                    data_points=salary.get('numDataPoints', 1),
                    source_url=url
                )

                salary_records.append(salary_record)

            # Save processed records for debugging (after processing)
            if salary_records:
                # Re-save with processed data
                raw_salary_values = []
                for salary in salaries_raw:
                    raw_values = salary.get('rawValues', {})
                    raw_salary_values.append({
                        'primaryLevelName': salary.get('primaryLevelName'),
                        'secondaryLevelName': salary.get('secondaryLevelName'),
                        'rawValues': raw_values,
                        'yearsOfExperience': salary.get('yearsOfExperience'),
                        'location': salary.get('location'),
                        'numDataPoints': salary.get('numDataPoints'),
                        'full_record': salary
                    })
                
                self.save_debug_data(source, {
                    'raw_data': data,
                    'averages': salaries_raw,
                    'raw_salary_values': raw_salary_values,
                    'exchange_rate': exchange_rate,
                    'url': url
                }, processed_data=salary_records)

            # Insert into database
            if salary_records:
                count = self.db.insert_salaries(salary_records)
                self.db.complete_scrape(scrape_id, "success", count)
                self.db.update_data_source_last_scraped(source)
                logger.info(f"Successfully scraped {count} records from {source}")
            else:
                self.db.complete_scrape(scrape_id, "success", 0, "No salary data found")

            return salary_records

        except Exception as e:
            error_msg = f"Error scraping {source}: {str(e)}"
            logger.error(error_msg)
            self.db.complete_scrape(scrape_id, "failed", 0, str(e))
            return []

    def scrape_salary_weekdays(self) -> List[Dict]:
        """Scrape salary data from weekday.works"""
        source = "weekday"

        # Check if we should scrape
        if not self.should_scrape(source):
            logger.info(f"Skipping {source} for {self._company} (recently scraped)")
            return []

        scrape_id = self.db.start_scrape(self._company, source, self._company_id)

        try:
            company_name = self._company.lower()
            url = self._salary_URL[source].format(company_name=company_name)

            logger.info(f"Scraping {source} for {self._company}: {url}")
            r = requests.get(url, timeout=30)
            soup = BeautifulSoup(r.text, 'html.parser')
            next_data = soup.find('script', id='__NEXT_DATA__')

            if not next_data:
                logger.warning(f"No data found on {source} for {self._company}")
                self.db.complete_scrape(scrape_id, "failed", 0, "No __NEXT_DATA__ found")
                return []

            data = json.loads(next_data.string)
            data = data['props']['pageProps'].get("salaryData", {})

            roles = data.get('roles', [])
            
            # Save raw data for debugging (before processing)
            # Extract raw salary values to see original format
            raw_salary_values = []
            for role in roles:
                role_name = role.get("role", "Unknown Role")
                salaries_list = role.get("individualSalaries", [])
                for salary in salaries_list:
                    raw_salary_values.append({
                        'role': role_name,
                        'salary': salary.get('salary'),  # This is the raw value
                        'yearsOfExperience': salary.get('yearsOfExperience'),
                        'full_record': salary
                    })
            
            self.save_debug_data(source, {
                'raw_data': data,
                'roles': roles,
                'raw_salary_values': raw_salary_values,
                'url': url
            })

            salary_records = []

            for role in roles:
                role_name = role.get("role", "Unknown Role")
                salaries_list = role.get("individualSalaries", [])

                for salary in salaries_list:
                    level_name = salary.get('role', role_name)
                    yoe = salary.get('yearsOfExperience')
                    # Weekday values are in lakhs (hundreds of thousands) of INR
                    # Convert from lakhs to actual INR: 1 lakh = 100,000 INR
                    total_comp_lakhs = salary.get('salary', 0)
                    total_comp = total_comp_lakhs * 100000

                    compensation = {
                        'base': total_comp,  # Weekday typically shows total compensation
                        'total_compensation': total_comp
                    }

                    # Normalize and create salary record
                    salary_record = normalize_salary_data(
                        company_id=self._company_id,
                        company_name=self._company,
                        designation=level_name,
                        location="India",  # Weekday doesn't always specify location
                        source_platform=source,
                        compensation=compensation,
                        years_of_experience=yoe,
                        role_category=role_name,
                        source_url=url
                    )

                    salary_records.append(salary_record)

            # Save processed records for debugging (after processing)
            if salary_records:
                # Re-extract raw values for comparison
                raw_salary_values = []
                for role in roles:
                    role_name = role.get("role", "Unknown Role")
                    salaries_list = role.get("individualSalaries", [])
                    for salary in salaries_list:
                        raw_salary_values.append({
                            'role': role_name,
                            'salary': salary.get('salary'),  # This is the raw value
                            'yearsOfExperience': salary.get('yearsOfExperience'),
                            'full_record': salary
                        })
                
                self.save_debug_data(source, {
                    'raw_data': data,
                    'roles': roles,
                    'raw_salary_values': raw_salary_values,
                    'url': url
                }, processed_data=salary_records)

            # Insert into database
            if salary_records:
                count = self.db.insert_salaries(salary_records)
                self.db.complete_scrape(scrape_id, "success", count)
                self.db.update_data_source_last_scraped(source)
                logger.info(f"Successfully scraped {count} records from {source}")
            else:
                self.db.complete_scrape(scrape_id, "success", 0, "No salary data found")

            return salary_records

        except Exception as e:
            error_msg = f"Error scraping {source}: {str(e)}"
            logger.error(error_msg)
            self.db.complete_scrape(scrape_id, "failed", 0, str(e))
            return []

    def scrape_all_sources(self) -> Dict[str, int]:
        """
        Scrape all available sources for the current company
        Returns: dict with source names and record counts
        """
        if not self._company:
            raise ValueError("Company not set. Call set_company() first.")

        results = {}

        logger.info(f"\n{'='*60}")
        logger.info(f"Starting scrape for: {self._company}")
        logger.info(f"{'='*60}\n")

        # Scrape levels.fyi
        levels_records = self.scrape_salary_levels_fyi()
        results['levels_fyi'] = len(levels_records)

        # Scrape weekday
        weekday_records = self.scrape_salary_weekdays()
        results['weekday'] = len(weekday_records)

        total_records = sum(results.values())
        logger.info(f"\n{'='*60}")
        logger.info(f"Completed scrape for {self._company}: {total_records} total records")
        logger.info(f"Breakdown: {results}")
        logger.info(f"{'='*60}\n")

        return results


def main():
    """Main function to run the scraper"""
    # Initialize Supabase client
    try:
        db = SupabaseClient()
    except ValueError as e:
        logger.error(f"Failed to initialize Supabase client: {e}")
        logger.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables")
        return

    # Load companies to scrape
    try:
        with open("companies.json", "r") as f:
            companies = json.load(f)
        logger.info(f"Loaded {len(companies)} companies to scrape")
    except FileNotFoundError:
        logger.error("companies.json not found")
        return
    except json.JSONDecodeError as e:
        logger.error(f"Error parsing companies.json: {e}")
        return

    # Initialize scraper
    scraper = SupabaseScraper(db)

    # Scrape each company
    total_results = {}
    for company in companies:
        try:
            scraper.set_company(company)
            results = scraper.scrape_all_sources()
            total_results[company] = results
        except Exception as e:
            logger.error(f"Error scraping {company}: {e}")
            total_results[company] = {"error": str(e)}

    # Print summary
    logger.info("\n" + "="*60)
    logger.info("SCRAPING SUMMARY")
    logger.info("="*60)
    for company, results in total_results.items():
        if "error" in results:
            logger.info(f"{company}: ERROR - {results['error']}")
        else:
            total = sum(results.values())
            logger.info(f"{company}: {total} records ({results})")
    logger.info("="*60)


if __name__ == "__main__":
    main()
