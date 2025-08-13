# scrape_udyam.py
"""
Selenium + BeautifulSoup scraper that loads the Udyam registration page,
extracts all form fields (inputs/select/textarea), their labels, attributes,
and dropdown options, then saves a JSON schema file (form_schema.json).

Run: python scrape_udyam.py
"""
import json
import time
from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.chrome.service import Service


URL = "https://udyamregistration.gov.in/UdyamRegistration.aspx"
OUTFILE = "form_schema.json"

def init_driver():
    chrome_options = Options()
    chrome_options.add_argument("--start-maximized")
    chrome_options.add_argument("--disable-blink-features=AutomationControlled")
    chrome_options.add_argument("--disable-infobars")
    chrome_options.add_argument("--disable-extensions")

    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=chrome_options)
    return driver

def get_label_for_input(soup, input_id, input_elem):
    # try label[for=id]
    if input_id:
        lbl = soup.find("label", {"for": input_id})
        if lbl and lbl.text.strip():
            return lbl.text.strip()
    # otherwise check parent label
    parent_label = input_elem.find_parent("label")
    if parent_label:
        return parent_label.get_text(strip=True)
    # fallback: check previous sibling or nearby text
    prev = input_elem.find_previous(string=True)
    if prev:
        return prev.strip()
    return None

def parse_options(select_elem):
    options = []
    for opt in select_elem.find_all("option"):
        value = opt.get("value", "")
        text = opt.text.strip()
        options.append({"value": value, "label": text})
    return options

def extract_fields_from_soup(soup):
    fields = []
    # find inputs, selects, textareas inside forms or main containers
    form_elements = soup.find_all(["input","select","textarea"])
    for el in form_elements:
        tag = el.name
        typ = el.get("type","text") if tag=="input" else tag
        input_id = el.get("id")
        name = el.get("name") or input_id or ""
        label = get_label_for_input(soup, input_id, el)
        required = bool(el.get("required") or el.get("aria-required")=="true" or el.get("data-val-required"))
        pattern = el.get("pattern") or el.get("data-val-regex") or el.get("data-val-regex-pattern")
        maxlength = el.get("maxlength")
        placeholder = el.get("placeholder")
        field = {
            "name": name,
            "id": input_id,
            "tag": tag,
            "type": typ,
            "label": label,
            "required": required,
            "pattern": pattern,
            "maxlength": maxlength,
            "placeholder": placeholder
        }
        if tag == "select":
            field["options"] = parse_options(el)
        fields.append(field)
    return fields

def main():
    driver = init_driver()
    print("Loading page:", URL)
    driver.get(URL)
    
    # Wait a bit for initial JS to load
    time.sleep(4)
    
    print("\n🔹 You have 2 minutes to interact with the page before scraping starts...")
    time.sleep(120)  # 2 minutes pause
    
    # Scrape after 2 minutes
    html = driver.page_source
    soup = BeautifulSoup(html, "html.parser")
    fields = extract_fields_from_soup(soup)
    schema = {
        "source": URL,
        "fetched_at": time.asctime(),
        "fields": fields
    }
    with open(OUTFILE, "w", encoding="utf-8") as f:
        json.dump(schema, f, indent=2, ensure_ascii=False)
    
    print(f"\n✅ Saved {len(fields)} fields to {OUTFILE}")
    driver.quit()

if __name__ == "__main__":
    main()
