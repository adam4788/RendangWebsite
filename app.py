import os
import logging
from flask import Flask, render_template, request, jsonify
from google.oauth2.credentials import Credentials
from google.oauth2 import service_account
from googleapiclient.discovery import build
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "dev-secret-key")

# Google Sheets configuration
SCOPES = ['https://www.googleapis.com/auth/spreadsheets']
SPREADSHEET_ID = os.environ.get('SPREADSHEET_ID', 'your-spreadsheet-id')
RANGE_NAME = 'Orders!A:F'

def get_google_sheets_service():
    try:
        credentials = service_account.Credentials.from_service_account_info(
            {
                "type": os.environ.get("GOOGLE_TYPE"),
                "project_id": os.environ.get("GOOGLE_PROJECT_ID"),
                "private_key_id": os.environ.get("GOOGLE_PRIVATE_KEY_ID"),
                "private_key": os.environ.get("GOOGLE_PRIVATE_KEY", "").replace('\\n', '\n'),
                "client_email": os.environ.get("GOOGLE_CLIENT_EMAIL"),
                "client_id": os.environ.get("GOOGLE_CLIENT_ID"),
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
                "client_x509_cert_url": f"https://www.googleapis.com/robot/v1/metadata/x509/{os.environ.get('GOOGLE_CLIENT_EMAIL')}"
            },
            scopes=SCOPES
        )
        return build('sheets', 'v4', credentials=credentials)
    except Exception as e:
        logger.error(f"Error creating Google Sheets service: {str(e)}")
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
        
        # Prepare the order data
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
        if service:
            sheet = service.spreadsheets()
            result = sheet.values().append(
                spreadsheetId=SPREADSHEET_ID,
                range=RANGE_NAME,
                valueInputOption='RAW',
                insertDataOption='INSERT_ROWS',
                body={'values': order_data}
            ).execute()
            
            return jsonify({'success': True, 'message': 'Order submitted successfully!'})
        else:
            return jsonify({'success': False, 'message': 'Could not connect to order system'}), 500

    except Exception as e:
        logger.error(f"Error submitting order: {e}")
        return jsonify({'success': False, 'message': 'An error occurred while submitting your order'}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)