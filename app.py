import os
import logging
from flask import Flask, render_template, request, jsonify
from google.oauth2.credentials import Credentials
from google.oauth2 import service_account
from googleapiclient.discovery import build
from datetime import datetime
from googleapiclient.errors import HttpError

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "dev-secret-key")

# Google Sheets configuration
SCOPES = ['https://www.googleapis.com/auth/spreadsheets']
SPREADSHEET_ID = os.environ.get('SPREADSHEET_ID')
SHEET_NAME = 'Orders'
HEADERS = [['Timestamp', 'Name', 'Email', 'Phone', 'Order Details', 'Special Instructions']]

def setup_orders_sheet(service):
    try:
        # Try to get the sheet to check if it exists
        service.spreadsheets().values().get(
            spreadsheetId=SPREADSHEET_ID,
            range=f"{SHEET_NAME}!A1:F1"
        ).execute()
    except HttpError as e:
        if e.resp.status == 404:
            # Sheet doesn't exist, create it
            body = {
                'requests': [{
                    'addSheet': {
                        'properties': {
                            'title': SHEET_NAME
                        }
                    }
                }]
            }
            try:
                service.spreadsheets().batchUpdate(
                    spreadsheetId=SPREADSHEET_ID,
                    body=body
                ).execute()

                # Add headers
                service.spreadsheets().values().update(
                    spreadsheetId=SPREADSHEET_ID,
                    range=f"{SHEET_NAME}!A1:F1",
                    valueInputOption='RAW',
                    body={'values': HEADERS}
                ).execute()

                logger.debug(f"Created new sheet '{SHEET_NAME}' with headers")
                return True
            except Exception as create_error:
                logger.error(f"Error creating sheet: {str(create_error)}")
                return False
    return True

def get_google_sheets_service():
    try:
        # Log environment variable presence (not their values)
        required_vars = [
            'GOOGLE_TYPE',
            'GOOGLE_PROJECT_ID',
            'GOOGLE_PRIVATE_KEY_ID',
            'GOOGLE_PRIVATE_KEY',
            'GOOGLE_CLIENT_EMAIL',
            'GOOGLE_CLIENT_ID',
            'SPREADSHEET_ID'
        ]

        missing_vars = [var for var in required_vars if not os.environ.get(var)]
        if missing_vars:
            logger.error(f"Missing required environment variables: {', '.join(missing_vars)}")
            return None

        # Get private key and ensure proper formatting
        private_key = os.environ.get("GOOGLE_PRIVATE_KEY", "")
        if "\\n" in private_key:
            private_key = private_key.replace("\\n", "\n")
        elif r"\n" in private_key:
            private_key = private_key.replace(r"\n", "\n")

        # Log key structure without revealing content
        key_lines = private_key.split('\n')
        logger.debug(f"Private key structure:")
        logger.debug(f"First line: {key_lines[0]}")
        logger.debug(f"Number of lines: {len(key_lines)}")
        logger.debug(f"Last line: {key_lines[-1] if key_lines else 'No lines found'}")

        # Construct service account info
        service_account_info = {
            "type": os.environ.get("GOOGLE_TYPE"),
            "project_id": os.environ.get("GOOGLE_PROJECT_ID"),
            "private_key_id": os.environ.get("GOOGLE_PRIVATE_KEY_ID"),
            "private_key": private_key,
            "client_email": os.environ.get("GOOGLE_CLIENT_EMAIL"),
            "client_id": os.environ.get("GOOGLE_CLIENT_ID"),
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
            "client_x509_cert_url": f"https://www.googleapis.com/robot/v1/metadata/x509/{os.environ.get('GOOGLE_CLIENT_EMAIL')}"
        }

        logger.debug("Attempting to create credentials with service account info")
        credentials = service_account.Credentials.from_service_account_info(
            service_account_info,
            scopes=SCOPES
        )

        logger.debug("Building Google Sheets service")
        service = build('sheets', 'v4', credentials=credentials)
        logger.debug("Successfully built Google Sheets service")
        return service

    except Exception as e:
        logger.error(f"Error creating Google Sheets service: {str(e)}")
        logger.error(f"Error type: {type(e).__name__}")
        return None

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/events')
def events():
    return render_template('events.html')

@app.route('/submit_order', methods=['POST'])
def submit_order():
    try:
        data = request.form
        name = data.get('name')
        email = data.get('email')
        phone = data.get('phone')
        order_details = data.get('order_details')
        special_instructions = data.get('special_instructions')

        logger.debug("Preparing order data for submission")
        order_data = [
            [
                datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                name,
                email,
                phone,
                order_details,
                special_instructions
            ]
        ]

        service = get_google_sheets_service()
        if not service:
            logger.error("Failed to create Google Sheets service")
            return jsonify({'success': False, 'message': 'Could not connect to order system'}), 500

        # Ensure the Orders sheet exists and has headers
        if not setup_orders_sheet(service):
            return jsonify({'success': False, 'message': 'Error setting up order system'}), 500

        logger.debug(f"Attempting to append data to spreadsheet: {SPREADSHEET_ID}")
        sheet = service.spreadsheets()
        result = sheet.values().append(
            spreadsheetId=SPREADSHEET_ID,
            range=f"{SHEET_NAME}!A:F",
            valueInputOption='RAW',
            insertDataOption='INSERT_ROWS',
            body={'values': order_data}
        ).execute()

        logger.debug("Successfully submitted order to Google Sheets")
        return jsonify({'success': True, 'message': 'Order submitted successfully!'})

    except Exception as e:
        logger.error(f"Error submitting order: {str(e)}")
        logger.error(f"Error type: {type(e).__name__}")
        return jsonify({'success': False, 'message': 'An error occurred while submitting your order'}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)