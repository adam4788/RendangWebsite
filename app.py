import os
import logging
from flask import Flask, render_template, request, jsonify
from google.oauth2.credentials import Credentials
from google.oauth2 import service_account
from googleapiclient.discovery import build
from datetime import datetime
from googleapiclient.errors import HttpError
from flask_wtf import FlaskForm
from wtforms import StringField, TextAreaField
from wtforms.validators import DataRequired, Email, Length, ValidationError

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Add app.config settings at the beginning to ensure CSRF works consistently
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET")
app.config['WTF_CSRF_SECRET_KEY'] = os.environ.get("SESSION_SECRET")
app.config['WTF_CSRF_ENABLED'] = True
app.config['WTF_CSRF_TIME_LIMIT'] = 3600  # 1 hour token expiration

# Form validation
class OrderForm(FlaskForm):
    name = StringField('Name', validators=[DataRequired(), Length(min=2, max=50)])
    email = StringField('Email', validators=[DataRequired(), Email()])
    phone = StringField('Phone', validators=[DataRequired(), Length(min=10, max=15)])
    order_details = TextAreaField('Order Details', validators=[DataRequired()])
    special_instructions = TextAreaField('Special Instructions')

# Google Sheets configuration
SCOPES = ['https://www.googleapis.com/auth/spreadsheets']
SPREADSHEET_ID = os.environ.get('SPREADSHEET_ID')
SHEET_NAME = 'Orders'
HEADERS = [['Timestamp', 'Name', 'Email', 'Phone', 'Order Details', 'Special Instructions']]

def setup_orders_sheet(service):
    try:
        # Try to get sheet metadata first to check if the sheet exists
        spreadsheet = service.spreadsheets().get(spreadsheetId=SPREADSHEET_ID).execute()
        sheet_exists = False
        
        # Check if "Orders" sheet exists in the spreadsheet
        for sheet in spreadsheet.get('sheets', []):
            if sheet.get('properties', {}).get('title') == SHEET_NAME:
                sheet_exists = True
                logger.debug(f"Sheet '{SHEET_NAME}' already exists")
                break
                
        if not sheet_exists:
            # Sheet doesn't exist, create it
            logger.debug(f"Sheet '{SHEET_NAME}' doesn't exist, creating it")
            body = {
                'requests': [{
                    'addSheet': {
                        'properties': {
                            'title': SHEET_NAME
                        }
                    }
                }]
            }
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
        
    except Exception as e:
        logger.error(f"Error setting up sheet: {str(e)}")
        return False

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
    form = OrderForm()  # Create an instance of the form to generate CSRF token
    return render_template('index.html', form=form)

@app.route('/events')
def events():
    return render_template('events.html')

@app.route('/submit_order', methods=['POST'])
def submit_order():
    try:
        form = OrderForm(request.form)
        if not form.validate():
            return jsonify({
                'success': False, 
                'message': 'Invalid form data',
                'errors': {field.name: field.errors for field in form if field.errors}
            }), 400

        order_data = [
            [
                datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                form.name.data,
                form.email.data,
                form.phone.data,
                form.order_details.data,
                form.special_instructions.data or ''
            ]
        ]

        service = get_google_sheets_service()
        if not service:
            logger.error("Failed to create Google Sheets service")
            return jsonify({'success': False, 'message': 'Could not connect to order system'}), 500

        # Ensure the Orders sheet exists and has headers
        if not setup_orders_sheet(service):
            return jsonify({'success': False, 'message': 'Error setting up order system'}), 500

        try:
            logger.debug(f"Attempting to append data to spreadsheet: {SPREADSHEET_ID}")
            sheet = service.spreadsheets()
            result = sheet.values().append(
                spreadsheetId=SPREADSHEET_ID,
                range=f"{SHEET_NAME}!A:F",
                valueInputOption='RAW',
                insertDataOption='INSERT_ROWS',
                body={
                    "majorDimension": "ROWS",
                    "values": order_data
                }
            ).execute()

            logger.debug("Successfully submitted order to Google Sheets")
            return jsonify({'success': True, 'message': 'Order submitted successfully!'})

        except HttpError as e:
            if e.resp.status == 429:  # Rate limit exceeded
                logger.error("Rate limit exceeded for Google Sheets API")
                return jsonify({'success': False, 'message': 'Order system is busy, please try again in a few minutes'}), 429
            raise

    except Exception as e:
        logger.error(f"Error submitting order: {str(e)}")
        logger.error(f"Error type: {type(e).__name__}")
        return jsonify({'success': False, 'message': 'An error occurred while submitting your order'}), 500

@app.route('/lookup')
def lookup():
    return render_template('lookup.html')

@app.route('/search_order', methods=['POST'])
def search_order():
    try:
        data = request.get_json()
        search_type = data.get('search_type')
        search_value = data.get('search_value')

        if not search_type or not search_value:
            return jsonify({'success': False, 'message': 'Please provide search criteria'}), 400

        service = get_google_sheets_service()
        if not service:
            return jsonify({'success': False, 'message': 'Could not connect to order system'}), 500

        # Get all orders from the sheet
        result = service.spreadsheets().values().get(
            spreadsheetId=SPREADSHEET_ID,
            range=f"{SHEET_NAME}!A:F"
        ).execute()

        values = result.get('values', [])
        if len(values) <= 1:  # Only headers or empty sheet
            return jsonify({'success': False, 'message': 'No orders found'}), 404

        # Find matching orders
        headers = values[0]
        matching_orders = []

        # Search in the appropriate column (email or phone)
        search_column = 2 if search_type == 'email' else 3  # email is column C (2), phone is column D (3)

        for row in values[1:]:  # Skip header row
            if len(row) > search_column and row[search_column].lower() == search_value.lower():
                order = {
                    'timestamp': row[0],
                    'name': row[1],
                    'email': row[2],
                    'phone': row[3],
                    'order_details': row[4],
                    'special_instructions': row[5] if len(row) > 5 else ''
                }
                matching_orders.append(order)

        if not matching_orders:
            return jsonify({
                'success': False,
                'message': f'No orders found for this {search_type}'
            }), 404

        return jsonify({
            'success': True,
            'orders': matching_orders
        })

    except Exception as e:
        logger.error(f"Error searching orders: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while searching for your order'
        }), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)